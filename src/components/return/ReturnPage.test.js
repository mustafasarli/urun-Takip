import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider } from '../../auth/testAuth';
import theme from '../../theme';
import { todayIso } from '../purchase/purchaseCalc';

const BASE = 'http://localhost:8080/api';

const PURCHASES = [
  { id: 5, documentNo: 'ALS-2026-000005', documentDate: '2026-11-01', supplierName: 'Akyüz' },
  { id: 4, documentNo: 'ALS-2026-000004', documentDate: '2026-10-20', supplierName: 'Demir Ltd' },
];
const ISSUES = [{ id: 9, documentNo: 'CKS-2026-000001', documentDate: '2026-11-02', customerName: 'Yılmaz Market' }];

const PURCHASE_RETURNS = [
  {
    id: 3, returnType: 'PURCHASE_RETURN', documentNo: 'AIF-2026-000001', documentDate: '2026-11-03',
    sourceDocumentId: 5, sourceDocumentNo: 'ALS-2026-000005', partyName: 'Akyüz', description: null,
    totalDiscount: 12, totalNet: 108, totalVat: 21.6, grandTotal: 129.6,
  },
];

// ALS-2026-000005: 10 Koli (2'si önceden iade edildi) ve 5 Adet
const SOURCE = {
  documentId: 5, documentNo: 'ALS-2026-000005', documentDate: '2026-11-01', partyName: 'Akyüz',
  lines: [
    {
      sourceLineId: 11, lineNo: 1, productId: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı',
      unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', multiplier: 12, baseUnitCode: 'ADT', baseUnitName: 'Adet',
      quantity: 10, returnedQuantity: 2, returnableQuantity: 8, unitPrice: 60, discountRate: 10, vatRate: 20,
    },
    {
      sourceLineId: 12, lineNo: 2, productId: 2, productCode: 'TE-0001', productName: 'Deterjan',
      unitId: 6, unitCode: 'ADT', unitName: 'Adet', multiplier: 1, baseUnitCode: 'ADT', baseUnitName: 'Adet',
      quantity: 5, returnedQuantity: 0, returnableQuantity: 5, unitPrice: 8, discountRate: 0, vatRate: 10,
    },
  ],
};

const RETURN_DETAIL = {
  ...PURCHASE_RETURNS[0],
  lines: [{ id: 1, lineNo: 1, sourceLineId: 11, quantity: 2 }],
};

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET' && url.startsWith(`${BASE}/stock-returns?type=PURCHASE_RETURN`)) return json({ data: PURCHASE_RETURNS });
    if (method === 'GET' && url.startsWith(`${BASE}/stock-returns?type=SALES_RETURN`)) return json({ data: [] });
    if (method === 'GET' && url.startsWith(`${BASE}/stock-returns/source?`)) return json({ data: SOURCE });
    if (method === 'GET' && url === `${BASE}/stock-returns/3`) return json({ data: RETURN_DETAIL });
    if (method === 'GET' && url === `${BASE}/purchases`) return json({ data: PURCHASES });
    if (method === 'GET' && url === `${BASE}/stock-issues`) return json({ data: ISSUES });
    if (method === 'POST') return json({ message: 'İade fişi AIF-2026-000002 oluşturuldu ve stoktan düşüldü' }, 201);
    if (method === 'PUT') return json({ message: 'İade fişi güncellendi' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openPage(label) {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Stok/ }));
  fireEvent.click(screen.getByRole('button', { name: label }));
  await screen.findByRole('heading', { name: label });
}

const lines = () => screen.getAllByTestId('return-line');
const qtyInput = (row) => within(row).getByRole('spinbutton', { name: 'İade Miktarı' });
const total = (label) => screen.getByText(label, { selector: 'dt' }).nextElementSibling.textContent;

test('Alış İade listesi: kaynak fiş ve tedarikçi sütunlarıyla', async () => {
  await openPage('Alış İade');
  await screen.findByText('AIF-2026-000001');

  const table = screen.getByRole('table', { name: 'Alış iade listesi' });
  expect(within(table).getByRole('columnheader', { name: /Alış Fişi/ })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: /Tedarikçi/ })).toBeInTheDocument();
  expect(table).toHaveTextContent('ALS-2026-000005');
  expect(table).toHaveTextContent('Akyüz');
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 1 kayıt · 129,60 ₺');
});

