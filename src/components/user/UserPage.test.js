import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import { TestAuthProvider, TEST_ADMIN } from '../../auth/testAuth';
import theme from '../../theme';

const BASE = 'http://localhost:8080/api';

const USERS = [
  { id: 1, username: 'admin', fullName: 'Yönetici', role: 'ADMIN', permissions: [], mustChangePassword: false, locked: false, lastLoginAt: '2026-11-05T14:20:00' },
  { id: 2, username: 'ayse', fullName: 'Ayşe Yılmaz', role: 'USER', permissions: ['PURCHASES', 'STOCKS'], mustChangePassword: true, locked: true, lastLoginAt: null },
];

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

beforeEach(() => {
  global.fetch = jest.fn((url, { method } = {}) => {
    if (method === 'GET' && url === `${BASE}/users`) return json({ data: USERS });
    if (method === 'POST' && url === `${BASE}/users`) return json({ message: 'Kullanıcı "mehmet" oluşturuldu' }, 201);
    if (method === 'POST' && url.endsWith('/reset-password')) return json({ message: 'Şifre sıfırlandı; kullanıcı ilk girişinde değiştirecek' });
    if (method === 'PUT') return json({ message: 'Kullanıcı güncellendi' });
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

async function openPage(user = TEST_ADMIN) {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider user={user}>
        <App />
      </TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Kullanıcı Tanımları' }));
  await screen.findByText('Ayşe Yılmaz');
}

const rows = () => within(screen.getByRole('table', { name: 'Kullanıcı listesi' })).getAllByRole('row').slice(1);

test('Kullanıcı Tanımları yalnızca admine görünür', async () => {
  render(
    <ThemeProvider theme={theme}>
      <TestAuthProvider user={{ ...TEST_ADMIN, role: 'USER', permissions: ['CATEGORIES'] }}>
        <App />
      </TestAuthProvider>
    </ThemeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tanımlar/ }));
  expect(screen.getByRole('button', { name: 'Kategori Tanımları' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Kullanıcı Tanımları' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Birim Tanımları' })).not.toBeInTheDocument();
});

test('liste: rol, yetki özeti ve durum; admin kendini silemez', async () => {
  await openPage();
  const [admin, ayse] = rows();
  expect(admin).toHaveTextContent('(siz)');
  expect(admin).toHaveTextContent('Tümü');
  expect(within(admin).getByRole('button', { name: 'Sil' })).toBeDisabled();
  expect(ayse).toHaveTextContent('2 ekran');
  expect(ayse).toHaveTextContent('Kilitli');
  expect(ayse).toHaveTextContent('İlk giriş bekleniyor');
});

test('yeni kullanıcı: ekran yetkileri seçilir; Admin rolünde yetki kutuları kapanır', async () => {
  await openPage();

  fireEvent.change(screen.getByLabelText(/Kullanıcı Adı/), { target: { value: 'Mehmet' } });
  fireEvent.change(screen.getByLabelText(/Ad Soyad/), { target: { value: 'Mehmet Demir' } });
  fireEvent.change(screen.getByLabelText(/Geçici Şifre/), { target: { value: 'kisa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));
  expect(screen.getByText('En az 8 karakter; harf ve rakam içermeli')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Geçici Şifre/), { target: { value: 'Gecici123' } });
  fireEvent.click(screen.getByLabelText('Çıkış Fişi'));
  fireEvent.click(screen.getByLabelText('Stok Durumu'));

  // Admin seçilince tüm kutular işaretli ve kapalı
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rol' }));
  fireEvent.click(await screen.findByRole('option', { name: 'Admin' }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Birim Tanımları')).toBeChecked();
  expect(screen.getByLabelText('Birim Tanımları')).toBeDisabled();

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rol' }));
  fireEvent.click(await screen.findByRole('option', { name: 'Kullanıcı' }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

  expect(await screen.findByText('Kullanıcı "mehmet" oluşturuldu')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([u, o]) => u === `${BASE}/users` && o.method === 'POST');
  expect(JSON.parse(options.body)).toEqual({
    username: 'mehmet',
    fullName: 'Mehmet Demir',
    role: 'USER',
    permissions: ['ISSUES', 'STOCKS'],
    password: 'Gecici123',
  });
}, 120000);

test('düzenle: kullanıcı adı değişmez; kendi rolü değiştirilemez', async () => {
  await openPage();
  fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Düzenle' }));
  expect(screen.getByRole('heading', { name: 'Kullanıcı Güncelle' })).toBeInTheDocument();
  expect(screen.getByLabelText(/Kullanıcı Adı/)).toBeDisabled();
  expect(screen.getByText('Kendi rolünüzü değiştiremezsiniz')).toBeInTheDocument();

  fireEvent.click(within(rows()[1]).getByRole('button', { name: 'Düzenle' }));
  fireEvent.click(screen.getByLabelText('Alış Girişi')); // yetkiyi kaldır
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  expect(await screen.findByText('Kullanıcı güncellendi')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
  expect(url).toBe(`${BASE}/users/2`);
  expect(JSON.parse(options.body)).toEqual({ fullName: 'Ayşe Yılmaz', role: 'USER', permissions: ['STOCKS'] });
});

test('şifre sıfırlama: geçici şifre iki kez girilir ve gönderilir', async () => {
  await openPage();
  fireEvent.click(within(rows()[1]).getByRole('button', { name: 'Şifre Sıfırla' }));
  const dialog = screen.getByRole('dialog', { name: 'Şifre Sıfırla' });

  fireEvent.change(within(dialog).getByLabelText('Geçici Şifre'), { target: { value: 'Yeni12345' } });
  fireEvent.change(within(dialog).getByLabelText('Geçici Şifre (Tekrar)'), { target: { value: 'Farkli123' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Şifreyi Sıfırla' }));
  expect(within(dialog).getByText('Şifreler eşleşmiyor')).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText('Geçici Şifre (Tekrar)'), { target: { value: 'Yeni12345' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Şifreyi Sıfırla' }));
  expect(await screen.findByText('Şifre sıfırlandı; kullanıcı ilk girişinde değiştirecek')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls.find(([u]) => u.endsWith('/reset-password'));
  expect(url).toBe(`${BASE}/users/2/reset-password`);
  expect(JSON.parse(options.body)).toEqual({ newPassword: 'Yeni12345' });
});
