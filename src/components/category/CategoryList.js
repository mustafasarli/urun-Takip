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

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12 };

const PAGE_SIZES = [10, 25, 50];

const COLUMNS = [
  { key: 'name', label: 'Kategori Adı' },
  { key: 'shortName', label: 'Kısa Ad' },
  { key: 'description', label: 'Açıklama' },
];

// Türkçe alfabeye göre, büyük/küçük harf ayırmadan karşılaştırır (ç, ğ, ı, ö, ş, ü doğru sıralanır)
const collator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

function sortRows(rows, orderBy, order) {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[orderBy] ?? '';
    const y = b[orderBy] ?? '';
    // Boş değerler yön ne olursa olsun en sona
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return collator.compare(x, y) * dir;
  });
}

function CategoryList({ categories, loading, editingId, deletingId, onEdit, onDelete }) {
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);

  const sorted = useMemo(() => sortRows(categories, orderBy, order), [categories, orderBy, order]);

  // Silme sonrası son sayfa boşalırsa bir önceki sayfaya düşülür
  const lastPage = Math.max(0, Math.ceil(categories.length / rowsPerPage) - 1);
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
        <Typography color="text.secondary">Kategoriler yükleniyor…</Typography>
      </Paper>
    );
  }

  if (categories.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">Henüz kategori yok. Yukarıdaki formdan ekleyebilirsiniz.</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <TableContainer>
        {/* Dense table: tema varsayılanı size="small" */}
        <Table aria-label="Kategori listesi">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  sx={headSx}
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
            {pageRows.map((c) => (
              <TableRow key={c.id} hover selected={c.id === editingId}>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  {c.shortName || (
                    <Tooltip title="Kısa ad tanımlı değil; bu kategoride ürün eklenemez">
                      <Typography component="span" color="warning.main" sx={{ fontSize: 12 }}>
                        Tanımsız
                      </Typography>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  {c.description || (
                    <Typography component="span" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                    {/* Pasif butonda da ipucu çalışsın diye span ile sarılır */}
                    <Tooltip title="Düzenle">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Düzenle"
                          onClick={() => onEdit(c)}
                          disabled={deletingId === c.id}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={deletingId === c.id ? 'Siliniyor…' : 'Sil'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Sil"
                          onClick={() => onDelete(c)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? (
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
          count={categories.length}
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
          Toplam: <strong>{categories.length}</strong> kayıt
        </Typography>
      </Box>
    </Paper>
  );
}

export default CategoryList;
