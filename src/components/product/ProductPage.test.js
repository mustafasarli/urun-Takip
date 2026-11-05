import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider } from '../../auth/testAuth';
import theme from '../../theme';

const BASE = 'http://localhost:8080/api';

const CATEGORIES = [
  { id: 1, name: 'Gıda', shortName: 'GI', status: true },
  { id: 2, name: 'Temizlik', shortName: 'TE', status: true },
  { id: 3, name: 'Boya', shortName: null, status: true }, // kısa adı tanımlanmamış eski kategori
];
const UNITS = [
  { id: 10, unitCode: 'ADT', unitName: 'Adet', status: true },
  { id: 11, unitCode: 'KG', unitName: 'Kilogram', status: true },
  { id: 12, unitCode: 'KOLİ', unitName: 'Koli', status: true },
  { id: 13, unitCode: 'PLT', unitName: 'Palet', status: true },
];
const PRODUCTS = [
  {
    id: 100, productCode: 'GI-0002', productName: 'Zeytinyağı 1 lt', barcode: '8690000000001',
    categoryId: 1, categoryName: 'Gıda', unitId: 10, unitCode: 'ADT', unitName: 'Adet',
    minStockLevel: 1250.5, description: 'Sızma',
    vatRate: 1, lastPurchasePrice: 1234.5, profitMargin: 12.5,
    units: [{ id: 1, unitId: 12, unitCode: 'KOLİ', unitName: 'Koli', multiplier: 12, barcode: '8690000000099' }],
  },
  {
    id: 101, productCode: 'GI-0001', productName: 'Deterjan', barcode: null,
    categoryId: 2, categoryName: 'Temizlik', unitId: 11, unitCode: 'KG', unitName: 'Kilogram',
    minStockLevel: null, description: null,
    vatRate: 20, lastPurchasePrice: null, profitMargin: null,
    units: [],
  },
];
const NEXT_CODES = { 1: 'GI-0003', 2: 'TE-0001' };

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    const nextCode = url.match(/\/products\/next-code\?categoryId=(\d+)$/);
    if (method === 'GET' && nextCode) return json({ data: NEXT_CODES[nextCode[1]] });
    if (method === 'GET' && url === `${BASE}/products`) return json({ data: PRODUCTS });
    if (method === 'GET' && url === `${BASE}/categories`) return json({ data: CATEGORIES });
    if (method === 'GET' && url === `${BASE}/units`) return json({ data: UNITS });
    if (method === 'POST') return json({ message: 'Ürün başarıyla oluşturuldu' }, 201);
    if (method === 'PUT') return json({ message: 'Ürün güncellendi' });
    if (method === 'PATCH') return json({ message: 'Ürün pasife alındı' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openProductPage() {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ürün Tanımları' }));
  await screen.findByText('Deterjan');
}

const dataRows = () => screen.getAllByRole('row').slice(1);
const codeField = () => screen.getByLabelText('Ürün Kodu');

async function choose(label, option, container = document.body) {
  fireEvent.mouseDown(within(container).getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
  // Menü kapanınca (portal DOM'dan kalkınca) devam edilir
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

const unitRow = (n) => screen.getByRole('group', { name: `${n}. ek birim` });

test('ürünler listelenir; KDV, son alış ve kâr oranı Türkçe biçimde gösterilir', async () => {
  await openProductPage();

  expect(screen.getByRole('heading', { name: 'Ürün Tanımları' })).toBeInTheDocument();
  // Varsayılan sıralama: Ürün Kodu artan
  expect(dataRows()[0]).toHaveTextContent('GI-0001');

  const zeytinyagi = dataRows()[1];
  expect(zeytinyagi).toHaveTextContent('Gıda');
  expect(zeytinyagi).toHaveTextContent('ADT');
  expect(zeytinyagi).toHaveTextContent('1.250,5'); // Türkçe sayı biçimi
  expect(zeytinyagi).toHaveTextContent('Sızma');
  expect(zeytinyagi).toHaveTextContent('%1');
  expect(zeytinyagi).toHaveTextContent('1.234,50 ₺');
  expect(zeytinyagi).toHaveTextContent('%12,5');
  expect(dataRows()[0]).toHaveTextContent('%20');
  expect(zeytinyagi).toHaveTextContent('KOLİ ×12');

  // Ek birim, barkod, son alış, kâr oranı, minimum stok ve açıklama boş
  expect(within(dataRows()[0]).getAllByText('—')).toHaveLength(6);
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 2 kayıt');
});

test('Min. Stok sayısal sıralanır, boşlar sonda kalır', async () => {
  await openProductPage();

  fireEvent.click(screen.getByRole('button', { name: /Min\. Stok/ }));
  expect(dataRows()[0]).toHaveTextContent('Zeytinyağı');
  fireEvent.click(screen.getByRole('button', { name: /Min\. Stok/ }));
  expect(dataRows()[0]).toHaveTextContent('Zeytinyağı');
  expect(dataRows()[1]).toHaveTextContent('Deterjan');
});

test('Ürün kodu elle girilemez; kategori seçilince sıradaki kod gösterilir', async () => {
  await openProductPage();

  expect(codeField()).toHaveAttribute('readonly');
  expect(codeField()).toHaveValue('');
  expect(screen.getByText('Kategori seçince oluşur')).toBeInTheDocument();

  await choose(/Kategori/, 'Gıda (GI)');
  await waitFor(() => expect(codeField()).toHaveValue('GI-0003'));
  expect(screen.getByText('Kaydedince atanır')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    `${BASE}/products/next-code?categoryId=1`,
    expect.objectContaining({ method: 'GET' })
  );

  // Kategori değişince kod da değişir
  await choose(/Kategori/, 'Temizlik (TE)');
  await waitFor(() => expect(codeField()).toHaveValue('TE-0001'));
});

test('kısa adı tanımsız kategori yeni üründe seçilemez', async () => {
  await openProductPage();

  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Kategori/ }));
  const boya = await screen.findByRole('option', { name: 'Boya — kısa ad tanımsız' });
  expect(boya).toHaveAttribute('aria-disabled', 'true');
});

test('Ekle: zorunlu alanlar kontrol edilir; POST isteğinde ürün kodu gönderilmez', async () => {
  await openProductPage();

  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText('Ürün adı boş olamaz')).toBeInTheDocument();
  expect(screen.getByText('Kategori seçilmelidir')).toBeInTheDocument();
  expect(screen.getByText('Birim seçilmelidir')).toBeInTheDocument();
  expect(screen.getByText('KDV oranı boş olamaz')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(`${BASE}/products`, expect.objectContaining({ method: 'POST' }));

  fireEvent.change(screen.getByLabelText(/Ürün Adı/), { target: { value: 'Pirinç' } });
  await choose(/Kategori/, 'Gıda (GI)');
  await choose(/Temel Birim/, 'KG - Kilogram');
  fireEvent.change(screen.getByLabelText(/Minimum Stok/), { target: { value: '12.5' } });

  // Ek birim: Palet = 480 Kilogram
  fireEvent.click(screen.getByRole('button', { name: 'Birim Ekle' }));
  await choose(/Birim/, 'PLT - Palet', unitRow(1));
  fireEvent.change(within(unitRow(1)).getByLabelText(/Çarpan/), { target: { value: '480' } });
  expect(unitRow(1)).toHaveTextContent('1 Palet = 480 Kilogram');

  // KDV 100'ü geçemez
  fireEvent.change(screen.getByLabelText(/KDV Oranı/), { target: { value: '120' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText("KDV oranı 100'den büyük olamaz")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/KDV Oranı/), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText(/Son Alış Fiyatı/), { target: { value: '45.90' } });
  fireEvent.change(screen.getByLabelText(/Kâr Oranı/), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

  expect(await screen.findByText('Ürün başarıyla oluşturuldu')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'POST');
  expect(JSON.parse(options.body)).toEqual({
    productName: 'Pirinç',
    barcode: null,
    description: null,
    categoryId: 1,
    unitId: 11,
    minStockLevel: 12.5,
    vatRate: 10,
    lastPurchasePrice: 45.9,
    profitMargin: 25,
    units: [{ unitId: 13, multiplier: 480, barcode: null }],
  });

  // Kayıttan sonra form ve ek birim satırları temizlenir
  await waitFor(() => expect(screen.queryByRole('group', { name: '1. ek birim' })).not.toBeInTheDocument());
});

test('Düzenle: mevcut ürün kodu gösterilir ve değiştirilemez; PUT isteği gider', async () => {
  await openProductPage();

  fireEvent.click(screen.getAllByRole('button', { name: 'Düzenle' })[1]); // GI-0002
  expect(screen.getByRole('heading', { name: 'Ürün Güncelle' })).toBeInTheDocument();
  expect(codeField()).toHaveValue('GI-0002');
  expect(codeField()).toHaveAttribute('readonly');
  expect(screen.getByText('Ürün kodu değiştirilemez')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /Kategori/ })).toHaveTextContent('Gıda (GI)');
  expect(screen.getByRole('combobox', { name: /Temel Birim/ })).toHaveTextContent('ADT - Adet');
  // Kayıtlı ek birim satırı dolu gelir
  expect(within(unitRow(1)).getByRole('combobox', { name: /Birim/ })).toHaveTextContent('KOLİ - Koli');
  expect(within(unitRow(1)).getByLabelText(/Çarpan/)).toHaveValue(12);
  expect(within(unitRow(1)).getByLabelText(/Barkod/)).toHaveValue('8690000000099');
  expect(unitRow(1)).toHaveTextContent('1 Koli = 12 Adet');
  // Düzenlemede kod ön izlemesi istenmez
  expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('next-code'), expect.anything());

  expect(screen.getByLabelText(/KDV Oranı/)).toHaveValue(1);
  expect(screen.getByLabelText(/Son Alış Fiyatı/)).toHaveValue(1234.5);
  expect(screen.getByLabelText(/Kâr Oranı/)).toHaveValue(12.5);

  fireEvent.change(screen.getByLabelText(/Minimum Stok/), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText(/Kâr Oranı/), { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));

  expect(await screen.findByText('Ürün güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/products/100`);
  expect(JSON.parse(options.body)).toEqual({
    productName: 'Zeytinyağı 1 lt',
    barcode: '8690000000001',
    description: 'Sızma',
    categoryId: 1,
    unitId: 10,
    minStockLevel: 30,
    vatRate: 1,
    lastPurchasePrice: 1234.5,
    profitMargin: 15,
    units: [{ unitId: 12, multiplier: 12, barcode: '8690000000099' }],
  });
});

test('Ek birimler: temel birim listede çıkmaz, çarpan 1 olamaz, satır kaldırılabilir', async () => {
  await openProductPage();
  await choose(/Temel Birim/, 'ADT - Adet');

  fireEvent.click(screen.getByRole('button', { name: 'Birim Ekle' }));
  fireEvent.mouseDown(within(unitRow(1)).getByRole('combobox', { name: /Birim/ }));
  const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
  expect(options).not.toContain('ADT - Adet');
  fireEvent.click(screen.getByRole('option', { name: 'KOLİ - Koli' }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

  // İkinci satırda birinci satırda seçilen birim de çıkmaz
  fireEvent.click(screen.getByRole('button', { name: 'Birim Ekle' }));
  fireEvent.mouseDown(within(unitRow(2)).getByRole('combobox', { name: /Birim/ }));
  const options2 = (await screen.findAllByRole('option')).map((o) => o.textContent);
  expect(options2).not.toContain('KOLİ - Koli');
  expect(options2).not.toContain('ADT - Adet');
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

  fireEvent.change(within(unitRow(1)).getByLabelText(/Çarpan/), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText(/Ürün Adı/), { target: { value: 'Su' } });
  await choose(/Kategori/, 'Gıda (GI)');
  fireEvent.change(screen.getByLabelText(/KDV Oranı/), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

  expect(within(unitRow(1)).getByText('Çarpan 1 olamaz')).toBeInTheDocument();
  expect(within(unitRow(2)).getByText('Birim seçilmelidir')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(`${BASE}/products`, expect.objectContaining({ method: 'POST' }));

  // Boş satır kaldırılır
  fireEvent.click(within(unitRow(2)).getByRole('button', { name: 'Birimi kaldır' }));
  expect(screen.queryByRole('group', { name: '2. ek birim' })).not.toBeInTheDocument();
});

test('Düzenlemede temel birim değişirse uyarı gösterilir', async () => {
  await openProductPage();
  fireEvent.click(screen.getAllByRole('button', { name: 'Düzenle' })[1]); // GI-0002, temel birim Adet + Koli ×12

  expect(screen.queryByText(/Temel birim değişti/)).not.toBeInTheDocument();
  await choose(/Temel Birim/, 'KG - Kilogram');
  expect(screen.getByText(/Temel birim değişti/)).toHaveTextContent('Kilogram');
  expect(unitRow(1)).toHaveTextContent('1 Koli = 12 Kilogram');
});

test('Sil: onay penceresi açılır; "Evet, Sil" ile PATCH isteği gider', async () => {
  await openProductPage();

  fireEvent.click(screen.getAllByRole('button', { name: 'Sil' })[0]); // GI-0001
  expect(screen.getByRole('dialog', { name: 'Ürün Sil' })).toHaveTextContent(
    '"GI-0001 - Deterjan" ürününü silmek istediğinize emin misiniz?'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Evet, Sil' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products/101/deactivate`, expect.objectContaining({ method: 'PATCH' }));
});
