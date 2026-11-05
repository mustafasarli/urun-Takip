import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { getProducts } from '../../api/productApi';
import {
  createIssue,
  deleteIssue,
  getIssue,
  getIssues,
  getCustomerNames,
  updateIssue,
} from '../../api/stockIssueApi';
import { getStocks } from '../../api/stockApi';
import ConfirmDialog from '../common/ConfirmDialog';
import { firstOfMonthIso, todayIso } from '../purchase/purchaseCalc';
import IssueForm from './IssueForm';
import IssueList from './IssueList';

// Filtre değişince her tuşta istek atılmasın
const FILTER_DELAY_MS = 300;

/**
 * Çıkış Fişi: liste ve fiş aynı sayfada; "Yeni Çıkış"/"Düzenle" fiş görünümüne geçer.
 * Fiş kaydedilince stoktan düşülür (backend; stok yetersizse reddedilir), sonra listeye dönülür.
 * `params.openId` verilirse (örn. stok hareketlerinden belge no tıklanınca) o fiş doğrudan açılır.
 */
function IssuePage({ params }) {
  const [filters, setFilters] = useState(() => ({ from: firstOfMonthIso(), to: todayIso(), customer: '' }));
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // null: liste; { issue: null }: yeni fiş; { issue: detay }: düzenleme
  const [editor, setEditor] = useState(null);
  const [opening, setOpening] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stocks, setStocks] = useState({}); // ürün id -> anlık stok (temel birimde)
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadIssues = useCallback(async (f) => {
    setLoading(true);
    try {
      setIssues(await getIssues(f));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadIssues(filters), FILTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters, loadIssues]);

  // Fiş açılırken ürünler (birimler, KDV, son alış fiyatı, kâr oranı dahil), anlık stoklar ve
  // alıcı önerileri yüklenir
  const openEditor = async (issueId) => {
    setMessage(null);
    setFieldErrors({});
    setOpening(true);
    try {
      const [detail, prods, names, stockList] = await Promise.all([
        issueId ? getIssue(issueId) : Promise.resolve(null),
        getProducts(),
        getCustomerNames(),
        getStocks(),
      ]);
      setProducts(prods);
      setCustomers(names);
      setStocks(Object.fromEntries(stockList.map((s) => [s.productId, s.quantity])));
      setEditor({ issue: detail });
      return detail;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      return null;
    } finally {
      setOpening(false);
    }
  };

  // Başka ekrandan belge no ile gelindiyse fiş açılır. Fiş bu aydan eskiyse listeye dönünce
  // görünsün diye filtre başlangıcı fiş tarihine çekilir.
  const openId = params?.openId;
  useEffect(() => {
    if (!openId) return;
    openEditor(openId).then((detail) => {
      if (detail?.documentDate)
        setFilters((f) => (detail.documentDate < f.from ? { ...f, from: detail.documentDate } : f));
    });
    // Yalnızca ekran açılışında; openEditor her render'da yeniden oluşur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const closeEditor = () => {
    setEditor(null);
    setFieldErrors({});
  };

  const handleSave = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const id = editor.issue?.id;
      const res = id ? await updateIssue(id, data) : await createIssue(data);
      setMessage({ type: 'success', text: res?.message || 'Çıkış fişi kaydedildi' });
      closeEditor();
      await loadIssues(filters);
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const issue = pendingDelete;
    setDeletingId(issue.id);
    try {
      const res = await deleteIssue(issue.id);
      setMessage({ type: 'success', text: res?.message || 'Çıkış fişi silindi' });
      await loadIssues(filters);
    } catch (err) {
      // Örn. kilitli fiş: ürünlerden çıkış yapılmışsa pasife alınamaz
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  return (
    <Box component="section">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
        Çıkış Fişi
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {opening && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <CircularProgress size={18} />
          <Typography color="text.secondary">Fiş açılıyor…</Typography>
        </Box>
      )}

      {editor ? (
        <IssueForm
          // Farklı fiş açılınca form sıfırdan kurulur
          key={editor.issue?.id ?? 'new'}
          issue={editor.issue}
          products={products}
          customers={customers}
          stocks={stocks}
          onSave={handleSave}
          onBack={closeEditor}
          saving={saving}
          fieldErrors={fieldErrors}
        />
      ) : (
        <IssueList
          issues={issues}
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          onNew={() => openEditor(null)}
          onRefresh={() => {
            setMessage(null);
            loadIssues(filters);
          }}
          onEdit={(p) => openEditor(p.id)}
          onDelete={(p) => {
            setMessage(null);
            setPendingDelete(p);
          }}
          deletingId={deletingId}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Çıkış Fişi Sil"
        message={
          pendingDelete &&
          `"${pendingDelete.documentNo}" fişi pasife alınacak ve ürünler stoğa geri eklenecek. Emin misiniz?`
        }
        confirmText="Evet, Sil"
        danger
        busy={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
}

export default IssuePage;
