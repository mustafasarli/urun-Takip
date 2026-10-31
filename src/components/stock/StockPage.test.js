import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import theme from '../../theme';

const BASE = 'http://localhost:8080/api';

const STOCKS = [
  {
    productId: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı', categoryName: 'Gıda',
    unitCode: 'ADT', unitName: 'Adet', quantity: 46, minStockLevel: 20, belowMinimum: false,
    units: [{ unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', multiplier: 12, barcode: null }],
  },
  {
    productId: 2, productCode: 'BO-0001', productName: 'İç Cephe Boyası', categoryName: 'Boya',
    unitCode: 'L', unitName: 'Litre', quantity: 12, minStockLevel: 60, belowMinimum: true, units: [],
  },
  {
    productId: 3, productCode: 'TE-0001', productName: 'Deterjan', categoryName: 'Temizlik',
    unitCode: 'ADT', unitName: 'Adet', quantity: 0, minStockLevel: null, belowMinimum: false, units: [],
  },
];

// Yeniden eskiye
const MOVEMENTS = [
  { id: 2, movementDate: '2026-10-30', direction: 'IN', quantity: 36, unitCost: 9, sourceType: 'PURCHASE', sourceId: 6, documentNo: 'ALS-2026-000002' },
  { id: 1, movementDate: '2026-10-28', direction: 'IN', quantity: 10, unitCost: 11, sourceType: 'PURCHASE', sourceId: 5, documentNo: 'ALS-2026-000001' },
];

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url === `${BASE}/stocks`) return json({ data: STOCKS });
    if (url === `${BASE}/stocks/1/movements`) return json({ data: MOVEMENTS });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openStockPage() {
  render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Stok/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Stok Durumu' }));
  await screen.findByText('Ayçiçek Yağı');
}

const dataRows = () => within(screen.getByRole('table', { name: 'Stok listesi' })).getAllByRole('row').slice(1);

test('stoklar temel birimde, ek birim kırılımıyla ve kritik etiketiyle listelenir', async () => {
  await openStockPage();

  expect(screen.getByRole('heading', { name: 'Stok Durumu' })).toBeInTheDocument();
  // Varsayılan sıralama: ürün kodu artan
  expect(dataRows()[0]).toHaveTextContent('BO-0001');
  expect(dataRows()[0]).toHaveTextContent('12 L');
  expect(within(dataRows()[0]).getByText('Kritik')).toBeInTheDocument();

  expect(dataRows()[1]).toHaveTextContent('46 ADT');
  expect(dataRows()[1]).toHaveTextContent('(3 KOLİ 10 ADT)');
  expect(within(dataRows()[1]).queryByText('Kritik')).not.toBeInTheDocument();

  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 3 ürün · 1 kritik');
});

test('arama ve "Yalnız kritik" filtresi', async () => {
  await openStockPage();

  fireEvent.change(screen.getByLabelText('Ara'), { target: { value: 'temiz' } }); // kategoriye göre
  expect(dataRows()).toHaveLength(1);
  expect(dataRows()[0]).toHaveTextContent('Deterjan');

  fireEvent.change(screen.getByLabelText('Ara'), { target: { value: '' } });
  fireEvent.click(screen.getByLabelText('Yalnız kritik'));
  expect(dataRows()).toHaveLength(1);
  expect(dataRows()[0]).toHaveTextContent('BO-0001');
});

test('Hareketler penceresi: belge no, yön ve yürüyen bakiye', async () => {
  await openStockPage();

  fireEvent.click(within(dataRows()[1]).getByRole('button', { name: 'Hareketler' })); // GIDA-0001
  const dialog = await screen.findByRole('dialog', { name: 'GIDA-0001 Ayçiçek Yağı — Stok Hareketleri' });
  await within(dialog).findByText('ALS-2026-000002');

  const rows = within(dialog).getAllByRole('row').slice(1);
  // En yeni üstte; bakiye eskiden yeniye: 10 → 46
  expect(rows[0]).toHaveTextContent('30.10.2026');
  expect(rows[0]).toHaveTextContent('Giriş');
  expect(rows[0]).toHaveTextContent('+36');
  expect(rows[0]).toHaveTextContent('9,00');
  expect(rows[0].lastChild).toHaveTextContent('46');
  expect(rows[1].lastChild).toHaveTextContent('10');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Kapat' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
