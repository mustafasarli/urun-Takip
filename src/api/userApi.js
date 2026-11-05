import { request } from './client';

// Kullanıcı Tanımları (yalnızca admin)
const PATH = '/api/users';

export async function getUsers() {
  const res = await request(PATH);
  return res?.data ?? [];
}

// { username, fullName, role, permissions, password }
export function createUser(user) {
  return request(PATH, { method: 'POST', body: user });
}

// { fullName, role, permissions }
export function updateUser(id, user) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: user });
}

export function resetUserPassword(id, newPassword) {
  return request(`${PATH}/${id}/reset-password`, { method: 'POST', body: { newPassword } });
}

export function deleteUser(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
