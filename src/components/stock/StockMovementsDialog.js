import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { getStockMovements } from '../../api/stockApi';
import { formatDate, formatMoney, formatQty, round } from '../purchase/purchaseCalc';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

const SOURCE_LABELS = { PURCHASE: 'Alış' };

// Hareketler yeniden eskiye gelir; bakiye eskiden yeniye yürüyen toplamdır
function withBalance(movements) {
  let balance = 0;
  const asc = [...movements].reverse().map((m) => {
    const signed = m.direction === 'IN' ? Number(m.quantity) : -Number(m.quantity);
    balance = round(balance + signed, 3);
    return { ...m, signed, balance };
  });
  return asc.reverse();
}

// Bir ürünün stok hareket geçmişi. `stock` null ise pencere kapalıdır.
function StockMovementsDialog({ stock, onClose }) {
  const [state, setState] = useState({ loading: false, error: null, rows: [] });

  useEffect(() => {
    if (!stock) return undefined;
    let cancelled = false;
    setState({ loading: true, error: null, rows: [] });
    getStockMovements(stock.productId)
      .then((data) => !cancelled && setState({ loading: false, error: null, rows: withBalance(data) }))
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, rows: [] }));
    return () => {
      cancelled = true;
    };
  }, [stock]);

  let content;
  if (state.loading) {
    content = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <CircularProgress size={18} />
        <Typography color="text.secondary">Hareketler yükleniyor…</Typography>
      </Box>
    );
  } else if (state.error) {
    content = <Alert severity="error">{state.error}</Alert>;
  } else if (state.rows.length === 0) {
    content = <Typography color="text.secondary">Bu ürünün henüz stok hareketi yok.</Typography>;
  } else {
    content = (
      <TableContainer>
        <Table aria-label="Stok hareketleri">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Tarih</TableCell>
              <TableCell sx={headSx}>Belge</TableCell>
              <TableCell sx={headSx}>Yön</TableCell>
              <TableCell sx={headSx} align="right">
                Miktar
              </TableCell>
              <TableCell sx={headSx} align="right">
                Birim Maliyet ₺
              </TableCell>
              <TableCell sx={headSx} align="right">
                Bakiye
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.rows.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.movementDate)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {m.documentNo ?? '—'}
                  <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>
                    {SOURCE_LABELS[m.sourceType] ?? m.sourceType}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={m.direction === 'IN' ? 'success' : 'warning'}
                    label={m.direction === 'IN' ? 'Giriş' : 'Çıkış'}
                  />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {m.signed > 0 ? '+' : '−'}
                  {formatQty(Math.abs(m.signed))}
                </TableCell>
                <TableCell align="right">{m.unitCost === null || m.unitCost === undefined ? '—' : formatMoney(m.unitCost)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatQty(m.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Dialog open={stock !== null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="movements-title">
      <DialogTitle id="movements-title" sx={{ fontSize: 16 }}>
        {stock && `${stock.productCode} ${stock.productName} — Stok Hareketleri`}
      </DialogTitle>
      <DialogContent>
        {stock && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
            Miktarlar temel birimde ({stock.unitName}).
          </Typography>
        )}
        {content}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}

export default StockMovementsDialog;
