import { request } from './client';

const PATH = '/api/stocks';

// Aktif ürünlerin anlık stoğu (temel birimde), kategori ve ek birimlerle
export async function getStocks() {
  const res = await request(PATH);
  return res?.data ?? [];
}

// Ürünün stok hareketleri, yeniden eskiye
export async function getStockMovements(productId) {
  const res = await request(`${PATH}/${productId}/movements`);
  return res?.data ?? [];
}
