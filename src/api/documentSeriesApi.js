import { request } from './client';

const PATH = '/api/document-series';

// Her fiş türü için bir satır: ön ek, yıl, hane, son kullanılan ve sıradaki numara
export async function getDocumentSeries() {
  const res = await request(PATH);
  return res?.data ?? [];
}

// type: 'PURCHASE' | 'ISSUE' | 'PURCHASE_RETURN' | 'SALES_RETURN'
// data: { prefix, yearly, digits, nextNumber? } — nextNumber verilmezse sayaç değişmez
export function updateDocumentSeries(type, data) {
  return request(`${PATH}/${type}`, { method: 'PUT', body: data });
}
