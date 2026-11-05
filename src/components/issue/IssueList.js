import { Fragment, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
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
import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import { getIssue } from '../../api/stockIssueApi';
import { formatDate, formatMoney, round, todayIso } from '../purchase/purchaseCalc';
import IssueLinesDetail from './IssueLinesDetail';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

const PAGE_SIZES = [10, 25, 50];

const COLUMNS = [
  { key: 'documentNo', label: 'Belge No' },
  { key: 'documentDate', label: 'Tarih', render: (p) => formatDate(p.documentDate) },
  { key: 'customerName', label: 'Alıcı' },
  { key: 'invoiceNo', label: 'Fatura No' },
  { key: 'totalDiscount', label: 'İskonto', numeric: true },
  { key: 'totalNet', label: 'Net', numeric: true },
  { key: 'totalVat', label: 'KDV', numeric: true },
  { key: 'grandTotal', label: 'Genel Toplam', numeric: true },
];

// Türkçe alfabeye göre, büyük/küçük harf ayırmadan; belge no içindeki sayılar sayısal sıralanır
const collator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

function sortRows(rows, orderBy, order) {
  const dir = order === 'asc' ? 1 : -1;
  const numeric = COLUMNS.find((c) => c.key === orderBy)?.numeric;
  return [...rows].sort((a, b) => {
    const x = a[orderBy];
    const y = b[orderBy];
    const xEmpty = x === null || x === undefined || x === '';
    const yEmpty = y === null || y === undefined || y === '';
    // Boş değerler yön ne olursa olsun en sona
    if (xEmpty && yEmpty) return 0;
    if (xEmpty) return 1;
    if (yEmpty) return -1;
    const cmp = numeric ? Number(x) - Number(y) : collator.compare(String(x), String(y));
    // Aynı tarihli fişler belge numarasına göre
    return (cmp || collator.compare(a.documentNo, b.documentNo)) * dir;
  });
}

const empty = (
  <Typography component="span" color="text.disabled">
    —
  </Typography>
);

function IssueList({
  issues,
  loading,
  filters,
  onFiltersChange,
  onNew,
  onRefresh,
  onEdit,
  onDelete,
  deletingId,
}) {
  const [orderBy, setOrderBy] = useState('documentDate');
  const [order, setOrder] = useState('desc'); // en yeni fiş üstte
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);

  // Açık fişler ve satırları: satırlar ilk açılışta backend'den çekilir, sonra önbellekten gelir
  const [expanded, setExpanded] = useState(() => new Set());
  const [details, setDetails] = useState({}); // id -> { loading, error, data }

  // Liste yenilenince (kayıt, silme, filtre) satırlar da güncel olsun: önbellek boşaltılır,
  // açık kalan fişlerin satırları yeniden çekilir
  useEffect(() => {
    setDetails({});
  }, [issues]);

  useEffect(() => {
    expanded.forEach((id) => {
      if (details[id]) return;
      setDetails((prev) => ({ ...prev, [id]: { loading: true } }));
      getIssue(id)
        .then((data) => setDetails((prev) => ({ ...prev, [id]: { data } })))
        .catch((err) => setDetails((prev) => ({ ...prev, [id]: { error: err.message } })));
    });
  }, [expanded, details]);

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sorted = useMemo(() => sortRows(issues, orderBy, order), [issues, orderBy, order]);
  const grandTotal = useMemo(() => round(issues.reduce((s, p) => s + Number(p.grandTotal ?? 0), 0)), [issues]);

  const lastPage = Math.max(0, Math.ceil(issues.length / rowsPerPage) - 1);
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

  const setFilter = (name) => (e) => {
    setPage(0);
    onFiltersChange({ ...filters, [name]: e.target.value });
  };

  const today = todayIso();

  let body;
  if (loading) {
    body = (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CircularProgress size={18} />
        <Typography color="text.secondary">Çıkış fişleri yükleniyor…</Typography>
      </Box>
    );
  } else if (issues.length === 0) {
    body = (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          Bu aralıkta çıkış fişi yok. "Yeni Çıkış" ile ekleyebilirsiniz.
        </Typography>
      </Box>
    );
  } else {
    body = (
      <>
        <TableContainer>
          <Table aria-label="Çıkış fişi listesi">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headSx, width: 40 }} />
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
              {pageRows.map((p) => {
                const open = expanded.has(p.id);
                return (
                <Fragment key={p.id}>
                <TableRow
                  hover
                  onClick={() => toggle(p.id)}
                  sx={{ cursor: 'pointer', '& > td': open ? { borderBottom: 'none' } : undefined }}
                >
                  <TableCell sx={{ width: 40, pr: 0 }}>
                    <Tooltip title={open ? 'Ürünleri gizle' : 'Ürünleri göster'}>
                      <IconButton
                        size="small"
                        aria-label={open ? 'Ürünleri gizle' : 'Ürünleri göster'}
                        aria-expanded={open}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(p.id);
                        }}
                      >
                        {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  {COLUMNS.map((col) => {
                    const value = col.render ? col.render(p) : p[col.key];
                    let content = value;
                    if (value === null || value === undefined || value === '') content = empty;
                    else if (col.key === 'totalDiscount' && Number(value) === 0) content = empty;
                    else if (col.numeric) content = formatMoney(value);
                    return (
                      <TableCell
                        key={col.key}
                        align={col.numeric ? 'right' : 'left'}
                        sx={{ whiteSpace: col.key === 'customerName' ? 'normal' : 'nowrap' }}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                      <Tooltip title="Düzenle">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Düzenle"
                            onClick={() => onEdit(p)}
                            disabled={deletingId === p.id}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={deletingId === p.id ? 'Siliniyor…' : 'Sil'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Sil"
                            onClick={() => onDelete(p)}
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DeleteOutlined fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                {/* Fişin ürünleri: satırın hemen altında açılır */}
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} sx={{ py: 0, ...(open ? {} : { borderBottom: 'none' }) }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      <Box sx={{ pl: 5, pr: 1, pb: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                        <IssueLinesDetail documentNo={p.documentNo} detail={details[p.id]} />
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
                </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Alt bilgi: solda sayfalama, sağda toplam kayıt ve tutar */}
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
            count={issues.length}
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
            Toplam: <strong>{issues.length}</strong> kayıt · <strong>{formatMoney(grandTotal)} ₺</strong>
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <Paper>
      {/* Filtreler solda, butonlar sağda; dar ekranda alt alta */}
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
          id="filter-from"
          label="Başlangıç"
          type="date"
          value={filters.from}
          onChange={setFilter('from')}
          sx={{ width: 160 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: filters.to || today } }}
        />
        <TextField
          id="filter-to"
          label="Bitiş"
          type="date"
          value={filters.to}
          onChange={setFilter('to')}
          sx={{ width: 160 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: filters.from || undefined } }}
        />
        <TextField
          id="filter-customer"
          label="Alıcı ara"
          value={filters.customer}
          onChange={setFilter('customer')}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={onNew}>
            Yeni Çıkış
          </Button>
          <Button variant="outlined" onClick={onRefresh} disabled={loading}>
            {loading ? 'Yenileniyor…' : 'Yenile'}
          </Button>
        </Box>
      </Box>
      {body}
    </Paper>
  );
}

export default IssueList;
