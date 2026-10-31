import { request } from './client';

const PATH = '/api/categories';

export async function getCategories() {
  const res = await request(PATH);
  return res?.data ?? [];
}

export async function getCategory(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

export function createCategory(category) {
  return request(PATH, { method: 'POST', body: category });
}

export function updateCategory(id, category) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: category });
}

// Backend kalıcı silme yapmaz; kaydı pasife alır ve listeden düşer
export function deleteCategory(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
