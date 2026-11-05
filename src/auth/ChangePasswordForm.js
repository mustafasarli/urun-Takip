import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useAuth } from './AuthContext';

// Backend ile aynı kural: 8-72 karakter, en az bir harf ve bir rakam
export const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).{8,72}$/u;
export const PASSWORD_HINT = 'En az 8 karakter; harf ve rakam içermeli';

/**
 * Oturum sahibinin şifresini değiştirir. İlk girişte zorunlu ekranda ve üst menüdeki pencerede kullanılır.
 * Başarılıysa yeni token alınır (diğer oturumlar kapanır) ve onDone çağrılır.
 */
function ChangePasswordForm({ onDone, onCancel, submitLabel = 'Şifreyi Değiştir' }) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', repeat: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const change = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.current) next.current = 'Mevcut şifre boş olamaz';
    if (!PASSWORD_RULE.test(form.next)) next.next = PASSWORD_HINT;
    else if (form.next === form.current) next.next = 'Yeni şifre mevcut şifreyle aynı olamaz';
    if (form.repeat !== form.next) next.repeat = 'Şifreler eşleşmiyor';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setError(null);
    try {
      await changePassword(form.current, form.next);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, autoComplete, helper) => (
    <TextField
      id={`pw-${name}`}
      label={label}
      type="password"
      value={form[name]}
      onChange={change(name)}
      error={Boolean(errors[name])}
      helperText={errors[name] || helper}
      disabled={saving}
      fullWidth
      autoComplete={autoComplete}
      sx={{ mb: 2 }}
    />
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {field('current', 'Mevcut Şifre', 'current-password')}
      {field('next', 'Yeni Şifre', 'new-password', PASSWORD_HINT)}
      {field('repeat', 'Yeni Şifre (Tekrar)', 'new-password')}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button variant="outlined" color="inherit" onClick={onCancel} disabled={saving}>
            Vazgeç
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Kaydediliyor…' : submitLabel}
        </Button>
      </Box>
    </Box>
  );
}

export default ChangePasswordForm;
