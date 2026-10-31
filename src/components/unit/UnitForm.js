import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const EMPTY = { unitCode: '', unitName: '' };

// Ekleme ve güncelleme için ortak form. `unit` verilirse düzenleme modundadır.
function UnitForm({ unit, onSubmit, onCancel, onRefresh, saving, refreshing, fieldErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    setForm(unit ? { unitCode: unit.unitCode ?? '', unitName: unit.unitName ?? '' } : EMPTY);
    setLocalErrors({});
  }, [unit]);

  const errors = { ...fieldErrors, ...localErrors };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Backend ile aynı kurallar; sunucuya gitmeden hızlı geri bildirim için
  const validate = () => {
    const next = {};
    if (!form.unitCode.trim()) next.unitCode = 'Birim kodu boş olamaz';
    else if (form.unitCode.length > 10) next.unitCode = 'Birim kodu en fazla 10 karakter olabilir';
    if (!form.unitName.trim()) next.unitName = 'Birim adı boş olamaz';
    else if (form.unitName.length > 50) next.unitName = 'Birim adı en fazla 50 karakter olabilir';
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit({ unitCode: form.unitCode.trim(), unitName: form.unitName.trim() });
    if (ok && !unit) setForm(EMPTY);
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {unit ? 'Birim Güncelle' : 'Yeni Birim'}
      </Typography>

      {/* Alanlar ve butonlar aynı satırda; dar ekranda alt alta */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          id="unitCode"
          name="unitCode"
          label="Birim Kodu"
          required
          value={form.unitCode}
          onChange={handleChange}
          error={Boolean(errors.unitCode)}
          helperText={errors.unitCode}
          disabled={saving}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ htmlInput: { maxLength: 10 } }}
        />
        <TextField
          id="unitName"
          name="unitName"
          label="Birim Adı"
          required
          value={form.unitName}
          onChange={handleChange}
          error={Boolean(errors.unitName)}
          helperText={errors.unitName}
          disabled={saving}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />

        {/* TextField (small) ile aynı yükseklikte: 40px */}
        <Box sx={{ display: 'flex', gap: 1, height: 40, alignItems: 'center' }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor…' : unit ? 'Güncelle' : 'Ekle'}
          </Button>
          {unit && (
            <Button variant="outlined" color="inherit" onClick={onCancel} disabled={saving}>
              Vazgeç
            </Button>
          )}
          <Button variant="outlined" onClick={onRefresh} disabled={saving || refreshing}>
            {refreshing ? 'Yenileniyor…' : 'Yenile'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default UnitForm;
