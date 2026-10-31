import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getNextProductCode } from '../../api/productApi';
import ProductUnitsEditor from './ProductUnitsEditor';

// Ürün kodu formda tutulmaz: kategorinin kısa adından backend'de otomatik üretilir
const EMPTY = {
  productName: '',
  barcode: '',
  categoryId: '',
  unitId: '',
  minStockLevel: '',
  vatRate: '',
  lastPurchasePrice: '',
  profitMargin: '',
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
    vatRate: toText(p.vatRate),
    lastPurchasePrice: toText(p.lastPurchasePrice),
    profitMargin: toText(p.profitMargin),
    description: p.description ?? '',
  };
}

// En fazla 2 ondalık basamak (fiyat ve yüzdeler için)
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
// Çarpan: en fazla 3 ondalık (örn. 0,5 Kg)
const THREE_DECIMALS = /^\d+(\.\d{1,3})?$/;

const unitLabel = (code, name) => `${code} - ${name}`;

const adornment = (text, position = 'start') => ({
  [`${position}Adornment`]: <InputAdornment position={position}>{text}</InputAdornment>,
});

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
  const [extraUnits, setExtraUnits] = useState([]); // [{ key, unitId, multiplier, barcode }]
  const [localErrors, setLocalErrors] = useState({});
  const nextKey = useRef(0);

  const newRow = (u = {}) => ({
    key: nextKey.current++,
    unitId: u.unitId ?? '',
    multiplier: toText(u.multiplier),
    barcode: u.barcode ?? '',
  });

  useEffect(() => {
    setForm(product ? fromProduct(product) : EMPTY);
    setExtraUnits((product?.units ?? []).map(newRow));
    setLocalErrors({});
    // newRow yalnızca ref kullanır; ürün değişince satırlar yeniden kurulur
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Aktif birimler + düzenlenen üründe kullanılan ama sonradan pasife alınmış birimler
  const unitOptions = units.map((u) => ({
    id: u.id,
    unitCode: u.unitCode,
    unitName: u.unitName,
    label: unitLabel(u.unitCode, u.unitName),
  }));
  if (product) {
    [{ unitId: product.unitId, unitCode: product.unitCode, unitName: product.unitName }, ...(product.units ?? [])]
      .filter((pu) => !unitOptions.some((o) => o.id === pu.unitId))
      .forEach((pu) =>
        unitOptions.push({
          id: pu.unitId,
          unitCode: pu.unitCode,
          unitName: pu.unitName,
          label: `${unitLabel(pu.unitCode, pu.unitName)} (pasif)`,
          inactive: true,
        })
      );
  }
  const baseUnit = unitOptions.find((o) => o.id === form.unitId) ?? null;

  // Satır değişince o satırlara ait eski hata mesajları temizlenir
  const handleUnitsChange = (rows) => {
    setExtraUnits(rows);
    setLocalErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('units[')))
    );
  };

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

    const vat = toNumber(form.vatRate);
    if (vat === null) next.vatRate = 'KDV oranı boş olamaz';
    else if (vat < 0) next.vatRate = 'KDV oranı negatif olamaz';
    else if (vat > 100) next.vatRate = "KDV oranı 100'den büyük olamaz";
    else if (!TWO_DECIMALS.test(form.vatRate)) next.vatRate = 'En fazla 2 ondalık basamak girilebilir';

    const price = toNumber(form.lastPurchasePrice);
    if (price !== null && price < 0) next.lastPurchasePrice = 'Son alış fiyatı negatif olamaz';
    else if (price !== null && !TWO_DECIMALS.test(form.lastPurchasePrice))
      next.lastPurchasePrice = 'En fazla 2 ondalık basamak girilebilir';

    const margin = toNumber(form.profitMargin);
    if (margin !== null && margin < 0) next.profitMargin = 'Kâr oranı negatif olamaz';
    else if (margin !== null && !TWO_DECIMALS.test(form.profitMargin))
      next.profitMargin = 'En fazla 2 ondalık basamak girilebilir';

    // Ek birimler: backend'deki kurallarla aynı
    const productBarcode = form.barcode.trim();
    const seenBarcodes = new Set(productBarcode ? [productBarcode] : []);
    extraUnits.forEach((row, i) => {
      const key = (name) => `units[${i}].${name}`;
      if (!row.unitId) next[key('unitId')] = 'Birim seçilmelidir';
      else if (row.unitId === form.unitId) next[key('unitId')] = 'Temel birimle aynı olamaz';

      const m = toNumber(row.multiplier);
      if (m === null) next[key('multiplier')] = 'Çarpan boş olamaz';
      else if (!(m > 0)) next[key('multiplier')] = "Çarpan 0'dan büyük olmalıdır";
      else if (m === 1) next[key('multiplier')] = 'Çarpan 1 olamaz';
      else if (!THREE_DECIMALS.test(row.multiplier)) next[key('multiplier')] = 'En fazla 3 ondalık basamak girilebilir';

      const bc = row.barcode.trim();
      if (bc && seenBarcodes.has(bc)) next[key('barcode')] = 'Bu barkod bu üründe zaten kullanılıyor';
      else if (bc) seenBarcodes.add(bc);
    });

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
      vatRate: toNumber(form.vatRate),
      lastPurchasePrice: toNumber(form.lastPurchasePrice),
      profitMargin: toNumber(form.profitMargin),
      units: extraUnits.map((r) => ({
        unitId: Number(r.unitId),
        multiplier: toNumber(r.multiplier),
        barcode: r.barcode.trim() || null,
      })),
    });
    if (ok && !product) {
      setForm(EMPTY);
      setExtraUnits([]);
    }
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
        <TextField {...field('unitId')} select label="Temel Birim" required fullWidth>
          {unitOptions.length === 0 && (
            <MenuItem value="" disabled>
              Aktif birim yok
            </MenuItem>
          )}
          {unitOptions
            .filter((o) => !o.inactive || o.id === product?.unitId)
            .map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.label}
              </MenuItem>
            ))}
        </TextField>

        <TextField {...field('vatRate')} label="KDV Oranı" type="number" required fullWidth
          slotProps={{
            htmlInput: { step: '0.01', min: 0, max: 100, inputMode: 'decimal' },
            input: adornment('%'),
          }} />
        <TextField {...field('lastPurchasePrice')} label="Son Alış Fiyatı" type="number" fullWidth
          helperText={errors.lastPurchasePrice || 'KDV hariç'}
          slotProps={{
            htmlInput: { step: '0.01', min: 0, inputMode: 'decimal' },
            input: adornment('₺', 'end'),
          }} />
        <TextField {...field('profitMargin')} label="Kâr Oranı" type="number" fullWidth
          slotProps={{
            htmlInput: { step: '0.01', min: 0, inputMode: 'decimal' },
            input: adornment('%'),
          }} />

        <TextField {...field('minStockLevel')} label="Minimum Stok" type="number" fullWidth
          slotProps={{ htmlInput: { step: '0.001', min: 0, inputMode: 'decimal' } }} />
        <TextField {...field('description')} label="Açıklama" fullWidth
          slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Box>

      <ProductUnitsEditor
        rows={extraUnits}
        onChange={handleUnitsChange}
        onAdd={() => handleUnitsChange([...extraUnits, newRow()])}
        baseUnit={baseUnit}
        unitOptions={unitOptions.filter((o) => !o.inactive || extraUnits.some((r) => r.unitId === o.id))}
        errors={errors}
        saving={saving}
        baseUnitChanged={Boolean(product) && form.unitId !== product.unitId}
      />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
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
    </Paper>
  );
}

export default ProductForm;
