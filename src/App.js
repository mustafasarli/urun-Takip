import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Sidebar, { SIDEBAR_WIDTH } from './components/layout/Sidebar';
import { findMenuItem } from './components/layout/menu';

function App() {
  const [activeKey, setActiveKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = findMenuItem(activeKey);
  const ActivePage = active?.item.component;

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
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600 }}>
            Ürün Takip
          </Typography>
        </Toolbar>
      </AppBar>

      <Sidebar
        activeKey={activeKey}
        onSelect={setActiveKey}
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
          <ActivePage />
        ) : (
          <Box sx={{ pt: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Hoş geldiniz
            </Typography>
            <Typography color="text.secondary">Soldaki menüden bir ekran seçin.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
