import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import App from '../App';
import theme from '../theme';
import { AuthProvider } from './AuthContext';

const BASE = 'http://localhost:8080/api';

const AYSE = {
  id: 2, username: 'ayse', fullName: 'Ayşe Yılmaz', role: 'USER',
  permissions: ['PURCHASES', 'STOCKS'], mustChangePassword: false,
};

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(body)) });

let loginUser;
beforeEach(() => {
  window.sessionStorage.clear();
  loginUser = AYSE;
  global.fetch = jest.fn((url, { method, body } = {}) => {
    if (url === `${BASE}/auth/login`) {
      const { password } = JSON.parse(body);
      return password === 'Dogru123'
        ? json({ data: { token: 'tkn-1', expiresAt: '2026-11-05T22:00:00Z', user: loginUser } })
        : json({ status: 401, message: 'Kullanıcı adı veya şifre hatalı' }, 401);
    }
    if (url === `${BASE}/auth/change-password`)
      return json({ data: { token: 'tkn-2', expiresAt: '2026-11-05T22:00:00Z', user: { ...loginUser, mustChangePassword: false } } });
    if (url.startsWith(`${BASE}/purchases`)) return json({ data: [] });
    if (url === `${BASE}/stocks`) return json({ status: 401, message: 'Oturum açmanız gerekiyor' }, 401);
    return json({}, 404);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

function renderApp() {
  render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

async function signIn(password = 'Dogru123') {
  fireEvent.change(screen.getByLabelText('Kullanıcı Adı'), { target: { value: 'ayse' } });
  fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
}

test('giriş yapmadan login ekranı açılır; hatalı şifrede mesaj gösterilir', async () => {
  renderApp();
  expect(screen.getByRole('heading', { name: 'Ürün Takip' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Ana menü' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
  expect(screen.getByText('Kullanıcı adı boş olamaz')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();

  await signIn('yanlis');
  expect(await screen.findByText('Kullanıcı adı veya şifre hatalı')).toBeInTheDocument();
  expect(screen.getByLabelText('Şifre')).toHaveValue('');
});

test('girişten sonra yalnızca yetkili ekranlar menüde görünür ve istekler token ile gider', async () => {
  renderApp();
  await signIn();

  const nav = await screen.findByRole('navigation', { name: 'Ana menü' });
  expect(nav).toHaveTextContent('Stok');
  expect(nav).not.toHaveTextContent('Tanımlar');
  expect(screen.getByRole('button', { name: /Kullanıcı menüsü: Ayşe Yılmaz/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^Stok$/ }));
  expect(screen.getByRole('button', { name: 'Alış Girişi' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stok Durumu' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Çıkış Fişi' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Alış Girişi' }));
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`${BASE}/purchases?`),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tkn-1' }) })
    )
  );
  // Giriş isteğine token eklenmez
  const [, loginOptions] = global.fetch.mock.calls.find(([u]) => u === `${BASE}/auth/login`);
  expect(loginOptions.headers.Authorization).toBeUndefined();
});

test('oturum düşerse (401) login ekranına dönülür ve bilgi verilir', async () => {
  renderApp();
  await signIn();
  fireEvent.click(await screen.findByRole('button', { name: /^Stok$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Stok Durumu' }));

  expect(await screen.findByText(/Oturumunuzun süresi doldu/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeInTheDocument();
  expect(window.sessionStorage.getItem('urun-takip.token')).toBeNull();
});

test('ilk girişte şifre değiştirilmeden ekranlar açılmaz', async () => {
  loginUser = { ...AYSE, mustChangePassword: true };
  renderApp();
  await signIn();

  expect(await screen.findByRole('heading', { name: 'Şifrenizi belirleyin' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Ana menü' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Mevcut Şifre'), { target: { value: 'Dogru123' } });
  fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'kisa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Şifreyi Kaydet ve Devam Et' }));
  expect(screen.getByText('En az 8 karakter; harf ve rakam içermeli')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'YeniSifre1' } });
  fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'YeniSifre1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Şifreyi Kaydet ve Devam Et' }));

  expect(await screen.findByRole('navigation', { name: 'Ana menü' })).toBeInTheDocument();
  expect(window.sessionStorage.getItem('urun-takip.token')).toBe('tkn-2');
});

test('Çıkış ile oturum kapanır', async () => {
  renderApp();
  await signIn();
  fireEvent.click(await screen.findByRole('button', { name: /Kullanıcı menüsü/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Çıkış' }));

  expect(await screen.findByRole('button', { name: 'Giriş Yap' })).toBeInTheDocument();
  expect(window.sessionStorage.getItem('urun-takip.token')).toBeNull();
});
