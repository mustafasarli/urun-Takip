import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { getDocumentSeries, updateDocumentSeries } from '../../api/documentSeriesApi';
import DocumentSeriesForm from './DocumentSeriesForm';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };

/**
 * Belge No Tanımları: her fiş türünün ön eki, yıl ayarı, hane sayısı ve sıradaki numarası.
 * Fiş türleri sabittir; satır eklenmez/silinmez, yalnızca düzenlenir.
 */
function DocumentSeriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getDocumentSeries());
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (data) => {
    setSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const res = await updateDocumentSeries(editing.documentType, data);
      setMessage({ type: 'success', text: res?.message || 'Belge no tanımı güncellendi' });
      setEditing(null);
      await load();
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="section">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
        Belge No Tanımları
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        {editing && (
          <DocumentSeriesForm
            series={editing}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditing(null);
              setFieldErrors({});
            }}
            saving={saving}
            fieldErrors={fieldErrors}
          />
        )}

        <Paper>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Button variant="outlined" onClick={load} disabled={loading}>
              {loading ? 'Yenileniyor…' : 'Yenile'}
            </Button>
          </Box>
          {loading ? (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Belge no tanımları yükleniyor…</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table aria-label="Belge no tanımları">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Belge Türü</TableCell>
                    <TableCell sx={headSx}>Ön Ek</TableCell>
                    <TableCell sx={headSx} align="center">
                      Yıl
                    </TableCell>
                    <TableCell sx={headSx} align="right">
                      Hane
                    </TableCell>
                    <TableCell sx={headSx}>Son Kullanılan</TableCell>
                    <TableCell sx={headSx} align="right">
                      Sıradaki No
                    </TableCell>
                    <TableCell sx={headSx}>Örnek</TableCell>
                    <TableCell sx={headSx} align="right">
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.documentType} hover selected={s.documentType === editing?.documentType}>
                      <TableCell>{s.label}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{s.prefix}</TableCell>
                      <TableCell align="center">
                        {s.yearly ? <CheckOutlined fontSize="small" color="success" aria-label="Yıllı" /> : '—'}
                      </TableCell>
                      <TableCell align="right">{s.digits}</TableCell>
                      <TableCell>
                        {s.lastUsed ?? (
                          <Typography component="span" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{s.nextNumber}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{s.example}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Düzenle">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Düzenle"
                            onClick={() => {
                              setEditing(s);
                              setFieldErrors({});
                              setMessage(null);
                            }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}

export default DocumentSeriesPage;
