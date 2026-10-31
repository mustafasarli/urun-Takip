import { request } from './client';

const PATH = '/api/products';

export async function getProducts() {
  const res = await request(PATH);
  return res?.data ?? [];
}

export async function getProduct(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

// Seçilen kategori için sıradaki ürün kodu (örn. BO-0003). Asıl kod kayıtta backend'de atanır.
export async function getNextProductCode(categoryId) {
  const res = await request(`${PATH}/next-code?categoryId=${encodeURIComponent(categoryId)}`);
  return res?.data;
}

export function createProduct(product) {
  return request(PATH, { method: 'POST', body: product });
}

export function updateProduct(id, product) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: product });
}

// Backend kalıcı silme yapmaz; kaydı pasife alır ve listeden düşer
export function deleteProduct(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
