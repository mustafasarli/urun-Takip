// Backend'e istek atan ortak yardımcı.
// Backend adresi .env dosyasındaki REACT_APP_API_URL'den okunur (değişince npm start yeniden başlatılmalı).
import { getToken } from '../auth/tokenStore';

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

// Oturum süresi dolunca/geçersizleşince (401) çağrılır; AuthProvider login ekranına döndürür
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// `auth: false`: token eklenmez ve 401 oturumu kapatmaz (giriş isteği; 401 orada "şifre hatalı" demektir)
export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Backend çalışıyor mu?', 0);
  }

  if (response.status === 401 && auth && token && unauthorizedHandler) {
    unauthorizedHandler();
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
