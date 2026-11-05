import { request } from './client';

const PATH = '/api/stock-issues';

// Filtreler isteğe bağlı: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', customer: 'metin' }
export async function getIssues({ from, to, customer } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (customer && customer.trim()) params.set('customer', customer.trim());
  const query = params.toString();
  const res = await request(query ? `${PATH}?${query}` : PATH);
  return res?.data ?? [];
}

// Satırlar dahil
export async function getIssue(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

// Alıcı alanında öneri için daha önce girilmiş adlar
export async function getCustomerNames() {
  const res = await request(`${PATH}/customers`);
  return res?.data ?? [];
}

// Kaydedilince stoktan düşülür; stok yetersizse backend reddeder
export function createIssue(issue) {
  return request(PATH, { method: 'POST', body: issue });
}

export function updateIssue(id, issue) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: issue });
}

// Kalıcı silme yok: fiş pasife alınır ve ürünler stoğa geri eklenir
export function deleteIssue(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
