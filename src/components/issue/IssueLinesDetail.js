import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { formatMoney, formatQty, formatRate, round } from '../purchase/purchaseCalc';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 11, whiteSpace: 'nowrap', bgcolor: 'transparent' };
const subSx = { fontSize: 11, color: 'text.secondary', mt: 0.25 };

/**
 * Listede açılan fiş satırları (salt okunur). Değerler backend'in kayıtta hesapladığı tutarlardır.
 * `detail`: { loading, error, data } — data, GET /api/issues/{id} yanıtı.
 */
function IssueLinesDetail({ documentNo, detail }) {
  if (!detail || detail.loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 13 }} color="text.secondary">
          Fiş satırları yükleniyor…
        </Typography>
      </Box>
    );
  }
  if (detail.error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {detail.error}
      </Alert>
    );
  }

  const { lines = [], description } = detail.data;
  return (
    <Box sx={{ py: 1 }}>
      {description && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75 }}>Açıklama: {description}</Typography>
      )}
      <Table aria-label={`${documentNo} satırları`} sx={{ '& td': { verticalAlign: 'top', fontSize: 12.5 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headSx, width: 32 }}>#</TableCell>
            <TableCell sx={headSx}>Ürün</TableCell>
            <TableCell sx={headSx} align="right">
              Miktar
            </TableCell>
            <TableCell sx={headSx} align="right">
              Birim Fiyat
            </TableCell>
            <TableCell sx={headSx} align="right">
              İskonto
            </TableCell>
            <TableCell sx={headSx} align="right">
              Satış Tutarı
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
            const multiplied = Number(l.multiplier) !== 1;
            const baseQty = Number(l.baseQuantity);
            const unitCost = baseQty > 0 ? round(Number(l.netAmount) / baseQty) : null;
            const hasDiscount = Number(l.discountRate) > 0;
            return (
              <TableRow key={l.id}>
                <TableCell sx={{ color: 'text.secondary' }}>{l.lineNo}</TableCell>
                <TableCell>
                  {l.productCode} - {l.productName}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatQty(l.quantity)} {l.unitCode}
                  {multiplied && (
                    <Typography sx={subSx}>
                      = {formatQty(l.baseQuantity)} {l.baseUnitCode}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatMoney(l.unitPrice)} ₺
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {hasDiscount ? (
                    <>
                      {formatRate(l.discountRate)}
                      <Typography sx={subSx}>−{formatMoney(l.discountAmount)} ₺</Typography>
                    </>
                  ) : (
                    <Typography component="span" color="text.disabled" sx={{ fontSize: 'inherit' }}>
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatMoney(l.netAmount)} ₺
                  {unitCost !== null && (
                    <Typography sx={subSx}>
                      {l.baseUnitName ?? l.baseUnitCode} başı {formatMoney(unitCost)} ₺
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatRate(l.vatRate)}
                  <Typography sx={subSx}>{formatMoney(l.vatAmount)} ₺</Typography>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {formatMoney(l.totalAmount)} ₺
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

export default IssueLinesDetail;
