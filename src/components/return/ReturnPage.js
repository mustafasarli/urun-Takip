import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { createReturn, deleteReturn, getReturn, getReturns, updateReturn } from '../../api/stockReturnApi';
import ConfirmDialog from '../common/ConfirmDialog';
import { firstOfMonthIso, todayIso } from '../purchase/purchaseCalc';
import ReturnForm from './ReturnForm';
import ReturnList from './ReturnList';
import { RETURN_TYPES } from './returnTypes';

const FILTER_DELAY_MS = 300;

/**
 * Alış İade / Satış İade ekranı (tür `config` ile). Liste ve fiş aynı sayfada.
 * `params.openId` verilirse (örn. stok hareketlerinden belge no tıklanınca) o iade doğrudan açılır.
 */
function ReturnPage({ config, params }) {
  const [filters, setFilters] = useState(() => ({ from: firstOfMonthIso(), to: todayIso(), party: '' }));
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // null: liste; { ret: null }: yeni iade; { ret: detay }: düzenleme
  const [editor, setEditor] = useState(null);
  const [opening, setOpening] = useState(false);
  const [sources, setSources] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);

  const loadReturns = useCallback(
    async (f) => {
      setLoading(true);
      try {
        setReturns(await getReturns(config.type, f));
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    },
    [config.type]
  );

  useEffect(() => {
    const timer = setTimeout(() => loadReturns(filters), FILTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters, loadReturns]);

  // İade açılırken kaynak fiş seçenekleri (tüm aktif alış / çıkış fişleri) yüklenir
  const openEditor = async (returnId) => {
    setMessage(null);
    setFieldErrors({});
    setOpening(true);
    try {
      const [detail, docs] = await Promise.all([
        returnId ? getReturn(returnId) : Promise.resolve(null),
        config.loadSources(),
      ]);
      setSources(docs);
      setEditor({ ret: detail });
      return detail;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      return null;
    } finally {
      setOpening(false);
    }
  };

  const openId = params?.openId;
  useEffect(() => {
    if (!openId) return;
    openEditor(openId).then((detail) => {
      if (detail?.documentDate)
        setFilters((f) => (detail.documentDate < f.from ? { ...f, from: detail.documentDate } : f));
    });
    // Yalnızca ekran açılışında
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
      const id = editor.ret?.id;
      const res = id ? await updateReturn(id, data) : await createReturn(data);
      setMessage({ type: 'success', text: res?.message || 'İade fişi kaydedildi' });
      closeEditor();
      await loadReturns(filters);
    } catch (err) {
      // Örn. iade edilebilir miktar aşıldı veya alış iadesinde stok yetersiz
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const ret = pendingDelete;
    setDeletingId(ret.id);
    try {
      const res = await deleteReturn(ret.id);
      setMessage({ type: 'success', text: res?.message || 'İade fişi silindi' });
      await loadReturns(filters);
    } catch (err) {
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
        {config.pageTitle}
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
        <ReturnForm
          key={editor.ret?.id ?? 'new'}
          config={config}
          ret={editor.ret}
          sources={sources}
          onSave={handleSave}
          onBack={closeEditor}
          saving={saving}
          fieldErrors={fieldErrors}
        />
      ) : (
        <ReturnList
          config={config}
          returns={returns}
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          onNew={() => openEditor(null)}
          onRefresh={() => {
            setMessage(null);
            loadReturns(filters);
          }}
          onEdit={(r) => openEditor(r.id)}
          onDelete={(r) => {
            setMessage(null);
            setPendingDelete(r);
          }}
          deletingId={deletingId}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="İade Fişi Sil"
        message={
          pendingDelete &&
          `"${pendingDelete.documentNo}" iade fişi pasife alınacak ve stok hareketleri geri alınacak. Emin misiniz?`
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

export function PurchaseReturnPage(props) {
  return <ReturnPage config={RETURN_TYPES.PURCHASE_RETURN} {...props} />;
}

export function SalesReturnPage(props) {
  return <ReturnPage config={RETURN_TYPES.SALES_RETURN} {...props} />;
}

export default ReturnPage;
