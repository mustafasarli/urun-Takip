// Oturum token'ı sessionStorage'da tutulur: sekme/tarayıcı kapanınca oturum kapanır.
// Depolama hiç kullanılamıyorsa (engellenmiş depolama vb.) yalnızca bellekte tutulur.
// Not: depolama çalışıyorsa bellekteki değere asla dönülmez; aksi halde temizlenen oturum geri gelir.
const KEY = 'urun-takip.token';
let memoryToken = null;

export function getToken() {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return memoryToken;
  }
}

export function setToken(token) {
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {
    memoryToken = token;
  }
}

export function clearToken() {
  memoryToken = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // yoksay
  }
}
