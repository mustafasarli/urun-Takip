import { request } from './client';

const PATH = '/api/units';

export async function getUnits() {
  const res = await request(PATH);
  return res?.data ?? [];
}

export async function getUnit(id) {
  const res = await request(`${PATH}/${id}`);
  return res?.data;
}

export function createUnit(unit) {
  return request(PATH, { method: 'POST', body: unit });
}

export function updateUnit(id, unit) {
  return request(`${PATH}/${id}`, { method: 'PUT', body: unit });
}

// Backend kalıcı silme yapmaz; kaydı pasife alır ve listeden düşer
export function deleteUnit(id) {
  return request(`${PATH}/${id}/deactivate`, { method: 'PATCH' });
}
