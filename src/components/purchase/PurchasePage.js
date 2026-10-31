import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { getProducts } from '../../api/productApi';
import {
  createPurchase,
  deletePurchase,
  getPurchase,
  getPurchases,
  getSupplierNames,
  updatePurchase,
} from '../../api/purchaseApi';
import ConfirmDialog from '../common/ConfirmDialog';
import { firstOfMonthIso, todayIso } from './purchaseCalc';
import PurchaseForm from './PurchaseForm';
import PurchaseList from './PurchaseList';

// Filtre değişince her tuşta istek atılmasın
const FILTER_DELAY_MS = 300;

/**
 * Alış Girişi: liste ve fiş aynı sayfada; "Yeni Alış"/"Düzenle" fiş görünümüne geçer.
 * Fiş kaydedilince stoğa işlenir (backend), sonra listeye dönülür.
 */
function PurchasePage() {
  const [filters, setFilters] = useState(() => ({ from: firstOfMonthIso(), to: todayIso(), supplier: '' }));
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // null: liste; { purchase: null }: yeni fiş; { purchase: detay }: düzenleme
  const [editor, setEditor] = useState(null);
  const [opening, setOpening] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadPurchases = useCallback(async (f) => {
    setLoading(true);
    try {
      setPurchases(await getPurchases(f));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadPurchases(filters), FILTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters, loadPurchases]);

  // Fiş açılırken ürünler (birimler, KDV, son alış fiyatı dahil) ve tedarikçi önerileri yüklenir
  const openEditor = async (purchaseId) => {
    setMessage(null);
    setFieldErrors({});
    setOpening(true);
    try {
      const [detail, prods, sups] = await Promise.all([
        purchaseId ? getPurchase(purchaseId) : Promise.resolve(null),
        getProducts(),
        getSupplierNames(),
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setEditor({ purchase: detail });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setOpening(false);
    }
  };

  const closeEditor = () => {
    setEditor(null);
    setFieldErrors({});
  };

  const handleSave = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const id = editor.purchase?.id;
      const res = id ? await updatePurchase(id, data) : await createPurchase(data);
      setMessage({ type: 'success', text: res?.message || 'Alış fişi kaydedildi' });
      closeEditor();
      await loadPurchases(filters);
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const purchase = pendingDelete;
    setDeletingId(purchase.id);
    try {
      const res = await deletePurchase(purchase.id);
      setMessage({ type: 'success', text: res?.message || 'Alış fişi silindi' });
      await loadPurchases(filters);
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
        Alış Girişi
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
        <PurchaseForm
          // Farklı fiş açılınca form sıfırdan kurulur
          key={editor.purchase?.id ?? 'new'}
          purchase={editor.purchase}
          products={products}
          suppliers={suppliers}
          onSave={handleSave}
          onBack={closeEditor}
          saving={saving}
          fieldErrors={fieldErrors}
        />
      ) : (
        <PurchaseList
          purchases={purchases}
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          onNew={() => openEditor(null)}
          onRefresh={() => {
            setMessage(null);
            loadPurchases(filters);
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
        title="Alış Fişi Sil"
        message={
          pendingDelete &&
          `"${pendingDelete.documentNo}" fişi pasife alınacak ve stok hareketleri geri alınacak. Emin misiniz?`
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

export default PurchasePage;
