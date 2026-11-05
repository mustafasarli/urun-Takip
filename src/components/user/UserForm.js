import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PASSWORD_HINT, PASSWORD_RULE } from '../../auth/ChangePasswordForm';
import { PERMISSION_GROUPS } from '../../auth/permissions';

const EMPTY = { username: '', fullName: '', role: 'USER', password: '', permissions: [] };
const USERNAME = /^[A-Za-z0-9._-]{3,50}$/;

/**
 * Kullanıcı ekleme ve düzenleme. Düzenlemede kullanıcı adı ve şifre değişmez (şifre: Şifre Sıfırla).
 * Admin tüm ekranları görür; o rolde yetki kutuları işaretli ve kapalıdır.
 */
function UserForm({ user, isSelf, onSubmit, onCancel, onRefresh, saving, refreshing, fieldErrors = {} }) {
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    setForm(
      user
        ? { username: user.username, fullName: user.fullName, role: user.role, password: '', permissions: [...(user.permissions ?? [])] }
        : EMPTY
    );
    setLocalErrors({});
  }, [user]);

  const errors = { ...fieldErrors, ...localErrors };
  const isAdminRole = form.role === 'ADMIN';

  const change = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const togglePermission = (permission) =>
    change(
      'permissions',
      form.permissions.includes(permission) ? form.permissions.filter((p) => p !== permission) : [...form.permissions, permission]
    );

  const validate = () => {
    const next = {};
    if (!user) {
      if (!form.username.trim()) next.username = 'Kullanıcı adı boş olamaz';
      else if (!USERNAME.test(form.username.trim()))
        next.username = '3-50 karakter; harf (Türkçe karakter hariç), rakam, . _ -';
      if (!PASSWORD_RULE.test(form.password)) next.password = PASSWORD_HINT;
    }
    if (!form.fullName.trim()) next.fullName = 'Ad soyad boş olamaz';
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const permissions = isAdminRole ? [] : form.permissions;
    const data = user
      ? { fullName: form.fullName.trim(), role: form.role, permissions }
      : {
          username: form.username.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          role: form.role,
          permissions,
          password: form.password,
        };
    const ok = await onSubmit(data);
    if (ok && !user) setForm(EMPTY);
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 2 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {user ? 'Kullanıcı Güncelle' : 'Yeni Kullanıcı'}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <TextField
          id="username"
          label="Kullanıcı Adı"
          required
          value={form.username}
          onChange={(e) => change('username', e.target.value)}
          error={Boolean(errors.username)}
          helperText={errors.username || (user ? 'Değiştirilemez' : undefined)}
          disabled={saving || Boolean(user)}
          autoComplete="off"
          slotProps={{ htmlInput: { maxLength: 50, autoCapitalize: 'none', spellCheck: false } }}
        />
        <TextField
          id="fullName"
          label="Ad Soyad"
          required
          value={form.fullName}
          onChange={(e) => change('fullName', e.target.value)}
          error={Boolean(errors.fullName)}
          helperText={errors.fullName}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          id="role"
          select
          label="Rol"
          value={form.role}
          onChange={(e) => change('role', e.target.value)}
          disabled={saving || isSelf}
          helperText={isSelf ? 'Kendi rolünüzü değiştiremezsiniz' : isAdminRole ? 'Tüm ekranlar ve kullanıcı yönetimi' : undefined}
        >
          <MenuItem value="USER">Kullanıcı</MenuItem>
          <MenuItem value="ADMIN">Admin</MenuItem>
        </TextField>
        {!user && (
          <TextField
            id="password"
            label="Geçici Şifre"
            type="password"
            required
            value={form.password}
            onChange={(e) => change('password', e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || 'İlk girişte değiştirilecek'}
            disabled={saving}
            autoComplete="new-password"
          />
        )}
      </Box>

      {/* Ekran yetkileri: menü gruplarına göre */}
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, mt: 2 }}>
        <Typography component="legend" variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Ekran Yetkileri
        </Typography>
        {PERMISSION_GROUPS.map((g) => (
          <Box key={g.label} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', width: 80 }}>{g.label}:</Typography>
            <FormGroup row>
              {g.items.map((i) => (
                <FormControlLabel
                  key={i.permission}
                  control={
                    <Checkbox
                      size="small"
                      checked={isAdminRole || form.permissions.includes(i.permission)}
                      onChange={() => togglePermission(i.permission)}
                      disabled={saving || isAdminRole}
                    />
                  }
                  label={i.label}
                  slotProps={{ typography: { fontSize: 13 } }}
                />
              ))}
            </FormGroup>
          </Box>
        ))}
        {!isAdminRole && form.permissions.length === 0 && (
          <FormHelperText>Yetki verilmezse kullanıcı giriş yapar ama hiçbir ekranı göremez.</FormHelperText>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Kaydediliyor…' : user ? 'Güncelle' : 'Ekle'}
        </Button>
        {user && (
          <Button variant="outlined" color="inherit" onClick={onCancel} disabled={saving}>
            Vazgeç
          </Button>
        )}
        <Button variant="outlined" onClick={onRefresh} disabled={saving || refreshing}>
          {refreshing ? 'Yenileniyor…' : 'Yenile'}
        </Button>
      </Box>
    </Paper>
  );
}

export default UserForm;
