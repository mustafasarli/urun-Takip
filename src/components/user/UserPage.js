import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import { createUser, deleteUser, getUsers, resetUserPassword, updateUser } from '../../api/userApi';
import { useAuth } from '../../auth/AuthContext';
import { PASSWORD_HINT, PASSWORD_RULE } from '../../auth/ChangePasswordForm';
import { PERMISSION_LABELS } from '../../auth/permissions';
import ConfirmDialog from '../common/ConfirmDialog';
import UserForm from './UserForm';

const headSx = { fontWeight: 600, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' };
const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

// Admin bir kullanıcıya yeni geçici şifre verir; kullanıcı ilk girişinde değiştirir
function ResetPasswordDialog({ user, onClose, onSubmit, busy }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setPassword('');
    setRepeat('');
    setErrors({});
  }, [user]);

  const submit = () => {
    const next = {};
    if (!PASSWORD_RULE.test(password)) next.password = PASSWORD_HINT;
    if (repeat !== password) next.repeat = 'Şifreler eşleşmiyor';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(password);
  };

  return (
    <Dialog open={user !== null} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth aria-labelledby="reset-title">
      <DialogTitle id="reset-title" sx={{ fontSize: 16 }}>
        Şifre Sıfırla
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          {user && `"${user.username}" için geçici şifre belirleyin. Kullanıcı ilk girişinde değiştirecek; hesap kilidi kalkar ve açık oturumları kapanır.`}
        </Typography>
        <TextField
          id="reset-password"
          label="Geçici Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(errors.password)}
          helperText={errors.password || PASSWORD_HINT}
          disabled={busy}
          fullWidth
          autoComplete="new-password"
          sx={{ mb: 2 }}
        />
        <TextField
          id="reset-repeat"
          label="Geçici Şifre (Tekrar)"
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          error={Boolean(errors.repeat)}
          helperText={errors.repeat}
          disabled={busy}
          fullWidth
          autoComplete="new-password"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Vazgeç
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          {busy ? 'İşleniyor…' : 'Şifreyi Sıfırla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Kullanıcı Tanımları (yalnızca admin). Kullanıcı silinmez, pasife alınır.
 * Admin kendini pasife alamaz ve kendi rolünü değiştiremez; en az bir aktif admin kalır (backend).
 */
function UserPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
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
      const res = editing ? await updateUser(editing.id, data) : await createUser(data);
      setMessage({ type: 'success', text: res?.message || 'İşlem başarılı' });
      setEditing(null);
      await load();
      return true;
    } catch (err) {
      setFieldErrors(err.errors || {});
      setMessage({ type: 'error', text: err.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action, onDone) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await action();
      setMessage({ type: 'success', text: res?.message || 'İşlem başarılı' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const permissionSummary = (u) => {
    if (u.role === 'ADMIN') return 'Tümü';
    if (!u.permissions?.length) return '—';
    const labels = u.permissions.map((p) => PERMISSION_LABELS[p] ?? p);
    return (
      <Tooltip title={labels.join(', ')}>
        <span>{labels.length} ekran</span>
      </Tooltip>
    );
  };

  return (
    <Box component="section">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
        Kullanıcı Tanımları
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={2}>
        <UserForm
          user={editing}
          isSelf={editing?.id === me.id}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setFieldErrors({});
          }}
          onRefresh={() => {
            setMessage(null);
            load();
          }}
          saving={saving}
          refreshing={loading}
          fieldErrors={fieldErrors}
        />

        <Paper>
          {loading ? (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Kullanıcılar yükleniyor…</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table aria-label="Kullanıcı listesi">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Kullanıcı Adı</TableCell>
                    <TableCell sx={headSx}>Ad Soyad</TableCell>
                    <TableCell sx={headSx}>Rol</TableCell>
                    <TableCell sx={headSx}>Yetkiler</TableCell>
                    <TableCell sx={headSx}>Durum</TableCell>
                    <TableCell sx={headSx}>Son Giriş</TableCell>
                    <TableCell sx={headSx} align="right">
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => {
                    const self = u.id === me.id;
                    return (
                      <TableRow key={u.id} hover selected={u.id === editing?.id}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {u.username}
                          {self && (
                            <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>
                              (siz)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{u.fullName}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={u.role === 'ADMIN' ? 'primary' : 'default'}
                            label={u.role === 'ADMIN' ? 'Admin' : 'Kullanıcı'}
                          />
                        </TableCell>
                        <TableCell>{permissionSummary(u)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {u.locked && <Chip size="small" color="error" variant="outlined" label="Kilitli" />}
                            {u.mustChangePassword && (
                              <Chip size="small" color="warning" variant="outlined" label="İlk giriş bekleniyor" />
                            )}
                            {!u.locked && !u.mustChangePassword && (
                              <Chip size="small" color="success" variant="outlined" label="Aktif" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {u.lastLoginAt ? dateTime.format(new Date(u.lastLoginAt)) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Düzenle">
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label="Düzenle"
                              onClick={() => {
                                setEditing(u);
                                setFieldErrors({});
                                setMessage(null);
                              }}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Şifre Sıfırla">
                            <IconButton size="small" aria-label="Şifre Sıfırla" onClick={() => setResetting(u)}>
                              <KeyOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={self ? 'Kendi kullanıcınızı silemezsiniz' : 'Sil'}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Sil"
                                onClick={() => setPendingDelete(u)}
                                disabled={self}
                              >
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Kullanıcı Sil"
        message={
          pendingDelete && `"${pendingDelete.username}" pasife alınacak; giriş yapamayacak ve açık oturumları kapanacak. Emin misiniz?`
        }
        confirmText="Evet, Sil"
        danger
        busy={busy}
        onConfirm={() => runAction(() => deleteUser(pendingDelete.id), () => setPendingDelete(null))}
        onCancel={() => setPendingDelete(null)}
      />

      <ResetPasswordDialog
        user={resetting}
        busy={busy}
        onClose={() => setResetting(null)}
        onSubmit={(password) => runAction(() => resetUserPassword(resetting.id, password), () => setResetting(null))}
      />
    </Box>
  );
}

export default UserPage;
