import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider } from '../../auth/testAuth';
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

// BO-0001: bir alış ve bir çıkış fişi
const MIXED_MOVEMENTS = [
  { id: 4, movementDate: '2026-11-03', direction: 'OUT', quantity: 2, unitCost: 5, sourceType: 'ISSUE', sourceId: 9, documentNo: 'CKS-2026-000001' },
  { id: 3, movementDate: '2026-11-01', direction: 'IN', quantity: 14, unitCost: 5, sourceType: 'PURCHASE', sourceId: 6, documentNo: 'ALS-2026-000002' },
];

const docLine = (extra) => ({
  id: 1, lineNo: 1, productId: 2, productCode: 'BO-0001', productName: 'İç Cephe Boyası',
  unitId: 4, unitCode: 'L', unitName: 'Litre', multiplier: 1, baseUnitCode: 'L', baseUnitName: 'Litre',
  discountRate: 0, vatRate: 20, discountAmount: 0, ...extra,
});

const ISSUE_DETAIL = {
  id: 9, documentNo: 'CKS-2026-000001', documentDate: '2026-11-03', customerName: 'Yılmaz Market',
  invoiceNo: null, description: null, totalDiscount: 0, totalNet: 20, totalVat: 4, grandTotal: 24,
  lines: [docLine({ quantity: 2, baseQuantity: 2, unitPrice: 10, lineAmount: 20, netAmount: 20, vatAmount: 4, totalAmount: 24 })],
};

const PURCHASE_DETAIL = {
  id: 6, documentNo: 'ALS-2026-000002', documentDate: '2026-09-15', supplierName: 'Akyüz',
  invoiceNo: null, description: null, totalDiscount: 0, totalNet: 70, totalVat: 14, grandTotal: 84, locked: false,
  lines: [docLine({ quantity: 14, baseQuantity: 14, unitPrice: 5, lineAmount: 70, netAmount: 70, vatAmount: 14, totalAmount: 84 })],
};

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url === `${BASE}/stocks`) return json({ data: STOCKS });
    if (url === `${BASE}/stocks/1/movements`) return json({ data: MOVEMENTS });
    if (url === `${BASE}/stocks/2/movements`) return json({ data: MIXED_MOVEMENTS });
    // Belge no ile açılan fiş ekranlarının ihtiyaç duyduğu istekler
    if (url === `${BASE}/stock-issues/9`) return json({ data: ISSUE_DETAIL });
    if (url === `${BASE}/purchases/6`) return json({ data: PURCHASE_DETAIL });
    if (url.startsWith(`${BASE}/stock-issues?`) || url.startsWith(`${BASE}/purchases?`)) return json({ data: [] });
    if (url.endsWith('/customers') || url.endsWith('/suppliers') || url === `${BASE}/products`) return json({ data: [] });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openStockPage() {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
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

async function openMixedMovements() {
  await openStockPage();
  fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Hareketler' })); // BO-0001
  const dialog = await screen.findByRole('dialog', { name: /BO-0001/ });
  await within(dialog).findByText('CKS-2026-000001');
  return dialog;
}

test('hareketlerde çıkış fişinin belge no’su tıklanınca Çıkış Fişi ekranında o fiş açılır', async () => {
  const dialog = await openMixedMovements();
  const rows = within(dialog).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Çıkış');
  expect(rows[0]).toHaveTextContent('−2');
  expect(rows[0].lastChild).toHaveTextContent('12'); // 14 − 2

  fireEvent.click(within(dialog).getByRole('button', { name: 'CKS-2026-000001' }));

  expect(await screen.findByRole('heading', { name: 'Çıkış Fişi CKS-2026-000001' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Çıkış Fişi', current: 'page' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/stock-issues/9`, expect.objectContaining({ method: 'GET' }));
});

test('alış fişinin belge no’su tıklanınca Alış Girişi açılır; eski tarihli fiş için liste filtresi genişler', async () => {
  const dialog = await openMixedMovements();

  fireEvent.click(within(dialog).getByRole('button', { name: 'ALS-2026-000002' }));

  expect(await screen.findByRole('heading', { name: 'Alış Fişi ALS-2026-000002' })).toBeInTheDocument();
  // Listeye dönünce fişin tarihi (15.09.2026) filtreye dahil olsun
  fireEvent.click(screen.getByRole('button', { name: 'Listeye dön' }));
  expect(await screen.findByLabelText('Başlangıç')).toHaveValue('2026-09-15');
});
