import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider } from '../../auth/testAuth';
import theme from '../../theme';
import { firstOfMonthIso, todayIso } from '../purchase/purchaseCalc';

const BASE = 'http://localhost:8080/api';

const PRODUCTS = [
  {
    id: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı', barcode: '8690001',
    unitId: 6, unitCode: 'ADT', unitName: 'Adet', vatRate: 20, lastPurchasePrice: 10, profitMargin: 25,
    units: [{ unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', multiplier: 12, barcode: '8690001-K' }],
  },
  {
    id: 2, productCode: 'TE-0001', productName: 'Deterjan', barcode: null,
    unitId: 6, unitCode: 'ADT', unitName: 'Adet', vatRate: 10, lastPurchasePrice: 8, profitMargin: null, units: [],
  },
];

const STOCKS = [
  { productId: 1, quantity: 46 },
  { productId: 2, quantity: 5 },
];

const ISSUES = [
  {
    id: 9, documentNo: 'CKS-2026-000001', documentDate: '2026-11-02', customerName: 'Yılmaz Market',
    invoiceNo: 'S-1', totalDiscount: 0, totalNet: 150, totalVat: 30, grandTotal: 180,
  },
];

const ISSUE_DETAIL = {
  ...ISSUES[0],
  lines: [
    {
      id: 1, lineNo: 1, productId: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı',
      unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', quantity: 1, multiplier: 12, baseQuantity: 12,
      baseUnitCode: 'ADT', baseUnitName: 'Adet', unitPrice: 150, discountRate: 0, vatRate: 20,
      lineAmount: 150, discountAmount: 0, netAmount: 150, vatAmount: 30, totalAmount: 180, unitCost: 10,
    },
  ],
};

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET' && url.startsWith(`${BASE}/stock-issues?`)) return json({ data: ISSUES });
    if (method === 'GET' && url === `${BASE}/stock-issues/customers`) return json({ data: ['Yılmaz Market'] });
    if (method === 'GET' && url === `${BASE}/stock-issues/9`) return json({ data: ISSUE_DETAIL });
    if (method === 'GET' && url === `${BASE}/products`) return json({ data: PRODUCTS });
    if (method === 'GET' && url === `${BASE}/stocks`) return json({ data: STOCKS });
    if (method === 'POST') return json({ message: 'Çıkış fişi CKS-2026-000002 oluşturuldu ve stoktan düşüldü' }, 201);
    if (method === 'PUT') return json({ message: 'Çıkış fişi güncellendi' });
    if (method === 'PATCH') return json({ message: 'Çıkış fişi pasife alındı, ürünler stoğa geri eklendi' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openIssuePage() {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Stok/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Çıkış Fişi' }));
  await screen.findByText('CKS-2026-000001');
}

const lines = () => screen.getAllByTestId('issue-line');
const field = (row, role, name) => within(row).getByRole(role, { name });

async function pickProduct(row, text, option) {
  fireEvent.change(field(row, 'combobox', 'Ürün'), { target: { value: text } });
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

async function pickUnit(row, option) {
  fireEvent.mouseDown(field(row, 'combobox', 'Birim'));
  fireEvent.click(await screen.findByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

test('menüden Stok » Çıkış Fişi açılır; bu ayın fişleri listelenir', async () => {
  await openIssuePage();

  expect(screen.getByRole('heading', { name: 'Çıkış Fişi' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    `${BASE}/stock-issues?from=${firstOfMonthIso()}&to=${todayIso()}`,
    expect.objectContaining({ method: 'GET' })
  );
  expect(screen.getByText('Yılmaz Market')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: /Alıcı/ })).toBeInTheDocument();
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 1 kayıt · 180,00 ₺');
});

test('Yeni Çıkış: fiyat son alış + kâr oranıyla önerilir, stok gösterilir, yetersiz stok kaydedilmez', async () => {
  await openIssuePage();
  fireEvent.click(screen.getByRole('button', { name: 'Yeni Çıkış' }));
  await screen.findByRole('heading', { name: 'Yeni Çıkış' });

  const row = lines()[0];
  await pickProduct(row, 'ayçiçek', 'GIDA-0001 - Ayçiçek Yağı');
  // 10 ₺ × (1 + %25) = 12,50 ₺; mevcut stok ürünün altında
  expect(field(row, 'spinbutton', /Birim Fiyat/)).toHaveValue(12.5);
  expect(row).toHaveTextContent('Stok: 46 ADT');

  await pickUnit(row, 'KOLİ ×12');
  expect(field(row, 'spinbutton', /Birim Fiyat/)).toHaveValue(150);

  // 5 Koli = 60 Adet > 46
  fireEvent.change(field(row, 'spinbutton', 'Miktar'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(within(row).getByText('Yetersiz stok (Stok: 46 ADT)')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(`${BASE}/stock-issues`, expect.objectContaining({ method: 'POST' }));

  fireEvent.change(field(row, 'spinbutton', 'Miktar'), { target: { value: '3' } });
  expect(row).toHaveTextContent('Adet başı 12,50 ₺');
  fireEvent.change(screen.getByRole('combobox', { name: 'Alıcı' }), { target: { value: 'Yılmaz Market' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Çıkış fişi CKS-2026-000002 oluşturuldu ve stoktan düşüldü')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'POST');
  expect(JSON.parse(options.body)).toEqual({
    documentDate: todayIso(),
    customerName: 'Yılmaz Market',
    invoiceNo: null,
    description: null,
    lines: [{ productId: 1, unitId: 7, quantity: 3, unitPrice: 150, discountRate: null }],
  });
}, 120000);

test('Düzenle: fişin kendi çıkışı kullanılabilir stoğa eklenir', async () => {
  await openIssuePage();
  fireEvent.click(screen.getByRole('button', { name: 'Düzenle' }));
  expect(await screen.findByRole('heading', { name: 'Çıkış Fişi CKS-2026-000001' })).toBeInTheDocument();

  // Anlık stok 46 + bu fişte çıkan 12 = 58
  const row = lines()[0];
  expect(row).toHaveTextContent('Stok: 58 ADT');
  // 4 Koli = 48 ≤ 58 olduğu için kabul edilir
  fireEvent.change(field(row, 'spinbutton', 'Miktar'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Çıkış fişi güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/stock-issues/9`);
  expect(JSON.parse(options.body).lines).toEqual([{ productId: 1, unitId: 7, quantity: 4, unitPrice: 150, discountRate: null }]);
});

test('Sil: onaydan sonra fiş pasife alınır, ürünler stoğa döner', async () => {
  await openIssuePage();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));

  expect(screen.getByRole('dialog', { name: 'Çıkış Fişi Sil' })).toHaveTextContent(
    '"CKS-2026-000001" fişi pasife alınacak ve ürünler stoğa geri eklenecek. Emin misiniz?'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Evet, Sil' }));

  expect(await screen.findByText('Çıkış fişi pasife alındı, ürünler stoğa geri eklendi')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/stock-issues/9/deactivate`, expect.objectContaining({ method: 'PATCH' }));
});
