import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import { TestAuthProvider } from './auth/testAuth';
import theme from './theme';

// Gerçek uygulamadaki gibi tema (Türkçe çeviriler, varsayılan boyutlar) ile çizer
const renderApp = () =>
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider><App /></TestAuthProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({ success: true, data: [{ id: 1, name: 'İçecek', description: 'Soğuk içecekler', status: true }] })
        ),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openCategoryPage() {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori Tanımları' }));
  await screen.findByText('İçecek');
}

test('Sil onay penceresi açar; Vazgeç ile istek gönderilmez', async () => {
  await openCategoryPage();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));

  const dialog = screen.getByRole('dialog', { name: 'Kategori Sil' });
  expect(dialog).toHaveTextContent('"İçecek" kategorisini silmek istediğinize emin misiniz?');

  fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  // Pencere kapanış animasyonu bitince DOM'dan kalkar
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/deactivate'), expect.anything());
});

test('onay penceresinde "Evet, Sil" seçilince silme isteği gönderilir', async () => {
  await openCategoryPage();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Evet, Sil' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/categories/1/deactivate',
    expect.objectContaining({ method: 'PATCH' })
  );
});

test('Yenile listeyi backend’den tekrar çeker', async () => {
  await openCategoryPage();
  expect(global.fetch).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Yenile' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch).toHaveBeenLastCalledWith(
    'http://localhost:8080/api/categories',
    expect.objectContaining({ method: 'GET' })
  );
  expect(await screen.findByText('İçecek')).toBeInTheDocument();
});

test('başlığa tıklayınca Türkçe alfabeye göre sıralar, tekrar tıklayınca yön değişir', async () => {
  const rows = ['Zeytin', 'Şeker', 'ayran', 'Çay', 'Ilık', 'İçecek'].map((name, i) => ({ id: i + 1, name }));
  global.fetch.mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ data: rows })) })
  );

  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori Tanımları' }));
  await screen.findByText('Zeytin');

  const names = () =>
    screen
      .getAllByRole('row')
      .slice(1) // başlık satırı hariç
      .map((r) => r.querySelector('td').textContent);

  // Varsayılan: Kategori Adı artan
  expect(names()).toEqual(['ayran', 'Çay', 'Ilık', 'İçecek', 'Şeker', 'Zeytin']);

  fireEvent.click(screen.getByRole('button', { name: /Kategori Adı/ }));
  expect(names()).toEqual(['Zeytin', 'Şeker', 'İçecek', 'Ilık', 'Çay', 'ayran']);
});

test('Açıklama başlığına göre sıralar (boşlar sonda) ve alt satırda toplam kaydı gösterir', async () => {
  const rows = [
    { id: 1, name: 'A', description: 'Şişe' },
    { id: 2, name: 'B', description: null },
    { id: 3, name: 'C', description: 'çay' },
    { id: 4, name: 'D', description: 'Bal' },
  ];
  global.fetch.mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ data: rows })) })
  );

  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori Tanımları' }));
  await screen.findByText('Şişe');

  const descriptions = () =>
    screen
      .getAllByRole('row')
      .slice(1) // başlık satırı hariç
      .map((r) => r.querySelectorAll('td')[2].textContent); // Kategori Adı, Kısa Ad, Açıklama

  fireEvent.click(screen.getByRole('button', { name: /Açıklama/ }));
  expect(descriptions()).toEqual(['Bal', 'çay', 'Şişe', '—']);

  fireEvent.click(screen.getByRole('button', { name: /Açıklama/ }));
  expect(descriptions()).toEqual(['Şişe', 'çay', 'Bal', '—']);

  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 4 kayıt');
});

test('sayfalama: sayfa başına 10 kayıt, sonraki sayfaya geçilir; toplam sağda gösterilir', async () => {
  const rows = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: `Kategori ${i + 1}` }));
  global.fetch.mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ data: rows })) })
  );

  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori Tanımları' }));
  await screen.findByText('Kategori 1');

  const dataRows = () => screen.getAllByRole('row').slice(1);

  // Sayısal sıralama: "Kategori 2", "Kategori 10"dan önce gelir
  expect(dataRows()).toHaveLength(10);
  expect(dataRows()[0]).toHaveTextContent('Kategori 1');
  expect(dataRows()[9]).toHaveTextContent('Kategori 10');
  expect(screen.getByText(/Toplam:/)).toHaveTextContent('Toplam: 23 kayıt');

  expect(screen.getByText('1-10 / 23')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfaya git' }));
  expect(dataRows()).toHaveLength(10);
  expect(dataRows()[0]).toHaveTextContent('Kategori 11');

  fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfaya git' }));
  expect(dataRows()).toHaveLength(3);
  expect(dataRows()[2]).toHaveTextContent('Kategori 23');
});

test('Düzenle ve Sil ikon olarak gösterilir; üzerine gelince açıklama çıkar', async () => {
  await openCategoryPage();

  const editBtn = screen.getByRole('button', { name: 'Düzenle' });
  const deleteBtn = screen.getByRole('button', { name: 'Sil' });
  // Yazı yok, yalnızca ikon
  expect(editBtn).not.toHaveTextContent(/\S/);
  expect(deleteBtn).not.toHaveTextContent(/\S/);

  fireEvent.mouseOver(editBtn);
  expect(await screen.findByRole('tooltip', { name: 'Düzenle' })).toBeInTheDocument();

  fireEvent.mouseOver(deleteBtn);
  expect(await screen.findByRole('tooltip', { name: 'Sil' })).toBeInTheDocument();
});

test('Kısa Ad: zorunludur, Türkçe büyük harfe çevrilir ve kayıtta gönderilir', async () => {
  await openCategoryPage();

  // Kısa adı olmayan eski kategori listede uyarıyla görünür
  expect(screen.getByText('Tanımsız')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Kategori Adı/), { target: { value: 'Bitki Çayı' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText('Kısa ad boş olamaz')).toBeInTheDocument();

  // "bi ç" -> boşluk atılır, Türkçe büyük harf: "BİÇ"
  fireEvent.change(screen.getByLabelText(/Kısa Ad/), { target: { value: 'bi ç' } });
  expect(screen.getByLabelText(/Kısa Ad/)).toHaveValue('BİÇ');
  expect(screen.getByText('Ürün kodu: BİÇ-0001')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Kısa Ad/), { target: { value: 'b' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText('Kısa ad 2 ile 5 karakter arasında olmalıdır')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Kısa Ad/), { target: { value: 'bç' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/categories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Bitki Çayı', shortName: 'BÇ', description: null }),
      })
    )
  );
});

test('menüden Tanımlar » Kategori Tanımları seçilince kategori ekranı açılır', async () => {
  renderApp();

  // Başlangıçta hiçbir ekran açık değil ve backend'e istek atılmaz
  expect(screen.getByText('Soldaki menüden bir ekran seçin.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori Tanımları' }));

  expect(screen.getByRole('heading', { name: 'Kategori Tanımları' })).toBeInTheDocument();
  expect(await screen.findByText('İçecek')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8080/api/categories',
    expect.objectContaining({ method: 'GET' })
  );
});
