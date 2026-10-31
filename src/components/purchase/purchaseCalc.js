// Alış fişi hesapları. Backend'deki PurchaseService.buildLines ile aynı formül ve yuvarlama (HALF_UP):
// tutar = miktar × birim fiyat → iskonto = tutar × oran → net = tutar − iskonto → KDV = net × KDV oranı.
// Ekrandaki değerler ön izlemedir; kayıtta backend yeniden hesaplar.

// Ondalık yuvarlama; 1.005 gibi kayan nokta hatalarına karşı üslü gösterimle yapılır
export function round(value, digits = 2) {
  return Number(`${Math.round(Number(`${value}e${digits}`))}e-${digits}`);
}

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

export function calcLine({ quantity, unitPrice, discountRate, vatRate }) {
  const qty = round(num(quantity), 3);
  const price = round(num(unitPrice), 4);
  const disc = round(num(discountRate), 2);
  const vat = num(vatRate);

  const lineAmount = round(qty * price);
  const discountAmount = round((lineAmount * disc) / 100);
  const netAmount = round(lineAmount - discountAmount);
  const vatAmount = round((netAmount * vat) / 100);
  return { lineAmount, discountAmount, netAmount, vatAmount, totalAmount: round(netAmount + vatAmount) };
}

// Fiş toplamları; KDV, faturayla karşılaştırma kolay olsun diye oran bazında da verilir
export function calcTotals(lines) {
  const totals = { subtotal: 0, discount: 0, net: 0, vat: 0, grand: 0, vatByRate: [] };
  const byRate = new Map();
  lines.forEach((l) => {
    const c = calcLine(l);
    totals.subtotal += c.lineAmount;
    totals.discount += c.discountAmount;
    totals.net += c.netAmount;
    totals.vat += c.vatAmount;
    const rate = num(l.vatRate);
    byRate.set(rate, (byRate.get(rate) ?? 0) + c.vatAmount);
  });
  ['subtotal', 'discount', 'net', 'vat'].forEach((k) => {
    totals[k] = round(totals[k]);
  });
  totals.grand = round(totals.net + totals.vat);
  totals.vatByRate = [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, amount]) => ({ rate, amount: round(amount) }));
  return totals;
}

const moneyFormat = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const rateFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export const formatMoney = (n) => moneyFormat.format(Number(n ?? 0));
export const formatQty = (n) => qtyFormat.format(Number(n ?? 0));
export const formatRate = (n) => `%${rateFormat.format(Number(n ?? 0))}`;

// 'YYYY-MM-DD' -> '30.10.2026'
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// Yerel saate göre (toISOString UTC'ye çevirip gece yarısı bir gün kaydırabilir)
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayIso = () => toIsoDate(new Date());

export function firstOfMonthIso() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}
