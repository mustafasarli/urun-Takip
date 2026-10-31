import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../api/categoryApi';
import ConfirmDialog from '../common/ConfirmDialog';
import CategoryForm from './CategoryForm';
import CategoryList from './CategoryList';

function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // onay bekleyen kategori
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Kayıt başarılıysa true döner; form bununla kendini temizler
  const handleSubmit = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const res = editing ? await updateCategory(editing.id, data) : await createCategory(data);
      setMessage({ type: 'success', text: res?.message || 'İşlem başarılı' });
      setEditing(null);
      await loadCategories();
      return true;
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Listeyi backend'den yeniden çeker (başka kullanıcıların eklediği kayıtlar da gelir)
  const handleRefresh = () => {
    setMessage(null);
    loadCategories();
  };

  const handleEdit = (category) => {
    setEditing(category);
    setFieldErrors({});
    setMessage(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setFieldErrors({});
  };

  // "Sil"e basınca yalnızca onay penceresi açılır; silme pencereden onaylanınca yapılır
  const handleDelete = (category) => {
    setMessage(null);
    setPendingDelete(category);
  };

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  const handleConfirmDelete = async () => {
    const category = pendingDelete;
    setDeletingId(category.id);
    try {
      const res = await deleteCategory(category.id);
      setMessage({ type: 'success', text: res?.message || 'Kategori silindi' });
      if (editing?.id === category.id) setEditing(null);
      await loadCategories();
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
        Kategori Tanımları
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <CategoryForm
          category={editing}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onRefresh={handleRefresh}
          saving={saving}
          refreshing={loading}
          fieldErrors={fieldErrors}
        />
        <CategoryList
          categories={categories}
          loading={loading}
          editingId={editing?.id}
          deletingId={deletingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Stack>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Kategori Sil"
        message={pendingDelete && `"${pendingDelete.name}" kategorisini silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        danger
        busy={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
}

export default CategoryPage;
