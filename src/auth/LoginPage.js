import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { useAuth } from './AuthContext';

// Giriş ekranı. Hatalı giriş, kilitli hesap ve süresi dolan oturum mesajları burada gösterilir.
function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!username.trim()) next.username = 'Kullanıcı adı boş olamaz';
    if (!password) next.password = 'Şifre boş olamaz';
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setError(null);
    clearNotice();
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}
    >
      <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Inventory2Outlined color="primary" />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Ürün Takip
          </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Devam etmek için giriş yapın.
        </Typography>

        {notice && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          id="username"
          label="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={Boolean(fieldErrors.username)}
          helperText={fieldErrors.username}
          disabled={submitting}
          fullWidth
          autoFocus
          autoComplete="username"
          sx={{ mb: 2 }}
          slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        />
        <TextField
          id="password"
          label="Şifre"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
          disabled={submitting}
          fullWidth
          autoComplete="current-password"
          sx={{ mb: 3 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" size="medium" fullWidth disabled={submitting}>
          {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Button>
      </Paper>
    </Box>
  );
}

export default LoginPage;