test('Yeni Alış İade: alış fişi seçilir, iade edilebilir miktar aşılamaz, yalnız girilen satırlar gönderilir', async () => {
  await openPage('Alış İade');
  fireEvent.click(await screen.findByRole('button', { name: 'Yeni Alış İade' }));
  await screen.findByRole('heading', { name: 'Yeni Alış İade' });

  fireEvent.change(screen.getByRole('combobox', { name: /Alış Fişi/ }), { target: { value: 'akyüz' } });
  fireEvent.click(await screen.findByRole('option', { name: /ALS-2026-000005/ }));

  await waitFor(() => expect(lines()).toHaveLength(2));
  expect(global.fetch).toHaveBeenCalledWith(
    `${BASE}/stock-returns/source?type=PURCHASE_RETURN&documentId=5`,
    expect.objectContaining({ method: 'GET' })
  );
  expect(screen.getByLabelText('Tedarikçi')).toHaveValue('Akyüz');
  const [koli, deterjan] = lines();
  expect(koli).toHaveTextContent('10 KOLİ'); // alınan
  expect(koli).toHaveTextContent('2 KOLİ'); // önceki iade
  expect(koli).toHaveTextContent('8 KOLİ'); // iade edilebilir

  // 9 Koli > 8
  fireEvent.change(qtyInput(koli), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(within(koli).getByText('En fazla 8 KOLİ')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(`${BASE}/stock-returns`, expect.objectContaining({ method: 'POST' }));

  // 2 Koli × 60 ₺, %10 iskonto (kaynak fişteki gibi) → 108 ₺, %20 KDV
  fireEvent.change(qtyInput(koli), { target: { value: '2' } });
  expect(koli).toHaveTextContent('= 24 ADT');
  expect(koli).toHaveTextContent('108,00 ₺');
  expect(koli).toHaveTextContent('Adet başı 4,50 ₺');
  expect(total('Genel Toplam')).toBe('129,60 ₺');
  expect(qtyInput(deterjan)).toHaveValue(null);

  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('İade fişi AIF-2026-000002 oluşturuldu ve stoktan düşüldü')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'POST');
  expect(JSON.parse(options.body)).toEqual({
    returnType: 'PURCHASE_RETURN',
    documentDate: todayIso(),
    sourceDocumentId: 5,
    description: null,
    lines: [{ sourceLineId: 11, quantity: 2 }],
  });
}, 120000);

test('"Kalanların tümünü iade et" iade edilebilir miktarları doldurur', async () => {
  await openPage('Alış İade');
  fireEvent.click(await screen.findByRole('button', { name: 'Yeni Alış İade' }));
  fireEvent.change(await screen.findByRole('combobox', { name: /Alış Fişi/ }), { target: { value: 'ALS-2026-000005' } });
  fireEvent.click(await screen.findByRole('option', { name: /ALS-2026-000005/ }));
  await waitFor(() => expect(lines()).toHaveLength(2));

  fireEvent.click(screen.getByRole('button', { name: 'Kalanların tümünü iade et' }));
  expect(qtyInput(lines()[0])).toHaveValue(8);
  expect(qtyInput(lines()[1])).toHaveValue(5);
});

test('Düzenle: kaynak fiş değiştirilemez; bu iadenin miktarı hariç tutularak kaynak yüklenir', async () => {
  await openPage('Alış İade');
  await screen.findByText('AIF-2026-000001');
  fireEvent.click(screen.getByRole('button', { name: 'Düzenle' }));

  expect(await screen.findByRole('heading', { name: 'Alış İade Fişi AIF-2026-000001' })).toBeInTheDocument();
  await waitFor(() => expect(lines()).toHaveLength(2));
  expect(global.fetch).toHaveBeenCalledWith(
    `${BASE}/stock-returns/source?type=PURCHASE_RETURN&documentId=5&excludeReturnId=3`,
    expect.objectContaining({ method: 'GET' })
  );
  expect(screen.getByRole('combobox', { name: /Alış Fişi/ })).toBeDisabled();
  expect(qtyInput(lines()[0])).toHaveValue(2);

  fireEvent.change(qtyInput(lines()[0]), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('İade fişi güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/stock-returns/3`);
  expect(JSON.parse(options.body).lines).toEqual([{ sourceLineId: 11, quantity: 3 }]);
});

test('Satış İade: çıkış fişlerinden seçilir, karşı taraf Alıcı', async () => {
  await openPage('Satış İade');
  expect(await screen.findByText(/Bu aralıkta iade fişi yok/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Yeni Satış İade' }));
  await screen.findByRole('heading', { name: 'Yeni Satış İade' });
  expect(screen.getByText(/ürünler stoğa eklenir/)).toBeInTheDocument();
  expect(screen.getByLabelText('Alıcı')).toBeInTheDocument();

  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Çıkış Fişi/ }));
  expect(await screen.findByRole('option', { name: /CKS-2026-000001.*Yılmaz Market/ })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/stock-issues`, expect.objectContaining({ method: 'GET' }));
});
