import { request } from './client';

const PATH = '/api/purchases';

// Filtreler isteğe bağlı: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', supplier: 'metin' }
export async function getPurchases({ from, to, supplier } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (supplier && supplier.trim()) params.set('supplier', supplier.trim());
  const query = params.toString();
  const res = await request(query ? `${PATH}?${query}` : PATH);
  return res?.data ?? [];
}

// Satırlar, kilit durumu (locked, lockReason) dahil
export async function getPurchase(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

// Tedarikçi alanında öneri için daha önce girilmiş adlar
export async function getSupplierNames() {
  const res = await request(`${PATH}/suppliers`);
  return res?.data ?? [];
}

// Kaydedilince stoğa işlenir; belge no ve toplamlar backend'de üretilir
export function createPurchase(purchase) {
  return request(PATH, { method: 'POST', body: purchase });
}

export function updatePurchase(id, purchase) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: purchase });
}

// Kalıcı silme yok: fiş pasife alınır ve stok hareketleri geri alınır
export function deletePurchase(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
