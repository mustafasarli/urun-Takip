import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const DIGITS = [4, 5, 6, 7, 8];
const PREFIX = /^[\p{L}\p{N}]+$/u;

// Kategori kısa adı gibi: boşluk atılır, Türkçe büyük harf (i → İ)
const normalizePrefix = (v) => v.replace(/\s+/g, '').toLocaleUpperCase('tr');

export function counterKey(prefix, yearly, year = new Date().getFullYear()) {
  return yearly ? `${prefix}-${year}` : prefix;
}

export function formatDocumentNo(prefix, yearly, digits, number) {
  return `${counterKey(prefix, yearly)}-${String(number).padStart(digits, '0')}`;
}

/**
 * Bir fiş türünün belge no tanımını düzenler. Değişiklik yalnızca yeni fişlere uygulanır.
 * Sıradaki numara yalnızca ileri alınabilir (son kullanılan numaradan büyük olmalı).
 */
function DocumentSeriesForm({ series, onSubmit, onCancel, saving, fieldErrors = {} }) {
  const [form, setForm] = useState(null);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    setForm({
      prefix: series.prefix,
      yearly: series.yearly,
      digits: series.digits,
      nextNumber: String(series.nextNumber),
    });
    setLocalErrors({});
  }, [series]);

  if (!form) return null;

  const errors = { ...fieldErrors, ...localErrors };
  // Ön ek veya yıl ayarı değişirse farklı bir sayaç kullanılır; o sayacın durumu kayıtta denetlenir
  const keyChanged = form.prefix !== series.prefix || form.yearly !== series.yearly;
  const previewNumber = form.nextNumber === '' ? 1 : Number(form.nextNumber) || 1;
  const prefixOk = form.prefix.length >= 2 && PREFIX.test(form.prefix);
  const example = prefixOk ? formatDocumentNo(form.prefix, form.yearly, form.digits, previewNumber) : '—';

  const change = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.prefix) next.prefix = 'Ön ek boş olamaz';
    else if (form.prefix.length < 2 || form.prefix.length > 5) next.prefix = 'Ön ek 2 ile 5 karakter arasında olmalıdır';
    else if (!PREFIX.test(form.prefix)) next.prefix = 'Ön ek yalnızca harf ve rakam içerebilir';

    if (form.nextNumber !== '') {
      const n = Number(form.nextNumber);
      if (!Number.isInteger(n) || n < 1) next.nextNumber = 'Pozitif bir tam sayı girin';
      else if (!keyChanged && n <= series.lastNumber)
        next.nextNumber = `En az ${series.lastNumber + 1} olmalı (${series.lastUsed} kullanıldı)`;
      else if (String(n).length > form.digits) next.nextNumber = `${form.digits} haneye sığmıyor`;
    } else if (!keyChanged) {
      next.nextNumber = 'Sıradaki numara boş olamaz';
    }
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = { prefix: form.prefix, yearly: form.yearly, digits: form.digits };
    // Sayaca yalnızca numara değiştiyse (veya yeni sayaç için girildiyse) dokunulur
    if (form.nextNumber !== '' && (keyChanged || Number(form.nextNumber) !== series.nextNumber)) {
      data.nextNumber = Number(form.nextNumber);
    }
    onSubmit(data);
  };

  let nextHelper = errors.nextNumber;
  if (!nextHelper) {
    nextHelper = keyChanged
      ? 'Boş bırakılırsa bu ön ekin sayacından devam eder (yeni ön ekte 1)'
      : `En az ${series.lastNumber + 1}; ileri alınabilir`;
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {series.label} — Belge No Tanımı
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <TextField
          id="prefix"
          label="Ön Ek"
          required
          value={form.prefix}
          onChange={(e) => change('prefix', normalizePrefix(e.target.value))}
          error={Boolean(errors.prefix)}
          helperText={errors.prefix || '2-5 harf veya rakam'}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: 5 } }}
        />
        <TextField
          id="digits"
          select
          label="Hane"
          value={form.digits}
          onChange={(e) => change('digits', Number(e.target.value))}
          disabled={saving}
          helperText="Sıra numarasının basamak sayısı"
        >
          {DIGITS.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="nextNumber"
          label="Sıradaki No"
          type="number"
          value={form.nextNumber}
          onChange={(e) => change('nextNumber', e.target.value)}
          error={Boolean(errors.nextNumber)}
          helperText={nextHelper}
          disabled={saving}
          slotProps={{ htmlInput: { min: keyChanged ? 1 : series.lastNumber + 1, step: 1 } }}
        />
        <TextField
          id="example"
          label="Örnek"
          value={example}
          helperText="Bir sonraki fişin numarası"
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', fontWeight: 600 } }}
        />
        <FormControlLabel
          sx={{ gridColumn: '1 / -1', mt: -1 }}
          control={
            <Checkbox size="small" checked={form.yearly} onChange={(e) => change('yearly', e.target.checked)} disabled={saving} />
          }
          label="Numaraya yıl ekle (her yıl 1'den başlar)"
          slotProps={{ typography: { fontSize: 13 } }}
        />
      </Box>

      {keyChanged && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Değişiklik yalnızca yeni fişlere uygulanır; kayıtlı fişler eski numaralarını korur.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Güncelle'}
        </Button>
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={saving}>
          Vazgeç
        </Button>
      </Box>
    </Paper>
  );
}

export default DocumentSeriesForm;
