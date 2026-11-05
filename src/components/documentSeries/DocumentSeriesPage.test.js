import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider } from '../../auth/testAuth';
import theme from '../../theme';

const BASE = 'http://localhost:8080/api';
const YEAR = new Date().getFullYear();

const SERIES = [
  { documentType: 'PURCHASE', label: 'Alış Fişi', prefix: 'ALS', yearly: true, digits: 6, lastNumber: 2, lastUsed: `ALS-${YEAR}-000002`, nextNumber: 3, example: `ALS-${YEAR}-000003` },
  { documentType: 'ISSUE', label: 'Çıkış Fişi', prefix: 'CKS', yearly: true, digits: 6, lastNumber: 1, lastUsed: `CKS-${YEAR}-000001`, nextNumber: 2, example: `CKS-${YEAR}-000002` },
  { documentType: 'PURCHASE_RETURN', label: 'Alış İade', prefix: 'AIF', yearly: true, digits: 6, lastNumber: 1, lastUsed: `AIF-${YEAR}-000001`, nextNumber: 2, example: `AIF-${YEAR}-000002` },
  { documentType: 'SALES_RETURN', label: 'Satış İade', prefix: 'SIF', yearly: true, digits: 6, lastNumber: 0, lastUsed: null, nextNumber: 1, example: `SIF-${YEAR}-000001` },
];

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET' && url === `${BASE}/document-series`) return json({ data: SERIES });
    if (method === 'PUT') return json({ message: 'Alış Fişi belge no tanımı güncellendi' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openPage() {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Belge No Tanımları' }));
  await screen.findByText('Alış Fişi');
}

const rows = () => within(screen.getByRole('table', { name: 'Belge no tanımları' })).getAllByRole('row').slice(1);

async function editPurchase() {
  await openPage();
  fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Düzenle' }));
  await screen.findByRole('heading', { name: 'Alış Fişi — Belge No Tanımı' });
}

test('her fiş türü için ön ek, son kullanılan ve sıradaki numara listelenir', async () => {
  await openPage();
  expect(rows()).toHaveLength(4);
  expect(rows()[0]).toHaveTextContent('ALS');
  expect(rows()[0]).toHaveTextContent(`ALS-${YEAR}-000002`);
  expect(rows()[0]).toHaveTextContent(`ALS-${YEAR}-000003`);
  expect(rows()[3]).toHaveTextContent('Satış İade');
  expect(rows()[3]).toHaveTextContent('—'); // henüz fiş yok
});

test('sıradaki numara geri alınamaz; ileri alınınca PUT ile gönderilir ve örnek güncellenir', async () => {
  await editPurchase();
  expect(screen.getByLabelText('Örnek')).toHaveValue(`ALS-${YEAR}-000003`);

  fireEvent.change(screen.getByLabelText('Sıradaki No'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  expect(screen.getByText(`En az 3 olmalı (ALS-${YEAR}-000002 kullanıldı)`)).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'PUT' }));

  fireEvent.change(screen.getByLabelText('Sıradaki No'), { target: { value: '100' } });
  expect(screen.getByLabelText('Örnek')).toHaveValue(`ALS-${YEAR}-000100`);
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));

  expect(await screen.findByText('Alış Fişi belge no tanımı güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/document-series/PURCHASE`);
  expect(JSON.parse(options.body)).toEqual({ prefix: 'ALS', yearly: true, digits: 6, nextNumber: 100 });
});

test('ön ek Türkçe büyük harfe çevrilir; yıl ve hane değişikliği örneğe yansır; numara değişmediyse gönderilmez', async () => {
  await editPurchase();

  fireEvent.change(screen.getByLabelText(/Ön Ek/), { target: { value: 'al iş' } });
  expect(screen.getByLabelText(/Ön Ek/)).toHaveValue('ALİŞ');
  expect(screen.getByText(/yalnızca yeni fişlere uygulanır/)).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/Numaraya yıl ekle/));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Hane' }));
  fireEvent.click(await screen.findByRole('option', { name: '4' }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Sıradaki No'), { target: { value: '' } });
  expect(screen.getByLabelText('Örnek')).toHaveValue('ALİŞ-0001');

  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  await screen.findByText('Alış Fişi belge no tanımı güncellendi');
  const [, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  // Sıradaki No boş: yeni ön ekin sayacından devam edilir, nextNumber gönderilmez
  expect(JSON.parse(options.body)).toEqual({ prefix: 'ALİŞ', yearly: false, digits: 4 });
});
