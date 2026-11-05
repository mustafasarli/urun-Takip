import { Fragment, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import { getReturnSource } from '../../api/stockReturnApi';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  calcLine,
  calcTotals,
  formatDate,
  formatMoney,
  formatQty,
  formatRate,
  round,
  todayIso,
} from '../purchase/purchaseCalc';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };
const QTY = /^\d+(\.\d{1,3})?$/;
const QTY_COL = 'rl-col-quantity';

const toText = (v) => (v === null || v === undefined ? '' : String(Number(v)));
const lower = (s) => (s ?? '').toLocaleLowerCase('tr');

/**
 * İade fişi girişi. Kaynak fiş (alış / çıkış) seçilince satırları gelir; birim, fiyat, iskonto ve KDV
 * kaynak satırdakiyle aynıdır, yalnızca iade miktarı girilir. Bir satırdan en fazla
 * "kaynak miktar − önceki iadeler" kadar iade edilebilir. Düzenlemede kaynak fiş değiştirilemez.
 */
function ReturnForm({ config, ret, sources, onSave, onBack, saving, fieldErrors = {} }) {
  const [header] = useState(() => ({
    documentDate: ret?.documentDate ?? todayIso(),
    description: ret?.description ?? '',
  }));
  const [documentDate, setDocumentDate] = useState(header.documentDate);
  const [description, setDescription] = useState(header.description);
  const [sourceId, setSourceId] = useState(ret?.sourceDocumentId ?? null);
  const [source, setSource] = useState({ loading: false, error: null, data: null });
  // kaynak satır id -> girilen iade miktarı (metin)
  const [initialQuantities] = useState(() =>
    Object.fromEntries((ret?.lines ?? []).map((l) => [l.sourceLineId, toText(l.quantity)]))
  );
  const [quantities, setQuantities] = useState(initialQuantities);
  const [localErrors, setLocalErrors] = useState({});
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Kaynak fiş satırları ve iade edilebilir miktarlar (düzenlemede bu iadenin kendi miktarı hariç)
  useEffect(() => {
    if (!sourceId) {
      setSource({ loading: false, error: null, data: null });
      return undefined;
    }
    let cancelled = false;
    setSource({ loading: true, error: null, data: null });
    getReturnSource(config.type, sourceId, ret?.id)
      .then((data) => !cancelled && setSource({ loading: false, error: null, data }))
      .catch((err) => !cancelled && setSource({ loading: false, error: err.message, data: null }));
    return () => {
      cancelled = true;
    };
  }, [config.type, sourceId, ret?.id]);

  const lines = source.data?.lines ?? [];
  const entered = lines.filter((l) => Number(quantities[l.sourceLineId]) > 0);

  const dirty =
    documentDate !== header.documentDate ||
    description !== header.description ||
    sourceId !== (ret?.sourceDocumentId ?? null) ||
    JSON.stringify(quantities) !== JSON.stringify(initialQuantities);

  const error = (key) => localErrors[key] ?? fieldErrors[key];

  const selectSource = (doc) => {
    setSourceId(doc?.id ?? null);
    setQuantities({});
    setLocalErrors({});
  };

  const setQuantity = (lineId, value) => {
    setQuantities((prev) => ({ ...prev, [lineId]: value }));
    setLocalErrors((prev) => ({ ...prev, [`q.${lineId}`]: undefined, lines: undefined }));
  };

  // Kalan miktarların hepsini iade et
  const returnAll = () => {
    setQuantities(
      Object.fromEntries(
        lines.filter((l) => Number(l.returnableQuantity) > 0).map((l) => [l.sourceLineId, toText(l.returnableQuantity)])
      )
    );
    setLocalErrors({});
  };

  const validate = () => {
    const next = {};
    if (!sourceId) next.sourceDocumentId = `${config.sourceLabel} seçilmelidir`;
    if (!documentDate) next.documentDate = 'Belge tarihi boş olamaz';
    else if (documentDate > todayIso()) next.documentDate = 'Belge tarihi ileri bir tarih olamaz';
    else if (source.data && documentDate < source.data.documentDate)
      next.documentDate = `Kaynak fiş tarihinden (${formatDate(source.data.documentDate)}) önce olamaz`;

    lines.forEach((l) => {
      const raw = quantities[l.sourceLineId] ?? '';
      if (raw === '' || Number(raw) === 0) return;
      const q = Number(raw);
      if (!(q > 0)) next[`q.${l.sourceLineId}`] = "0'dan büyük olmalı";
      else if (!QTY.test(raw)) next[`q.${l.sourceLineId}`] = 'En fazla 3 ondalık';
      else if (q > Number(l.returnableQuantity))
        next[`q.${l.sourceLineId}`] = `En fazla ${formatQty(l.returnableQuantity)} ${l.unitCode}`;
    });
    if (sourceId && entered.length === 0) next.lines = 'En az bir satırda iade miktarı girilmelidir';

    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({
      returnType: config.type,
      documentDate,
      sourceDocumentId: sourceId,
      description: description.trim() || null,
      lines: entered.map((l) => ({ sourceLineId: l.sourceLineId, quantity: Number(quantities[l.sourceLineId]) })),
    });
  };

  const handleBack = () => (dirty ? setConfirmLeave(true) : onBack());

  const totals = useMemo(
    () =>
      calcTotals(
        entered.map((l) => ({
          quantity: quantities[l.sourceLineId],
          unitPrice: l.unitPrice,
          discountRate: l.discountRate,
          vatRate: l.vatRate,
        }))
      ),
    // entered her render'da yeniden oluşur; miktarlar veya kaynak değişince hesaplanması yeterli
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities, source.data]
  );

  // Kaynak fiş seçimi: belge no, tarih veya tedarikçi/alıcı adıyla aranır; en yeni üstte
  const sourceOptions = useMemo(
    () => [...sources].sort((a, b) => (a.documentDate < b.documentDate ? 1 : a.documentDate > b.documentDate ? -1 : b.id - a.id)),
    [sources]
  );
  const sourceLabelOf = (d) => [d.documentNo, formatDate(d.documentDate), config.partyOf(d)].filter(Boolean).join(' · ');
  const selectedSource =
    sourceOptions.find((d) => d.id === sourceId) ??
    (ret ? { id: ret.sourceDocumentId, documentNo: ret.sourceDocumentNo, documentDate: '', supplierName: ret.partyName, customerName: ret.partyName } : null);

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          {ret ? `${config.docLabel} ${ret.documentNo}` : config.newLabel}
        </Typography>
        <Button startIcon={<ArrowBackOutlined />} onClick={handleBack} disabled={saving}>
          Listeye dön
        </Button>
      </Box>

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
          value={ret?.documentNo ?? ''}
          placeholder="Otomatik"
          helperText={ret ? 'Değiştirilemez' : 'Kaydedince atanır'}
          fullWidth
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
        />
        <TextField
          id="documentDate"
          label="Tarih"
          type="date"
          required
          value={documentDate}
          onChange={(e) => {
            setDocumentDate(e.target.value);
            setLocalErrors((prev) => ({ ...prev, documentDate: undefined }));
          }}
          error={Boolean(error('documentDate'))}
          helperText={error('documentDate')}
          disabled={saving}
          fullWidth
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
        />
        <Autocomplete
          options={sourceOptions}
          value={selectedSource}
          onChange={(_, doc) => selectSource(doc)}
          getOptionLabel={sourceLabelOf}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(opts, { inputValue }) => {
            const q = lower(inputValue.trim());
            return q ? opts.filter((d) => lower(sourceLabelOf(d)).includes(q)) : opts;
          }}
          disabled={saving || Boolean(ret)}
          noOptionsText="Fiş bulunamadı"
          renderInput={(params) => (
            <TextField
              {...params}
              id="sourceDocument"
              label={config.sourceLabel}
              required
              placeholder="Belge no veya ad ile ara"
              error={Boolean(error('sourceDocumentId'))}
              helperText={error('sourceDocumentId') || (ret ? 'İadede kaynak fiş değiştirilemez' : undefined)}
            />
          )}
        />
        <TextField
          id="partyName"
          label={config.partyLabel}
          value={source.data?.partyName ?? ''}
          placeholder="Kaynak fişten gelir"
          fullWidth
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
        />
        <TextField
          id="description"
          label="Açıklama"
          placeholder="Örn. hasarlı ürün"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
          fullWidth
          sx={{ gridColumn: '1 / -1' }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </Box>

      {error('lines') && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error('lines')}
        </Alert>
      )}

      {!sourceId && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          İade edilecek ürünleri görmek için {config.sourceLabel.toLocaleLowerCase('tr')} seçin. Fiyat, iskonto ve KDV
          kaynak fişten gelir; iade kaydedilince ürünler {config.effect}.
        </Alert>
      )}
      {source.loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
          <CircularProgress size={16} />
          <Typography sx={{ fontSize: 13 }} color="text.secondary">
            Fiş satırları yükleniyor…
          </Typography>
        </Box>
      )}
      {source.error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {source.error}
        </Alert>
      )}

      {source.data && (
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table aria-label="İade satırları" sx={{ '& td': { verticalAlign: 'top', py: 0.75 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headSx, width: 32 }}>#</TableCell>
                <TableCell sx={headSx}>Ürün</TableCell>
                <TableCell sx={headSx} align="right">
                  {config.quantityLabel}
                </TableCell>
                <TableCell sx={headSx} align="right">
                  Önceki İade
                </TableCell>
                <TableCell sx={headSx} align="right">
                  İade Edilebilir
                </TableCell>
                <TableCell sx={{ ...headSx, minWidth: 110 }} id={QTY_COL}>
                  İade Miktarı
                </TableCell>
                <TableCell sx={headSx} align="right">
                  Birim Fiyat
                </TableCell>
                <TableCell sx={headSx} align="right">
                  İsk.
                </TableCell>
                <TableCell sx={headSx} align="right">
                  İade Tutarı
                </TableCell>
                <TableCell sx={headSx} align="right">
                  KDV
                </TableCell>
                <TableCell sx={headSx} align="right">
                  Toplam
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l) => {
                const raw = quantities[l.sourceLineId] ?? '';
                const q = Number(raw) || 0;
                const amounts = q > 0 ? calcLine({ quantity: raw, unitPrice: l.unitPrice, discountRate: l.discountRate, vatRate: l.vatRate }) : null;
                const exhausted = Number(l.returnableQuantity) <= 0;
                const multiplied = Number(l.multiplier) !== 1;
                const text = { fontSize: 13, pt: 1.25, whiteSpace: 'nowrap' };
                const sub = { fontSize: 11, color: 'text.secondary', mt: 0.25 };
                return (
                  <TableRow key={l.sourceLineId} data-testid="return-line" sx={exhausted ? { opacity: 0.55 } : undefined}>
                    <TableCell sx={{ ...text, color: 'text.secondary' }}>{l.lineNo}</TableCell>
                    <TableCell sx={{ fontSize: 13, pt: 1.25 }}>
                      {l.productCode} - {l.productName}
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {formatQty(l.quantity)} {l.unitCode}
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {Number(l.returnedQuantity) > 0 ? `${formatQty(l.returnedQuantity)} ${l.unitCode}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ ...text, fontWeight: 600 }}>
                      {formatQty(l.returnableQuantity)} {l.unitCode}
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={raw}
                        onChange={(e) => setQuantity(l.sourceLineId, e.target.value)}
                        error={Boolean(error(`q.${l.sourceLineId}`))}
                        helperText={
                          error(`q.${l.sourceLineId}`) ||
                          (multiplied && q > 0 ? `= ${formatQty(round(q * Number(l.multiplier), 3))} ${l.baseUnitCode}` : '')
                        }
                        disabled={saving || exhausted}
                        fullWidth
                        slotProps={{
                          htmlInput: {
                            'aria-labelledby': QTY_COL,
                            min: 0,
                            max: Number(l.returnableQuantity),
                            step: '0.001',
                            inputMode: 'decimal',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {formatMoney(l.unitPrice)} ₺
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {Number(l.discountRate) > 0 ? formatRate(l.discountRate) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {amounts ? `${formatMoney(amounts.netAmount)} ₺` : ''}
                      {amounts && (
                        <Typography sx={sub}>
                          {l.baseUnitName} başı {formatMoney(round(amounts.netAmount / round(q * Number(l.multiplier), 3)))} ₺
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={text}>
                      {formatRate(l.vatRate)}
                    </TableCell>
                    <TableCell align="right" sx={{ ...text, fontWeight: 600 }}>
                      {amounts ? `${formatMoney(amounts.totalAmount)} ₺` : ''}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mt: 1.5 }}>
        <Box>
          {source.data && (
            <Button startIcon={<DoneAllOutlined />} onClick={returnAll} disabled={saving}>
              Kalanların tümünü iade et
            </Button>
          )}
        </Box>

        <Box sx={{ width: { xs: '100%', sm: 300 } }}>
          <Box
            component="dl"
            aria-label="İade toplamları"
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
            <Button type="submit" variant="contained" disabled={saving || source.loading}>
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
        message="İade fişinde kaydedilmemiş değişiklikler var. Kaydetmeden listeye dönülsün mü?"
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

export default ReturnForm;
