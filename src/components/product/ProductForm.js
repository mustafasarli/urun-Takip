import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getNextProductCode } from '../../api/productApi';

// Ürün kodu formda tutulmaz: kategorinin kısa adından backend'de otomatik üretilir
const EMPTY = {
  productName: '',
  barcode: '',
  categoryId: '',
  unitId: '',
  minStockLevel: '',
  description: '',
};

// Sayısal alanlar formda metin olarak tutulur; boşsa null gönderilir
const toNumber = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const toText = (v) => (v === null || v === undefined ? '' : String(v));

function fromProduct(p) {
  return {
    productName: p.productName ?? '',
    barcode: p.barcode ?? '',
    categoryId: p.categoryId ?? '',
    unitId: p.unitId ?? '',
    minStockLevel: toText(p.minStockLevel),
    description: p.description ?? '',
  };
}

// Düzenlenen ürünün kategorisi/birimi sonradan pasife alınmışsa seçim listesinde yine görünsün
function withCurrent(options, id, label) {
  if (!id || options.some((o) => o.id === id)) return options;
  return [...options, { id, label: `${label} (pasif)` }];
}

// Tüm alanlar eşit genişlikte: geniş ekranda 4, orta ekranda 2, telefonda 1 sütun
const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
  gap: 2,
  alignItems: 'start',
};

// Ekleme ve güncelleme için ortak form. `product` verilirse düzenleme modundadır.
function ProductForm({ product, categories, units, onSubmit, onCancel, onRefresh, saving, refreshing, fieldErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    setForm(product ? fromProduct(product) : EMPTY);
    setLocalErrors({});
  }, [product]);

  const errors = { ...fieldErrors, ...localErrors };

  // Yeni üründe kategori seçilince sıradaki kod ön izlemesi; düzenlemede mevcut kod gösterilir
  const [codePreview, setCodePreview] = useState({ code: '', error: null, loading: false });
  useEffect(() => {
    if (product || !form.categoryId) {
      setCodePreview({ code: '', error: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setCodePreview({ code: '', error: null, loading: true });
    getNextProductCode(form.categoryId)
      .then((code) => !cancelled && setCodePreview({ code: code ?? '', error: null, loading: false }))
      .catch((err) => !cancelled && setCodePreview({ code: '', error: err.message, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [product, form.categoryId]);

  let codeHelper = 'Kategori seçince oluşur';
  if (product) codeHelper = 'Ürün kodu değiştirilemez';
  else if (codePreview.loading) codeHelper = 'Hesaplanıyor…';
  else if (codePreview.error) codeHelper = codePreview.error;
  else if (codePreview.code) codeHelper = 'Kaydedince atanır';

  // Kısa adı olmayan kategoride kod üretilemez; yeni üründe seçilemez (düzenlemede kod zaten var)
  const categoryOptions = withCurrent(
    categories.map((c) => ({
      id: c.id,
      label: c.shortName ? `${c.name} (${c.shortName})` : `${c.name} — kısa ad tanımsız`,
      disabled: !c.shortName && !product,
    })),
    product?.categoryId,
    product?.categoryName
  );
  const unitOptions = withCurrent(
    units.map((u) => ({ id: u.id, label: `${u.unitCode} - ${u.unitName}` })),
    product?.unitId,
    product && `${product.unitCode} - ${product.unitName}`
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Backend ile aynı kurallar; sunucuya gitmeden hızlı geri bildirim için
  const validate = () => {
    const next = {};
    if (!form.productName.trim()) next.productName = 'Ürün adı boş olamaz';
    if (!form.categoryId) next.categoryId = 'Kategori seçilmelidir';
    if (!form.unitId) next.unitId = 'Birim seçilmelidir';

    const minStock = toNumber(form.minStockLevel);
    if (minStock !== null && minStock < 0) next.minStockLevel = 'Minimum stok negatif olamaz';

    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit({
      productName: form.productName.trim(),
      barcode: form.barcode.trim() || null,
      description: form.description.trim() || null,
      categoryId: Number(form.categoryId),
      unitId: Number(form.unitId),
      minStockLevel: toNumber(form.minStockLevel),
    });
    if (ok && !product) setForm(EMPTY);
  };

  const field = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: handleChange,
    error: Boolean(errors[name]),
    helperText: errors[name],
    disabled: saving,
  });

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {product ? 'Ürün Güncelle' : 'Yeni Ürün'}
      </Typography>

      {/* Alanlar eşit sütunlara dizilir; butonlar son hücrede */}
      <Box sx={gridSx}>
        <TextField
          id="productCode"
          label="Ürün Kodu"
          value={product ? product.productCode : codePreview.code}
          placeholder="Otomatik"
          helperText={codeHelper}
          error={Boolean(codePreview.error)}
          fullWidth
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
        />
        <TextField {...field('productName')} label="Ürün Adı" required fullWidth
          slotProps={{ htmlInput: { maxLength: 150 } }} />
        <TextField {...field('barcode')} label="Barkod" fullWidth
          slotProps={{ htmlInput: { maxLength: 50 } }} />

        <TextField {...field('categoryId')} select label="Kategori" required fullWidth>
          {categoryOptions.length === 0 && (
            <MenuItem value="" disabled>
              Aktif kategori yok
            </MenuItem>
          )}
          {categoryOptions.map((o) => (
            <MenuItem key={o.id} value={o.id} disabled={o.disabled}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField {...field('unitId')} select label="Birim" required fullWidth>
          {unitOptions.length === 0 && (
            <MenuItem value="" disabled>
              Aktif birim yok
            </MenuItem>
          )}
          {unitOptions.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField {...field('minStockLevel')} label="Minimum Stok" type="number" fullWidth
          slotProps={{ htmlInput: { step: '0.001', min: 0, inputMode: 'decimal' } }} />
        <TextField {...field('description')} label="Açıklama" fullWidth
          slotProps={{ htmlInput: { maxLength: 500 } }} />

        {/* TextField (small) ile aynı yükseklikte: 40px */}
        <Box sx={{ display: 'flex', gap: 1, height: 40, alignItems: 'center' }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor…' : product ? 'Güncelle' : 'Ekle'}
          </Button>
          {product && (
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

export default ProductForm;
