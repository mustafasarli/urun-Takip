import { request } from './client';

// { token, expiresAt, user } döner; hatalı giriş/kilitli hesapta ApiError (401)
export async function login(username, password) {
  const res = await request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
  return res?.data;
}

export async function getMe() {
  const res = await request('/api/auth/me');
  return res?.data;
}

// Yeni token döner (eski oturumlar kapanır)
export async function changePassword(currentPassword, newPassword) {
  const res = await request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
  return res?.data;
}
