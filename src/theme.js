import { createTheme } from '@mui/material/styles';
import { trTR } from '@mui/material/locale';

// Uygulama teması. Bileşenler varsayılan olarak küçük (dense) boyutta çizilir.
const theme = createTheme(
  {
    palette: {
      primary: { main: '#2563eb' },
      background: { default: '#f4f6f8' },
    },
    typography: {
      fontSize: 13,
      fontFamily: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiButton: { defaultProps: { size: 'small', disableElevation: true } },
      MuiTable: { defaultProps: { size: 'small' } },
      // Tablodaki rakamlar eşit genişlikte; sayılar alt alta hizalı görünür
      MuiTableCell: { styleOverrides: { root: { fontVariantNumeric: 'tabular-nums' } } },
      // Sıralanabilir başlıkların oku her zaman görünür (seçili olmayanlarda soluk)
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            '&:not(.Mui-active) .MuiTableSortLabel-icon': { opacity: 0.35 },
          },
        },
      },
      MuiPaper: { defaultProps: { variant: 'outlined' } },
      MuiAppBar: { defaultProps: { elevation: 0 } },
    },
  },
  trTR
);

export default theme;
