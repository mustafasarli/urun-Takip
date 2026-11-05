import { Fragment, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ConfirmDialog from '../common/ConfirmDialog';
import { calcLine, calcTotals, formatMoney, formatQty, formatRate, round, todayIso } from '../purchase/purchaseCalc';

// Satır girişlerinin erişilebilir adı sütun başlığından gelir (her hücreye ayrı etiket yazılmaz)
const COL = {
  product: 'il-col-product',
  unit: 'il-col-unit',
  quantity: 'il-col-quantity',
  unitPrice: 'il-col-price',
  discountRate: 'il-col-discount',
};
const labelledBy = (id) => ({ 'aria-labelledby': id });

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

const QTY = /^\d+(\.\d{1,3})?$/;
const PRICE = /^\d+(\.\d{1,4})?$/;
const RATE = /^\d+(\.\d{1,2})?$/;

const lower = (s) => (s ?? '').toLocaleLowerCase('tr');
// "3.000" -> "3": backend'den gelen sayılar formda sade görünsün
const toText = (v) => (v === null || v === undefined ? '' : String(Number(v)));

// Ürün arama: kod/ad içerir; ürün veya ek birim (koli) barkodu baştan eşleşir
function filterProducts(options, { inputValue }) {
  const raw = inputValue.trim();
  const q = lower(raw);
  const matches = !q
    ? options
    : options.filter(
        (p) =>
          lower(p.productCode).includes(q) ||
          lower(p.productName).includes(q) ||
          (p.barcode && p.barcode.startsWith(raw)) ||
          (p.units ?? []).some((u) => u.barcode && u.barcode.startsWith(raw))
      );
  return matches.slice(0, 50);
}

const productLabel = (p) => `${p.productCode} - ${p.productName}${p.inactive ? ' (pasif)' : ''}`;

// Temel birim (çarpan 1) + ürünün ek birimleri
function unitOptionsOf(product) {
  if (!product) return [];
  const base = product.unitId != null ? [{ id: product.unitId, label: product.unitCode, multiplier: 1 }] : [];
  return [
    ...base,
    ...(product.units ?? []).map((u) => ({
      id: u.unitId,
      label: `${u.unitCode} ×${formatQty(u.multiplier)}`,
      multiplier: Number(u.multiplier),
    })),
  ];
}

const multiplierOf = (product, unitId) => unitOptionsOf(product).find((o) => o.id === unitId)?.multiplier ?? 1;

// Önerilen satış fiyatı: son alış fiyatı (temel birim) × (1 + kâr oranı) × seçilen birimin çarpanı.
// Kâr oranı tanımsızsa alış fiyatı önerilir; son alış fiyatı yoksa boş gelir.
const suggestPrice = (product, multiplier) => {
  if (product?.lastPurchasePrice === null || product?.lastPurchasePrice === undefined) return '';
  const margin = Number(product.profitMargin ?? 0);
  return String(round(Number(product.lastPurchasePrice) * (1 + margin / 100) * multiplier, 2));
};

// Pasife alınmış ürün aktif ürün listesinde yoktur; satırdaki bilgiden seçenek kurulur
function fallbackProduct(line) {
  const isBase = Number(line.multiplier) === 1;
  return {
    id: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unitId: isBase ? line.unitId : null,
    unitCode: line.baseUnitCode,
    unitName: line.baseUnitCode,
    vatRate: line.vatRate,
    lastPurchasePrice: null,
    units: isBase ? [] : [{ unitId: line.unitId, unitCode: line.unitCode, multiplier: line.multiplier }],
    inactive: true,
  };
}

function snapshot(header, rows) {
  return JSON.stringify({
    header,
    rows: rows.filter((r) => r.product).map((r) => [r.product.id, r.unitId, r.quantity, r.unitPrice, r.discountRate]),
  });
}

/**
 * Çıkış fişi girişi. `issue` verilirse (detay: satırlarla) düzenleme modundadır.
 * `stocks`: ürün id -> anlık stok (temel birimde). Çıkış miktarı kullanılabilir stoğu aşamaz.
 */
function IssueForm({ issue, products, customers, stocks = {}, onSave, onBack, saving, fieldErrors = {} }) {
  const locked = Boolean(issue?.locked);
  const nextKey = useRef(0);
  const typed = useRef(new Map()); // satır anahtarı -> ürün kutusuna yazılan son metin (barkod tespiti için)

  const emptyRow = () => ({
    key: nextKey.current++,
    product: null,
    unitId: '',
    quantity: '',
    unitPrice: '',
    discountRate: '',
    priceAuto: false,
  });

  // Doldurulan son satırın altında her zaman bir boş satır bulunur
  const withTrailing = (rows) =>
    locked || (rows.length > 0 && !rows[rows.length - 1].product) ? rows : [...rows, emptyRow()];

  const [initial] = useState(() => {
    const header = issue
      ? {
          documentDate: issue.documentDate,
          customerName: issue.customerName ?? '',
          invoiceNo: issue.invoiceNo ?? '',
          description: issue.description ?? '',
        }
      : { documentDate: todayIso(), customerName: '', invoiceNo: '', description: '' };
    const rows = (issue?.lines ?? []).map((l) => ({
      key: nextKey.current++,
      product: products.find((p) => p.id === l.productId) ?? fallbackProduct(l),
      unitId: l.unitId,
      quantity: toText(l.quantity),
      unitPrice: toText(l.unitPrice),
      discountRate: Number(l.discountRate) ? toText(l.discountRate) : '',
      priceAuto: false,
    }));
    return { header, rows: withTrailing(rows) };
  });

  const [header, setHeader] = useState(initial.header);
  const [rows, setRows] = useState(initial.rows);
  const [localErrors, setLocalErrors] = useState({});
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [initialSnapshot] = useState(() => snapshot(initial.header, initial.rows));
  const dirty = snapshot(header, rows) !== initialSnapshot;

  const filled = rows.filter((r) => r.product);

  // Kullanılabilir stok = anlık stok + (düzenlemede) bu fişin kendi çıkışı; kayıtta önce o geri eklenir
  const [ownIssued] = useState(() => {
    const own = {};
    (issue?.lines ?? []).forEach((l) => {
      own[l.productId] = round((own[l.productId] ?? 0) + Number(l.baseQuantity), 3);
    });
    return own;
  });
  const available = (productId) => round(Number(stocks[productId] ?? 0) + (ownIssued[productId] ?? 0), 3);
  // Aynı ürün birden fazla satırda olabilir: temel birimdeki toplam istenen miktar
  const requested = (productId) =>
    round(
      filled
        .filter((r) => r.product.id === productId)
        .reduce((sum, r) => sum + (Number(r.quantity) || 0) * multiplierOf(r.product, r.unitId), 0),
      3
    );
  const stockText = (p) => `Stok: ${formatQty(available(p.id))} ${p.unitCode}`;

  // Yerel hatalar satır anahtarıyla, backend hataları dolu satır sırasıyla (lines[0].quantity) gelir
  const rowError = (row, field) => {
    const local = localErrors[`${row.key}.${field}`];
    if (local) return local;
    const index = filled.indexOf(row);
    return index >= 0 ? fieldErrors[`lines[${index}].${field}`] : undefined;
  };
  const headerError = (field) => localErrors[field] ?? fieldErrors[field];

  const clearErrors = (prefix) =>
    setLocalErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix))));

  const updateRow = (key, changes) => {
    setRows((prev) => withTrailing(prev.map((r) => (r.key === key ? { ...r, ...changes } : r))));
    clearErrors(`${key}.`);
    clearErrors('lines');
  };

  const selectProduct = (row, product) => {
    if (!product) {
      updateRow(row.key, { product: null, unitId: '', quantity: '', unitPrice: '', discountRate: '', priceAuto: false });
      return;
    }
    // Ek birimin barkodu okutulduysa o birim (örn. Koli) seçilir; değilse temel birim
    const code = (typed.current.get(row.key) ?? '').trim();
    const byBarcode = (product.units ?? []).find((u) => u.barcode && u.barcode === code);
    const unitId = byBarcode ? byBarcode.unitId : product.unitId ?? unitOptionsOf(product)[0]?.id ?? '';
    const price = suggestPrice(product, multiplierOf(product, unitId));
    updateRow(row.key, {
      product,
      unitId,
      quantity: row.quantity || '1',
      unitPrice: price,
      priceAuto: price !== '',
    });
  };

  const changeUnit = (row, unitId) => {
    const changes = { unitId };
    // Fiyat öneriden geldiyse yeni birimin çarpanıyla yeniden önerilir; elle girildiyse dokunulmaz
    if (row.priceAuto) changes.unitPrice = suggestPrice(row.product, multiplierOf(row.product, unitId));
    updateRow(row.key, changes);
  };

  const removeRow = (key) => {
    setRows((prev) => withTrailing(prev.filter((r) => r.key !== key)));
    clearErrors(`${key}.`);
  };

  const changeHeader = (name, value) => {
    setHeader((prev) => ({ ...prev, [name]: value }));
    clearErrors(name);
  };

  // Backend ile aynı kurallar; sunucuya gitmeden hızlı geri bildirim için
  const validate = () => {
    const next = {};
    if (!header.documentDate) next.documentDate = 'Belge tarihi boş olamaz';
    else if (header.documentDate > todayIso()) next.documentDate = 'Belge tarihi ileri bir tarih olamaz';

    if (filled.length === 0) next.lines = 'En az bir satır girilmelidir';
    filled.forEach((r) => {
      const err = (field, msg) => {
        next[`${r.key}.${field}`] = msg;
      };
      if (r.product.vatRate === null || r.product.vatRate === undefined)
        err('productId', 'Ürün kartında KDV oranı tanımlı değil');
      if (r.unitId === '' || r.unitId === null) err('unitId', 'Birim seçilmelidir');

      if (r.quantity === '') err('quantity', 'Miktar boş olamaz');
      else if (!(Number(r.quantity) > 0)) err('quantity', "Miktar 0'dan büyük olmalıdır");
      else if (!QTY.test(r.quantity)) err('quantity', 'En fazla 3 ondalık');

      if (r.unitPrice === '') err('unitPrice', 'Fiyat boş olamaz');
      else if (Number(r.unitPrice) < 0) err('unitPrice', 'Fiyat negatif olamaz');
      else if (!PRICE.test(r.unitPrice)) err('unitPrice', 'En fazla 4 ondalık');

      if (r.discountRate !== '') {
        const d = Number(r.discountRate);
        if (d < 0 || d > 100) err('discountRate', '0-100 arası');
        else if (!RATE.test(r.discountRate)) err('discountRate', 'En fazla 2 ondalık');
      }

      // Stok kontrolü (backend de reddeder; burada kaydetmeden önce uyarılır)
      if (!next[`${r.key}.quantity`] && requested(r.product.id) > available(r.product.id))
        err('quantity', `Yetersiz stok (${stockText(r.product)})`);
    });
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({
      documentDate: header.documentDate,
      customerName: header.customerName.trim() || null,
      invoiceNo: header.invoiceNo.trim() || null,
      description: header.description.trim() || null,
      lines: filled.map((r) => ({
        productId: r.product.id,
        unitId: Number(r.unitId),
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        discountRate: r.discountRate === '' ? null : Number(r.discountRate),
      })),
    });
  };

  const handleBack = () => (dirty ? setConfirmLeave(true) : onBack());

  const totals = useMemo(
    () => calcTotals(filled.map((r) => ({ ...r, vatRate: r.product.vatRate }))),
    // filled her render'da yeniden oluşur; satırlar değişince hesaplanması yeterli
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const lineDisabled = saving || locked;
  const numberInput = (row, field, colId, props = {}) => (
    <TextField
      type="number"
      value={row[field]}
      onChange={(e) => updateRow(row.key, { [field]: e.target.value, ...(field === 'unitPrice' ? { priceAuto: false } : {}) })}
      error={Boolean(rowError(row, field))}
      helperText={rowError(row, field)}
      disabled={lineDisabled || !row.product}
      fullWidth
      slotProps={{ htmlInput: { ...labelledBy(colId), min: 0, inputMode: 'decimal', ...props } }}
    />
  );

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          {issue ? `Çıkış Fişi ${issue.documentNo}` : 'Yeni Çıkış'}
        </Typography>
        <Button startIcon={<ArrowBackOutlined />} onClick={handleBack} disabled={saving}>
          Listeye dön
        </Button>
      </Box>

      {locked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {issue.lockReason} Alıcı, fatura no ve açıklama düzeltilebilir.
        </Alert>
      )}

      {/* Başlık: 4 eşit sütun; açıklama tam satır */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
          mb: 2,
        }}
      >
        <TextField
          id="documentNo"
          label="Belge No"
          value={issue?.documentNo ?? ''}
          placeholder="Otomatik"
          helperText={issue ? 'Değiştirilemez' : 'Kaydedince atanır'}
          fullWidth
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
        />
        <TextField
          id="documentDate"
          label="Tarih"
          type="date"
          required
          value={header.documentDate}
          onChange={(e) => changeHeader('documentDate', e.target.value)}
          error={Boolean(headerError('documentDate'))}
          helperText={headerError('documentDate')}
          disabled={saving || locked}
          fullWidth
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
        />
        <Autocomplete
          freeSolo
          options={customers}
          inputValue={header.customerName}
          onInputChange={(_, value) => changeHeader('customerName', value)}
          disabled={saving}
          renderInput={(params) => (
            <TextField
              {...params}
              id="customerName"
              label="Alıcı"
              error={Boolean(headerError('customerName'))}
              helperText={headerError('customerName')}
              slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, maxLength: 150 } }}
            />
          )}
        />
        <TextField
          id="invoiceNo"
          label="Fatura No"
          value={header.invoiceNo}
          onChange={(e) => changeHeader('invoiceNo', e.target.value)}
          error={Boolean(headerError('invoiceNo'))}
          helperText={headerError('invoiceNo')}
          disabled={saving}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
        <TextField
          id="description"
          label="Açıklama"
          value={header.description}
          onChange={(e) => changeHeader('description', e.target.value)}
          error={Boolean(headerError('description'))}
          helperText={headerError('description')}
          disabled={saving}
          fullWidth
          sx={{ gridColumn: '1 / -1' }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </Box>

      {headerError('lines') && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {headerError('lines')}
        </Alert>
      )}

      {/* Satırlar: sütun çok olduğu için dar ekranda tablo yatay kayar */}
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Table aria-label="Fiş satırları" sx={{ '& td': { verticalAlign: 'top', py: 0.75 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headSx, width: 32 }}>#</TableCell>
              <TableCell sx={{ ...headSx, minWidth: 260 }} id={COL.product}>
                Ürün
              </TableCell>
              <TableCell sx={{ ...headSx, minWidth: 120 }} id={COL.unit}>
                Birim
              </TableCell>
              <TableCell sx={{ ...headSx, minWidth: 90 }} id={COL.quantity}>
                Miktar
              </TableCell>
              <TableCell sx={{ ...headSx, minWidth: 110 }} id={COL.unitPrice}>
                Birim Fiyat ₺
              </TableCell>
              <TableCell sx={{ ...headSx, minWidth: 80 }} id={COL.discountRate}>
                İsk. %
              </TableCell>
              <TableCell sx={headSx} align="right">
                KDV
              </TableCell>
              <TableCell sx={headSx} align="right">
                Satış Tutarı
              </TableCell>
              <TableCell sx={headSx} align="right">
                Toplam
              </TableCell>
              <TableCell sx={{ ...headSx, width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => {
              const p = row.product;
              const unitOptions = unitOptionsOf(p);
              const multiplier = multiplierOf(p, row.unitId);
              const amounts = p ? calcLine({ ...row, vatRate: p.vatRate }) : null;
              const showBase = p && multiplier !== 1 && Number(row.quantity) > 0;
              // Temel birim (adet) başı satış fiyatı: iskonto sonrası, KDV hariç (net tutar / temel miktar)
              const baseQty = p ? round(Number(row.quantity) * multiplier, 3) : 0;
              const unitCost = amounts && baseQty > 0 && row.unitPrice !== '' ? round(amounts.netAmount / baseQty) : null;
              const cellText = { fontSize: 13, pt: 1.25 };

              return (
                <TableRow key={row.key} data-testid="issue-line">
                  <TableCell sx={{ ...cellText, color: 'text.secondary' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Autocomplete
                      options={products}
                      value={p}
                      onChange={(_, product) => selectProduct(row, product)}
                      onInputChange={(_, value, reason) => {
                        if (reason === 'input') typed.current.set(row.key, value);
                      }}
                      filterOptions={filterProducts}
                      getOptionLabel={productLabel}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      autoHighlight
                      disabled={lineDisabled}
                      noOptionsText="Ürün bulunamadı"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Kod, ad veya barkod"
                          error={Boolean(rowError(row, 'productId'))}
                          helperText={rowError(row, 'productId') || (p ? stockText(p) : undefined)}
                          slotProps={{
                            ...params.slotProps,
                            htmlInput: { ...params.slotProps.htmlInput, ...labelledBy(COL.product) },
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={p ? row.unitId : ''}
                      onChange={(e) => changeUnit(row, e.target.value)}
                      error={Boolean(rowError(row, 'unitId'))}
                      helperText={
                        rowError(row, 'unitId') ||
                        (showBase ? `= ${formatQty(round(Number(row.quantity) * multiplier, 3))} ${p.unitCode}` : '')
                      }
                      disabled={lineDisabled || !p}
                      fullWidth
                      slotProps={{ select: { SelectDisplayProps: labelledBy(COL.unit) } }}
                    >
                      {unitOptions.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>{numberInput(row, 'quantity', COL.quantity, { step: '0.001' })}</TableCell>
                  <TableCell>{numberInput(row, 'unitPrice', COL.unitPrice, { step: '0.01' })}</TableCell>
                  <TableCell>{numberInput(row, 'discountRate', COL.discountRate, { step: '0.01', max: 100 })}</TableCell>
                  <TableCell align="right" sx={{ ...cellText, whiteSpace: 'nowrap' }}>
                    {p ? formatRate(p.vatRate) : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cellText, whiteSpace: 'nowrap' }}>
                    {amounts ? formatMoney(amounts.netAmount) : ''}
                    {unitCost !== null && (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                        {p.unitName} başı {formatMoney(unitCost)} ₺
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cellText, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {amounts ? formatMoney(amounts.totalAmount) : ''}
                  </TableCell>
                  <TableCell>
                    {!locked && p && (
                      <Tooltip title="Satırı sil">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Satırı sil"
                            onClick={() => removeRow(row.key)}
                            disabled={saving}
                          >
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Solda satır ekle; sağda toplamlar ve kayıt butonları */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mt: 1.5 }}>
        <Box>
          {!locked && (
            <Button
              startIcon={<AddOutlined />}
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              disabled={saving}
            >
              Satır Ekle
            </Button>
          )}
        </Box>

        <Box sx={{ width: { xs: '100%', sm: 300 } }}>
          <Box
            component="dl"
            aria-label="Fiş toplamları"
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              rowGap: 0.5,
              columnGap: 2,
              m: 0,
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              '& dt:not(.grand)': { color: 'text.secondary' },
              '& dd': { m: 0, textAlign: 'right' },
            }}
          >
            <dt>Ara Toplam</dt>
            <dd>{formatMoney(totals.subtotal)} ₺</dd>
            <dt>İskonto</dt>
            <dd>{totals.discount ? `−${formatMoney(totals.discount)}` : formatMoney(0)} ₺</dd>
            <dt>Net Toplam</dt>
            <dd>{formatMoney(totals.net)} ₺</dd>
            {totals.vatByRate.map((v) => (
              <Fragment key={v.rate}>
                <dt>KDV {formatRate(v.rate)}</dt>
                <dd>{formatMoney(v.amount)} ₺</dd>
              </Fragment>
            ))}
            <Box component="dt" className="grand" sx={{ fontWeight: 700, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
              Genel Toplam
            </Box>
            <Box component="dd" sx={{ fontWeight: 700, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
              {formatMoney(totals.grand)} ₺
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
            <Button variant="outlined" color="inherit" onClick={handleBack} disabled={saving}>
              Vazgeç
            </Button>
          </Box>
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmLeave}
        title="Kaydedilmemiş değişiklikler"
        message="Fişte kaydedilmemiş değişiklikler var. Kaydetmeden listeye dönülsün mü?"
        confirmText="Evet, çık"
        danger
        onConfirm={() => {
          setConfirmLeave(false);
          onBack();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </Paper>
  );
}

export default IssueForm;
