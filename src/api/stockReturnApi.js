import { request } from './client';

const PATH = '/api/stock-returns';

// type: 'PURCHASE_RETURN' | 'SALES_RETURN'; filtreler isteğe bağlı: { from, to, party }
export async function getReturns(type, { from, to, party } = {}) {
  const params = new URLSearchParams({ type });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (party && party.trim()) params.set('party', party.trim());
  const res = await request(`${PATH}?${params.toString()}`);
  return res?.data ?? [];
}

export async function getReturn(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

// Kaynak fişin satırları ve iade edilebilir miktarlar; excludeReturnId: düzenlenen iade
export async function getReturnSource(type, documentId, excludeReturnId) {
  const params = new URLSearchParams({ type, documentId: String(documentId) });
  if (excludeReturnId) params.set('excludeReturnId', String(excludeReturnId));
  const res = await request(`${PATH}/source?${params.toString()}`);
  return res?.data;
}

export function createReturn(data) {
  return request(PATH, { method: 'POST', body: data });
}

export function updateReturn(id, data) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: data });
}

// Kalıcı silme yok: iade pasife alınır ve stok hareketleri geri alınır
export function deleteReturn(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
