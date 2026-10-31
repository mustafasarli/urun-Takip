import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import { getStocks } from '../../api/stockApi';
import { formatQty } from '../purchase/purchaseCalc';
import StockMovementsDialog from './StockMovementsDialog';
import { stockBreakdown } from './stockFormat';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

const PAGE_SIZES = [10, 25, 50];

const COLUMNS = [
  { key: 'productCode', label: 'Ürün Kodu' },
  { key: 'productName', label: 'Ürün Adı' },
  { key: 'categoryName', label: 'Kategori' },
  { key: 'quantity', label: 'Stok', numeric: true },
  { key: 'minStockLevel', label: 'Min. Stok', numeric: true },
  { key: 'belowMinimum', label: 'Durum' },
];

const collator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });
const lower = (s) => (s ?? '').toLocaleLowerCase('tr');

function sortRows(rows, orderBy, order) {
  const dir = order === 'asc' ? 1 : -1;
  const col = COLUMNS.find((c) => c.key === orderBy);
  return [...rows].sort((a, b) => {
    // Durum: kritikler önce (artan yönde)
    if (orderBy === 'belowMinimum') return (Number(b.belowMinimum) - Number(a.belowMinimum)) * dir;
    const x = a[orderBy];
    const y = b[orderBy];
    const xEmpty = x === null || x === undefined || x === '';
    const yEmpty = y === null || y === undefined || y === '';
    // Boş değerler yön ne olursa olsun en sona
    if (xEmpty && yEmpty) return 0;
    if (xEmpty) return 1;
    if (yEmpty) return -1;
    return (col?.numeric ? Number(x) - Number(y) : collator.compare(String(x), String(y))) * dir;
  });
}

const empty = (
  <Typography component="span" color="text.disabled">
    —
  </Typography>
);

// Aktif ürünlerin anlık stoğu (temel birimde). Satırdaki simgeyle ürünün hareket geçmişi açılır.
function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [orderBy, setOrderBy] = useState('productCode');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);
  const [movementsOf, setMovementsOf] = useState(null);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      setStocks(await getStocks());
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Arama: ürün kodu, adı veya kategori içerir
  const filtered = useMemo(() => {
    const q = lower(search.trim());
    return stocks.filter(
      (s) =>
        (!criticalOnly || s.belowMinimum) &&
        (!q || lower(s.productCode).includes(q) || lower(s.productName).includes(q) || lower(s.categoryName).includes(q))
    );
  }, [stocks, search, criticalOnly]);

  const sorted = useMemo(() => sortRows(filtered, orderBy, order), [filtered, orderBy, order]);
  const criticalCount = stocks.filter((s) => s.belowMinimum).length;

  const lastPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

  const handleSort = (key) => {
    setPage(0);
    if (key === orderBy) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(key);
      setOrder('asc');
    }
  };

  let body;
  if (loading) {
    body = (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CircularProgress size={18} />
        <Typography color="text.secondary">Stoklar yükleniyor…</Typography>
      </Box>
    );
  } else if (filtered.length === 0) {
    body = (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          {stocks.length === 0 ? 'Henüz ürün yok.' : 'Filtreye uyan ürün yok.'}
        </Typography>
      </Box>
    );
  } else {
    body = (
      <>
        <TableContainer>
          <Table aria-label="Stok listesi">
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={headSx}
                    align={col.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === col.key ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === col.key}
                      direction={orderBy === col.key ? order : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell sx={headSx} align="right">
                  İşlemler
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((s) => {
                const breakdown = stockBreakdown(s.quantity, s.unitCode, s.units);
                const negative = Number(s.quantity) < 0;
                return (
                  <TableRow key={s.productId} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{s.productCode}</TableCell>
                    <TableCell>{s.productName}</TableCell>
                    <TableCell>{s.categoryName}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title={s.unitName}>
                        <Box component="span" sx={{ fontWeight: 600, color: negative ? 'error.main' : undefined }}>
                          {formatQty(s.quantity)} {s.unitCode}
                        </Box>
                      </Tooltip>
                      {breakdown && (
                        <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', ml: 0.75 }}>
                          ({breakdown})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {s.minStockLevel === null || s.minStockLevel === undefined ? empty : formatQty(s.minStockLevel)}
                    </TableCell>
                    <TableCell>
                      {s.belowMinimum && <Chip size="small" color="error" variant="outlined" label="Kritik" />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Hareketler">
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Hareketler"
                          onClick={() => setMovementsOf(s)}
                        >
                          <HistoryOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            borderTop: 1,
            borderColor: 'divider',
            px: 1,
          }}
        >
          <TablePagination
            component="div"
            count={filtered.length}
            page={currentPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={PAGE_SIZES}
            sx={{
              '& .MuiTablePagination-toolbar': { minHeight: 40, pl: 1 },
              '& .MuiTablePagination-spacer': { display: 'none' },
            }}
          />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 1 }}>
            Toplam: <strong>{filtered.length}</strong> ürün · <strong>{criticalCount}</strong> kritik
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <Box component="section">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
        Stok Durumu
      </Typography>

      {message && (
        <Alert severity="error" onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Paper>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            id="stock-search"
            label="Ara"
            placeholder="Kod, ad veya kategori"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={criticalOnly}
                onChange={(e) => {
                  setCriticalOnly(e.target.checked);
                  setPage(0);
                }}
              />
            }
            label="Yalnız kritik"
            slotProps={{ typography: { fontSize: 13 } }}
          />
          <Button variant="outlined" onClick={loadStocks} disabled={loading} sx={{ ml: 'auto' }}>
            {loading ? 'Yenileniyor…' : 'Yenile'}
          </Button>
        </Box>
        {body}
      </Paper>

      <StockMovementsDialog stock={movementsOf} onClose={() => setMovementsOf(null)} />
    </Box>
  );
}

export default StockPage;
