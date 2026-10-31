import { calcLine, calcTotals, formatDate, round } from './purchaseCalc';

test('round: yarım değerler yukarı yuvarlanır, kayan nokta hatası olmaz', () => {
  expect(round(1.005)).toBe(1.01);
  expect(round(2.675)).toBe(2.68);
  expect(round(0.1 + 0.2)).toBe(0.3);
  expect(round(1.23456, 4)).toBe(1.2346);
});

test('calcLine: backend ile aynı sırada hesaplar (tutar → iskonto → net → KDV)', () => {
  // 3 Koli × 120 ₺, %10 iskonto, %20 KDV
  expect(calcLine({ quantity: '3', unitPrice: '120', discountRate: '10', vatRate: 20 })).toEqual({
    lineAmount: 360,
    discountAmount: 36,
    netAmount: 324,
    vatAmount: 64.8,
    totalAmount: 388.8,
  });
  // İskonto boşsa 0 sayılır
  expect(calcLine({ quantity: '5', unitPrice: '11', discountRate: '', vatRate: 20 }).totalAmount).toBe(66);
});

test('calcTotals: fiş toplamı ve oran bazında KDV', () => {
  const t = calcTotals([
    { quantity: '3', unitPrice: '120', discountRate: '10', vatRate: 20 },
    { quantity: '5', unitPrice: '11', discountRate: '', vatRate: 20 },
    { quantity: '2', unitPrice: '50', discountRate: '', vatRate: 10 },
  ]);
  expect(t).toMatchObject({ subtotal: 515, discount: 36, net: 479, vat: 85.8, grand: 564.8 });
  expect(t.vatByRate).toEqual([
    { rate: 10, amount: 10 },
    { rate: 20, amount: 75.8 },
  ]);
});

test('formatDate: ISO tarihi Türkçe biçime çevirir', () => {
  expect(formatDate('2026-10-30')).toBe('30.10.2026');
});
