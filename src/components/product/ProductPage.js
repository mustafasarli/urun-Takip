import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getCategories } from '../../api/categoryApi';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../../api/productApi';
import { getUnits } from '../../api/unitApi';
import ConfirmDialog from '../common/ConfirmDialog';
import ProductForm from './ProductForm';
import ProductList from './ProductList';

function ProductPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // onay bekleyen ürün
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Formdaki seçim listeleri için aktif kategori ve birimler
  const loadLookups = useCallback(async () => {
    try {
      const [cats, uns] = await Promise.all([getCategories(), getUnits()]);
      setCategories(cats);
      setUnits(uns);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadLookups();
  }, [loadProducts, loadLookups]);

  // Kayıt başarılıysa true döner; form bununla kendini temizler
  const handleSubmit = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const res = editing ? await updateProduct(editing.id, data) : await createProduct(data);
      setMessage({ type: 'success', text: res?.message || 'İşlem başarılı' });
      setEditing(null);
      await loadProducts();
      return true;
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Ürünleri ve seçim listelerini backend'den yeniden çeker
  const handleRefresh = () => {
    setMessage(null);
    loadProducts();
    loadLookups();
  };

  const handleEdit = (product) => {
    setEditing(product);
    setFieldErrors({});
    setMessage(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setFieldErrors({});
  };

  // "Sil"e basınca yalnızca onay penceresi açılır; silme pencereden onaylanınca yapılır
  const handleDelete = (product) => {
    setMessage(null);
    setPendingDelete(product);
  };

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  const handleConfirmDelete = async () => {
    const product = pendingDelete;
    setDeletingId(product.id);
    try {
      const res = await deleteProduct(product.id);
      setMessage({ type: 'success', text: res?.message || 'Ürün silindi' });
      if (editing?.id === product.id) setEditing(null);
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <Box component="section">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
        Ürün Tanımları
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <ProductForm
          product={editing}
          categories={categories}
          units={units}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onRefresh={handleRefresh}
          saving={saving}
          refreshing={loading}
          fieldErrors={fieldErrors}
        />
        <ProductList
          products={products}
          loading={loading}
          editingId={editing?.id}
          deletingId={deletingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Stack>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Ürün Sil"
        message={
          pendingDelete &&
          `"${pendingDelete.productCode} - ${pendingDelete.productName}" ürününü silmek istediğinize emin misiniz?`
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

export default ProductPage;
