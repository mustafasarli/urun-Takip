import { useState } from 'react';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { MENU } from './menu';

export const SIDEBAR_WIDTH = 200;

const paperSx = { '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } };

function MenuList({ menu, activeKey, onSelect }) {
  // Seçili ekranın bulunduğu grup açık başlar
  const [openGroups, setOpenGroups] = useState(() =>
    menu.filter((g) => g.items.some((i) => i.key === activeKey)).map((g) => g.key)
  );

  const toggleGroup = (key) => {
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <List component="nav" aria-label="Ana menü" dense>
      {menu.map((group) => {
        const open = openGroups.includes(group.key);
        return (
          <div key={group.key}>
            <ListItemButton onClick={() => toggleGroup(group.key)} aria-expanded={open}>
              <ListItemText primary={group.label} slotProps={{ primary: { fontSize: 13, fontWeight: 600 } }} />
              {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <List component="div" disablePadding dense>
                {group.items.map((item) => (
                  <ListItemButton
                    key={item.key}
                    sx={{ pl: 3.5 }}
                    selected={item.key === activeKey}
                    aria-current={item.key === activeKey ? 'page' : undefined}
                    onClick={() => onSelect(item.key)}
                  >
                    <ListItemText primary={item.label} slotProps={{ primary: { fontSize: 13 } }} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </div>
        );
      })}
    </List>
  );
}

// Geniş ekranda sabit menü; dar ekranda üst çubuktaki butonla açılan çekmece.
// `menu`: kullanıcının yetkisine göre süzülmüş menü (verilmezse tümü)
function Sidebar({ menu = MENU, activeKey, onSelect, mobileOpen, onMobileClose }) {
  const handleMobileSelect = (key) => {
    onSelect(key);
    onMobileClose();
  };

  return (
    <>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, ...paperSx }}>
        <Toolbar variant="dense" />
        <MenuList menu={menu} activeKey={activeKey} onSelect={onSelect} />
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        sx={{ display: { xs: 'block', md: 'none' }, ...paperSx }}
      >
        <MenuList menu={menu} activeKey={activeKey} onSelect={handleMobileSelect} />
      </Drawer>
    </>
  );
}

export default Sidebar;
