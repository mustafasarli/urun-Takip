import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createUnit, deleteUnit, getUnits, updateUnit } from '../../api/unitApi';
import ConfirmDialog from '../common/ConfirmDialog';
import UnitForm from './UnitForm';
import UnitList from './UnitList';

function UnitPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // onay bekleyen birim
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      setUnits(await getUnits());
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Kayıt başarılıysa true döner; form bununla kendini temizler
  const handleSubmit = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const res = editing ? await updateUnit(editing.id, data) : await createUnit(data);
      setMessage({ type: 'success', text: res?.message || 'İşlem başarılı' });
      setEditing(null);
      await loadUnits();
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
    loadUnits();
  };

  const handleEdit = (unit) => {
    setEditing(unit);
    setFieldErrors({});
    setMessage(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setFieldErrors({});
  };

  // "Sil"e basınca yalnızca onay penceresi açılır; silme pencereden onaylanınca yapılır
  const handleDelete = (unit) => {
    setMessage(null);
    setPendingDelete(unit);
  };

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  const handleConfirmDelete = async () => {
    const unit = pendingDelete;
    setDeletingId(unit.id);
    try {
      const res = await deleteUnit(unit.id);
      setMessage({ type: 'success', text: res?.message || 'Birim silindi' });
      if (editing?.id === unit.id) setEditing(null);
      await loadUnits();
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
        Birim Tanımları
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <UnitForm
          unit={editing}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onRefresh={handleRefresh}
          saving={saving}
          refreshing={loading}
          fieldErrors={fieldErrors}
        />
        <UnitList
          units={units}
          loading={loading}
          editingId={editing?.id}
          deletingId={deletingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Stack>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Birim Sil"
        message={
          pendingDelete &&
          `"${pendingDelete.unitCode} - ${pendingDelete.unitName}" birimini silmek istediğinize emin misiniz?`
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

export default UnitPage;
