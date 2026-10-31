import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import theme from '../../theme';

const API = 'http://localhost:8080/api/units';

const UNITS = [
  { id: 1, unitCode: 'KG', unitName: 'Kilogram', status: true },
  { id: 2, unitCode: 'ADT', unitName: 'Adet', status: true },
];

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET') return json({ success: true, data: UNITS });
    if (method === 'POST') return json({ success: true, message: 'Birim başarıyla oluşturuldu' }, 201);
    if (method === 'PUT') return json({ success: true, message: 'Birim güncellendi' });
    if (method === 'PATCH') return json({ success: true, message: 'Birim pasife alındı' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openUnitPage() {
  render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Birim Tanımları' }));
  await screen.findByText('Kilogram');
}

const dataRows = () => screen.getAllByRole('row').slice(1);

test('menüden Tanımlar » Birim Tanımları seçilince birimler backend’den listelenir', async () => {
  await openUnitPage();

  expect(screen.getByRole('heading', { name: 'Birim Tanımları' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(API, expect.objectContaining({ method: 'GET' }));

  // Varsayılan sıralama: Birim Kodu artan
  expect(dataRows()[0]).toHaveTextContent('ADT');
  expect(dataRows()[1]).toHaveTextContent('KG');
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 2 kayıt');

  fireEvent.click(screen.getByRole('button', { name: /Birim Adı/ }));
  expect(dataRows()[0]).toHaveTextContent('Adet');
  fireEvent.click(screen.getByRole('button', { name: /Birim Adı/ }));
  expect(dataRows()[0]).toHaveTextContent('Kilogram');
});

test('Ekle: kod ve ad zorunludur; doldurulunca POST isteği gider', async () => {
  await openUnitPage();

  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText('Birim kodu boş olamaz')).toBeInTheDocument();
  expect(screen.getByText('Birim adı boş olamaz')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(API, expect.objectContaining({ method: 'POST' }));

  fireEvent.change(screen.getByLabelText(/Birim Kodu/), { target: { value: ' LT ' } });
  fireEvent.change(screen.getByLabelText(/Birim Adı/), { target: { value: 'Litre' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

  expect(await screen.findByText('Birim başarıyla oluşturuldu')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    API,
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ unitCode: 'LT', unitName: 'Litre' }) })
  );
});

test('Düzenle: kayıt forma yüklenir, Güncelle ile PUT isteği gider', async () => {
  await openUnitPage();

  // Sıralı listede ilk satır ADT - Adet (id 2)
  fireEvent.click(screen.getAllByRole('button', { name: 'Düzenle' })[0]);
  expect(screen.getByRole('heading', { name: 'Birim Güncelle' })).toBeInTheDocument();
  expect(screen.getByLabelText(/Birim Kodu/)).toHaveValue('ADT');
  expect(screen.getByLabelText(/Birim Adı/)).toHaveValue('Adet');

  fireEvent.change(screen.getByLabelText(/Birim Adı/), { target: { value: 'Adet (Tane)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));

  expect(await screen.findByText('Birim güncellendi')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    `${API}/2`,
    expect.objectContaining({ method: 'PUT', body: JSON.stringify({ unitCode: 'ADT', unitName: 'Adet (Tane)' }) })
  );
  // Güncellemeden sonra form "Yeni Birim" moduna döner
  expect(screen.getByRole('heading', { name: 'Yeni Birim' })).toBeInTheDocument();
});

test('Sil: onay penceresi açılır; "Evet, Sil" ile PATCH isteği gider', async () => {
  await openUnitPage();

  fireEvent.click(screen.getAllByRole('button', { name: 'Sil' })[1]); // KG - Kilogram (id 1)
  expect(screen.getByRole('dialog', { name: 'Birim Sil' })).toHaveTextContent(
    '"KG - Kilogram" birimini silmek istediğinize emin misiniz?'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Evet, Sil' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith(`${API}/1/deactivate`, expect.objectContaining({ method: 'PATCH' }));
  expect(await screen.findByText('Birim pasife alındı')).toBeInTheDocument();
});
