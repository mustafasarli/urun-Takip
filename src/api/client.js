// Backend'e istek atan ortak yardımcı.
// Backend adresi .env dosyasındaki REACT_APP_API_URL'den okunur (değişince npm start yeniden başlatılmalı).
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Backend hata yanıtını (ErrorResponse) taşıyan hata sınıfı
export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || {};
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Backend çalışıyor mu?', 0);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `İstek başarısız oldu (${response.status})`,
      response.status,
      payload?.errors
    );
  }

  // Başarılı yanıtlar ApiResponse zarfıyla gelir: { success, message, url, data, timestamp }
  return payload;
}
