import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const EMPTY = { name: '', description: '' };

// Ekleme ve güncelleme için ortak form. `category` verilirse düzenleme modundadır.
function CategoryForm({ category, onSubmit, onCancel, onRefresh, saving, refreshing, fieldErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    setForm(category ? { name: category.name ?? '', description: category.description ?? '' } : EMPTY);
    setLocalErrors({});
  }, [category]);

  const errors = { ...fieldErrors, ...localErrors };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Backend ile aynı kurallar; sunucuya gitmeden hızlı geri bildirim için
  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Kategori adı boş olamaz';
    else if (form.name.length > 100) next.name = 'Kategori adı en fazla 100 karakter olabilir';
    if (form.description.length > 500) next.description = 'Açıklama en fazla 500 karakter olabilir';
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit({ name: form.name.trim(), description: form.description.trim() || null });
    if (ok && !category) setForm(EMPTY);
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {category ? 'Kategori Güncelle' : 'Yeni Kategori'}
      </Typography>

      {/* Alanlar ve butonlar aynı satırda; dar ekranda alt alta */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          id="name"
          name="name"
          label="Kategori Adı"
          required
          value={form.name}
          onChange={handleChange}
          error={Boolean(errors.name)}
          helperText={errors.name}
          disabled={saving}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          id="description"
          name="description"
          label="Açıklama"
          value={form.description}
          onChange={handleChange}
          error={Boolean(errors.description)}
          helperText={errors.description}
          disabled={saving}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />

        {/* TextField (small) ile aynı yükseklikte: 40px */}
        <Box sx={{ display: 'flex', gap: 1, height: 40, alignItems: 'center' }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor…' : category ? 'Güncelle' : 'Ekle'}
          </Button>
          {category && (
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

export default CategoryForm;
