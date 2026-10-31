import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import theme from '../../theme';
import { firstOfMonthIso, todayIso } from './purchaseCalc';

const BASE = 'http://localhost:8080/api';

const PRODUCTS = [
  {
    id: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı', barcode: '8690001',
    unitId: 6, unitCode: 'ADT', unitName: 'Adet', vatRate: 20, lastPurchasePrice: 10,
    units: [{ unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', multiplier: 12, barcode: '8690001-K' }],
  },
  {
    id: 2, productCode: 'TE-0001', productName: 'Deterjan', barcode: null,
    unitId: 6, unitCode: 'ADT', unitName: 'Adet', vatRate: 10, lastPurchasePrice: null, units: [],
  },
  {
    id: 3, productCode: 'BO-0001', productName: 'Boya', barcode: null,
    unitId: 4, unitCode: 'L', unitName: 'Litre', vatRate: null, lastPurchasePrice: null, units: [],
  },
];

const PURCHASES = [
  {
    id: 5, documentNo: 'ALS-2026-000001', documentDate: '2026-10-28', supplierName: 'Akın Gıda',
    invoiceNo: 'F-1', totalDiscount: 0, totalNet: 55, totalVat: 11, grandTotal: 66,
  },
  {
    id: 6, documentNo: 'ALS-2026-000002', documentDate: '2026-10-30', supplierName: null,
    invoiceNo: null, totalDiscount: 36, totalNet: 324, totalVat: 64.8, grandTotal: 388.8,
  },
];

const LOCKED_DETAIL = {
  ...PURCHASES[1],
  locked: true,
  lockReason: 'GIDA-0001 ürününden 31.10.2026 tarihinde çıkış yapılmış; bu fişin satırları ve tarihi değiştirilemez.',
  lines: [
    {
      id: 1, lineNo: 1, productId: 1, productCode: 'GIDA-0001', productName: 'Ayçiçek Yağı',
      unitId: 7, unitCode: 'KOLİ', unitName: 'Koli', quantity: 3, multiplier: 12, baseQuantity: 36,
      baseUnitCode: 'ADT', baseUnitName: 'Adet', unitPrice: 120, discountRate: 10, vatRate: 20,
      lineAmount: 360, discountAmount: 36, netAmount: 324, vatAmount: 64.8, totalAmount: 388.8,
    },
  ],
};

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET' && url.startsWith(`${BASE}/purchases?`)) return json({ data: PURCHASES });
    if (method === 'GET' && url === `${BASE}/purchases/suppliers`) return json({ data: ['Akın Gıda'] });
    if (method === 'GET' && url === `${BASE}/purchases/6`) return json({ data: LOCKED_DETAIL });
    if (method === 'GET' && url === `${BASE}/products`) return json({ data: PRODUCTS });
    if (method === 'POST') return json({ message: 'Alış belgesi ALS-2026-000003 oluşturuldu ve stoğa işlendi' }, 201);
    if (method === 'PUT') return json({ message: 'Alış belgesi güncellendi' });
    if (method === 'PATCH') return json({ message: 'Alış belgesi pasife alındı, stok hareketleri geri alındı' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openPurchasePage() {
  render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Stok/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Alış Girişi' }));
  await screen.findByText('ALS-2026-000001');
}

async function openNew() {
  await openPurchasePage();
  fireEvent.click(screen.getByRole('button', { name: 'Yeni Alış' }));
  await screen.findByRole('heading', { name: 'Yeni Alış' });
}

const lines = () => screen.getAllByTestId('purchase-line');
// Fiş listesinin satırları (açılır ürün satırları hariç)
const listRows = () =>
  within(screen.getByRole('table', { name: 'Alış fişi listesi' }))
    .getAllByRole('row')
    .filter((r) => within(r).queryByRole('button', { name: /Ürünleri (göster|gizle)/ }));
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

const total = (label) => screen.getByText(label, { selector: 'dt' }).nextElementSibling.textContent;

test('menüden Stok » Alış Girişi açılır; bu ayın fişleri listelenir', async () => {
  await openPurchasePage();

  expect(screen.getByRole('heading', { name: 'Alış Girişi' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    `${BASE}/purchases?from=${firstOfMonthIso()}&to=${todayIso()}`,
    expect.objectContaining({ method: 'GET' })
  );

  const rows = listRows();
  // Varsayılan sıralama: en yeni tarih üstte
  expect(rows[0]).toHaveTextContent('ALS-2026-000002');
  expect(rows[1]).toHaveTextContent('28.10.2026');
  expect(rows[1]).toHaveTextContent('Akın Gıda');
  expect(rows[0]).toHaveTextContent('36,00'); // iskonto
  expect(rows[0]).toHaveTextContent('388,80');
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 2 kayıt · 454,80 ₺');
});

test('listede fişin ürünleri açılır: birim fiyat, iskonto, alış fiyatı ve adet başı fiyat', async () => {
  await openPurchasePage();
  expect(screen.queryByRole('table', { name: 'ALS-2026-000002 satırları' })).not.toBeInTheDocument();

  fireEvent.click(within(listRows()[0]).getByRole('button', { name: 'Ürünleri göster' }));
  const table = await screen.findByRole('table', { name: 'ALS-2026-000002 satırları' });
  const row = within(table).getAllByRole('row')[1];
  expect(row).toHaveTextContent('GIDA-0001 - Ayçiçek Yağı');
  expect(row).toHaveTextContent('3 KOLİ');
  expect(row).toHaveTextContent('= 36 ADT');
  expect(row).toHaveTextContent('120,00 ₺');
  expect(row).toHaveTextContent('%10');
  expect(row).toHaveTextContent('−36,00 ₺');
  expect(row).toHaveTextContent('324,00 ₺');
  expect(row).toHaveTextContent('Adet başı 9,00 ₺');
  expect(row).toHaveTextContent('388,80 ₺');
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/purchases/6`, expect.objectContaining({ method: 'GET' }));

  // Tekrar tıklayınca kapanır
  fireEvent.click(within(listRows()[0]).getByRole('button', { name: 'Ürünleri gizle' }));
  await waitFor(() =>
    expect(screen.queryByRole('table', { name: 'ALS-2026-000002 satırları' })).not.toBeInTheDocument()
  );
});

test('Yeni Alış: ürün seçilir, birim değişince fiyat çarpanla önerilir, toplamlar hesaplanır ve kaydedilir', async () => {
  await openNew();
  expect(screen.getByLabelText(/Tarih/)).toHaveValue(todayIso());

  const row1 = lines()[0];
  await pickProduct(row1, 'ayçiçek', 'GIDA-0001 - Ayçiçek Yağı');
  // Temel birim, miktar 1 ve son alış fiyatı önerisi
  expect(field(row1, 'combobox', 'Birim')).toHaveTextContent('ADT');
  expect(field(row1, 'spinbutton', 'Miktar')).toHaveValue(1);
  expect(field(row1, 'spinbutton', /Birim Fiyat/)).toHaveValue(10);
  // Doldurulan satırın altına boş satır açılır
  expect(lines()).toHaveLength(2);

  await pickUnit(row1, 'KOLİ ×12');
  expect(field(row1, 'spinbutton', /Birim Fiyat/)).toHaveValue(120);
  fireEvent.change(field(row1, 'spinbutton', 'Miktar'), { target: { value: '3' } });
  fireEvent.change(field(row1, 'spinbutton', /İsk/), { target: { value: '10' } });
  expect(row1).toHaveTextContent('= 36 ADT');
  expect(row1).toHaveTextContent('%20');
  expect(row1).toHaveTextContent('324,00');
  expect(row1).toHaveTextContent('388,80');
  // Alış fiyatının altında adet başı fiyat: 324 / 36 Adet
  expect(row1).toHaveTextContent('Adet başı 9,00 ₺');

  const row2 = lines()[1];
  await pickProduct(row2, 'TE-', 'TE-0001 - Deterjan');
  // Son alış fiyatı yoksa fiyat boş gelir
  expect(field(row2, 'spinbutton', /Birim Fiyat/)).toHaveValue(null);
  fireEvent.change(field(row2, 'spinbutton', 'Miktar'), { target: { value: '2' } });
  fireEvent.change(field(row2, 'spinbutton', /Birim Fiyat/), { target: { value: '50' } });
  expect(row2).toHaveTextContent('Adet başı 50,00 ₺');

  expect(total('Ara Toplam')).toBe('460,00 ₺');
  expect(total('İskonto')).toBe('−36,00 ₺');
  expect(total('Net Toplam')).toBe('424,00 ₺');
  expect(total('KDV %10')).toBe('10,00 ₺');
  expect(total('KDV %20')).toBe('64,80 ₺');
  expect(total('Genel Toplam')).toBe('498,80 ₺');

  fireEvent.change(screen.getByRole('combobox', { name: 'Tedarikçi' }), { target: { value: 'Akın Gıda' } });
  fireEvent.change(screen.getByLabelText('Fatura No'), { target: { value: 'F-200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Alış belgesi ALS-2026-000003 oluşturuldu ve stoğa işlendi')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'POST');
  // Boş satır gönderilmez; KDV ve toplamlar backend'de hesaplanır
  expect(JSON.parse(options.body)).toEqual({
    documentDate: todayIso(),
    supplierName: 'Akın Gıda',
    invoiceNo: 'F-200',
    description: null,
    lines: [
      { productId: 1, unitId: 7, quantity: 3, unitPrice: 120, discountRate: 10 },
      { productId: 2, unitId: 6, quantity: 2, unitPrice: 50, discountRate: null },
    ],
  });
  // Kayıttan sonra listeye dönülür
  expect(await screen.findByRole('button', { name: 'Yeni Alış' })).toBeInTheDocument();
  // jsdom'da iki satırlık tam fiş girişi (çok sayıda MUI alanı) 30 sn'yi aşabiliyor; takılma değil, yavaşlık
}, 120000);

test('koli barkodu okutulunca ürün ve Koli birimi birlikte seçilir', async () => {
  await openNew();
  const row = lines()[0];
  await pickProduct(row, '8690001-K', 'GIDA-0001 - Ayçiçek Yağı');
  expect(field(row, 'combobox', 'Birim')).toHaveTextContent('KOLİ ×12');
  expect(field(row, 'spinbutton', /Birim Fiyat/)).toHaveValue(120);
});

test('doğrulama: satırsız fiş ve kartında KDV olmayan ürün kaydedilmez', async () => {
  await openNew();

  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(screen.getByText('En az bir satır girilmelidir')).toBeInTheDocument();

  await pickProduct(lines()[0], 'boya', 'BO-0001 - Boya');
  fireEvent.change(field(lines()[0], 'spinbutton', /Birim Fiyat/), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(screen.getByText('Ürün kartında KDV oranı tanımlı değil')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(`${BASE}/purchases`, expect.objectContaining({ method: 'POST' }));
});

test('kilitli fiş: uyarı gösterilir, satırlar salt okunur; başlık düzeltmesi gönderilir', async () => {
  await openPurchasePage();
  fireEvent.click(screen.getAllByRole('button', { name: 'Düzenle' })[0]); // ALS-2026-000002

  expect(await screen.findByRole('heading', { name: 'Alış Fişi ALS-2026-000002' })).toBeInTheDocument();
  expect(screen.getByText(/31.10.2026 tarihinde çıkış yapılmış/)).toBeInTheDocument();
  expect(lines()).toHaveLength(1); // kilitliyken boş satır açılmaz
  const row = lines()[0];
  expect(field(row, 'combobox', 'Ürün')).toBeDisabled();
  expect(field(row, 'spinbutton', 'Miktar')).toBeDisabled();
  expect(screen.getByLabelText(/Tarih/)).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Satır Ekle' })).not.toBeInTheDocument();
  expect(total('Genel Toplam')).toBe('388,80 ₺');

  fireEvent.change(screen.getByLabelText('Fatura No'), { target: { value: 'F-9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Alış belgesi güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/purchases/6`);
  expect(JSON.parse(options.body)).toMatchObject({
    documentDate: '2026-10-30',
    invoiceNo: 'F-9',
    lines: [{ productId: 1, unitId: 7, quantity: 3, unitPrice: 120, discountRate: 10 }],
  });
});

test('kaydedilmemiş değişiklikle listeye dönerken onay istenir', async () => {
  await openNew();
  await pickProduct(lines()[0], 'TE-', 'TE-0001 - Deterjan');

  fireEvent.click(screen.getByRole('button', { name: 'Listeye dön' }));
  expect(screen.getByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Evet, çık' }));

  expect(await screen.findByRole('button', { name: 'Yeni Alış' })).toBeInTheDocument();
});

test('Sil: onay penceresinden sonra fiş pasife alınır', async () => {
  await openPurchasePage();
  fireEvent.click(screen.getAllByRole('button', { name: 'Sil' })[1]); // ALS-2026-000001

  expect(screen.getByRole('dialog', { name: 'Alış Fişi Sil' })).toHaveTextContent(
    '"ALS-2026-000001" fişi pasife alınacak ve stok hareketleri geri alınacak. Emin misiniz?'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Evet, Sil' }));

  expect(await screen.findByText('Alış belgesi pasife alındı, stok hareketleri geri alındı')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/purchases/5/deactivate`, expect.objectContaining({ method: 'PATCH' }));
});
