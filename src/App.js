import { useCallback, useMemo, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from './auth/AuthContext';
import ChangePasswordForm from './auth/ChangePasswordForm';
import LoginPage from './auth/LoginPage';
import Sidebar, { SIDEBAR_WIDTH } from './components/layout/Sidebar';
import { findMenuItem, visibleMenu } from './components/layout/menu';

// Üst çubuk sağı: oturum sahibi, Şifre Değiştir ve Çıkış
function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  return (
    <>
      <Button
        color="inherit"
        startIcon={<AccountCircleOutlined />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Kullanıcı menüsü: ${user.fullName}`}
        aria-haspopup="menu"
        sx={{ fontWeight: 500 }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {user.fullName}
        </Box>
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{user.fullName}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {user.username} · {isAdmin ? 'Admin' : 'Kullanıcı'}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setPasswordChanged(false);
            setPasswordOpen(true);
          }}
        >
          <ListItemIcon>
            <KeyOutlined fontSize="small" />
          </ListItemIcon>
          Şifre Değiştir
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout();
          }}
        >
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          Çıkış
        </MenuItem>
      </Menu>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} maxWidth="xs" fullWidth aria-labelledby="pw-title">
        <DialogTitle id="pw-title" sx={{ fontSize: 16 }}>
          Şifre Değiştir
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {passwordChanged ? (
            <>
              <Typography sx={{ mb: 2 }}>Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapatıldı.</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={() => setPasswordOpen(false)}>
                  Tamam
                </Button>
              </Box>
            </>
          ) : (
            <ChangePasswordForm onDone={() => setPasswordChanged(true)} onCancel={() => setPasswordOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// İlk girişte (yeni kullanıcı veya sıfırlanan şifre) şifre değiştirilmeden ekranlar açılmaz
function ForcedPasswordChange() {
  const { user, logout } = useAuth();
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Şifrenizi belirleyin
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Merhaba {user.fullName}, devam etmeden önce size verilen geçici şifreyi değiştirmeniz gerekiyor.
        </Typography>
        <ChangePasswordForm submitLabel="Şifreyi Kaydet ve Devam Et" />
        <Button size="small" color="inherit" onClick={() => logout()} sx={{ mt: 1 }}>
          Çıkış
        </Button>
      </Paper>
    </Box>
  );
}

function MainLayout() {
  const auth = useAuth();
  const menu = useMemo(() => visibleMenu(auth), [auth]);

  // Açık ekran ve (ekranlar arası geçişte) ona verilen parametreler, örn. { openId: 5 }.
  // `seq` her geçişte artar: aynı ekrana başka parametreyle gelinince ekran sıfırdan kurulur.
  const [nav, setNav] = useState({ key: null, params: null, seq: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  // Yetkisiz ekran anahtarı bulunamaz; karşılama ekranı gösterilir
  const active = findMenuItem(nav.key, auth);
  const ActivePage = active?.item.component;

  // Menüden seçim parametresizdir; ekranlar `navigate` ile başka ekranı parametreyle açabilir
  const navigate = useCallback(
    (key, params = null) => setNav((prev) => ({ key, params, seq: prev.seq + 1 })),
    []
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: '#1f2933' }}>
        <Toolbar variant="dense">
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Menüyü aç"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Ürün Takip
          </Typography>
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Sidebar
        menu={menu}
        activeKey={nav.key}
        onSelect={navigate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, ml: { md: `${SIDEBAR_WIDTH}px` } }}>
        <Toolbar variant="dense" />
        {active && (
          <Breadcrumbs separator="»" sx={{ mb: 1, fontSize: 12 }}>
            <Typography fontSize={12} color="text.secondary">
              {active.group.label}
            </Typography>
            <Typography fontSize={12} color="text.primary">
              {active.item.label}
            </Typography>
          </Breadcrumbs>
        )}
        {ActivePage ? (
          <ActivePage key={nav.seq} params={nav.params} navigate={navigate} />
        ) : (
          <Box sx={{ pt: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Hoş geldiniz
            </Typography>
            <Typography color="text.secondary">
              {menu.length ? 'Soldaki menüden bir ekran seçin.' : 'Size henüz bir ekran yetkisi verilmemiş. Yöneticinize başvurun.'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function App() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Oturum kontrol ediliyor…</Typography>
      </Box>
    );
  }
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ForcedPasswordChange />;
  return <MainLayout />;
}

export default App;
