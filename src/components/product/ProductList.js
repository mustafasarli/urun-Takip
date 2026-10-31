import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

const PAGE_SIZES = [10, 25, 50];

const quantity = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });

// Sayısal sütunlar sağa yaslı ve Türkçe biçimde (1.234,5) gösterilir
const COLUMNS = [
  { key: 'productCode', label: 'Ürün Kodu' },
  { key: 'productName', label: 'Ürün Adı' },
  { key: 'categoryName', label: 'Kategori' },
  { key: 'unitCode', label: 'Birim', render: (p) => p.unitCode, tooltip: (p) => p.unitName },
  { key: 'barcode', label: 'Barkod' },
  { key: 'minStockLevel', label: 'Min. Stok', numeric: true, format: quantity },
  { key: 'description', label: 'Açıklama' },
];

// Türkçe alfabeye göre, büyük/küçük harf ayırmadan karşılaştırır (ç, ğ, ı, ö, ş, ü doğru sıralanır)
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
    return (numeric ? Number(x) - Number(y) : collator.compare(String(x), String(y))) * dir;
  });
}

const empty = (
  <Typography component="span" color="text.disabled">
    —
  </Typography>
);

function renderCell(col, p) {
  const value = col.render ? col.render(p) : p[col.key];
  if (value === null || value === undefined || value === '') return empty;
  const text = col.format ? col.format.format(Number(value)) : value;
  return col.tooltip ? (
    <Tooltip title={col.tooltip(p)}>
      <span>{text}</span>
    </Tooltip>
  ) : (
    text
  );
}

function ProductList({ products, loading, editingId, deletingId, onEdit, onDelete }) {
  const [orderBy, setOrderBy] = useState('productCode');
  const [order, setOrder] = useState('asc');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);

  const sorted = useMemo(() => sortRows(products, orderBy, order), [products, orderBy, order]);

  // Silme sonrası son sayfa boşalırsa bir önceki sayfaya düşülür
  const lastPage = Math.max(0, Math.ceil(products.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

  // Aynı başlığa tekrar tıklayınca yön değişir, farklı başlıkta artan sırayla başlar.
  // Sıralama değişince ilk sayfaya dönülür.
  const handleSort = (key) => {
    setPage(0);
    if (key === orderBy) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(key);
      setOrder('asc');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CircularProgress size={18} />
        <Typography color="text.secondary">Ürünler yükleniyor…</Typography>
      </Paper>
    );
  }

  if (products.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">Henüz ürün yok. Yukarıdaki formdan ekleyebilirsiniz.</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      {/* Sütun çok olduğu için dar ekranda tablo yatay kayar */}
      <TableContainer>
        {/* Dense table: tema varsayılanı size="small" */}
        <Table aria-label="Ürün listesi">
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
            {pageRows.map((p) => (
              <TableRow key={p.id} hover selected={p.id === editingId}>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.numeric ? 'right' : 'left'}
                    sx={{ whiteSpace: col.key === 'productName' || col.key === 'description' ? 'normal' : 'nowrap' }}
                  >
                    {renderCell(col, p)}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                    {/* Pasif butonda da ipucu çalışsın diye span ile sarılır */}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Alt bilgi: solda sayfalama, sağda toplam kayıt */}
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
          count={products.length}
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
          Toplam: <strong>{products.length}</strong> kayıt
        </Typography>
      </Box>
    </Paper>
  );
}

export default ProductList;
