import { formatQty, round } from '../purchase/purchaseCalc';

/**
 * Temel birimdeki stoğu ek birimlere böler: 46 Adet, Koli ×12 → "3 Koli 10 Adet".
 * Büyük birimden küçüğe gider; çarpanı 1'den büyük birimler kullanılır (0,5 Kg'lık paket gibi
 * küçük birimler kırılıma girmez). Kırılım anlamsızsa (ek birim yok, stok ≤ 0 veya en küçük
 * ek birimden azsa) null döner.
 */
export function stockBreakdown(quantity, baseUnitCode, units = []) {
  let rest = round(Number(quantity), 3);
  const big = units
    .map((u) => ({ code: u.unitCode, multiplier: Number(u.multiplier) }))
    .filter((u) => u.multiplier > 1)
    .sort((a, b) => b.multiplier - a.multiplier);
  if (big.length === 0 || rest < big[big.length - 1].multiplier) return null;

  const parts = [];
  big.forEach((u) => {
    const count = Math.floor(round(rest / u.multiplier, 6));
    if (count > 0) {
      parts.push(`${formatQty(count)} ${u.code}`);
      rest = round(rest - count * u.multiplier, 3);
    }
  });
  if (rest > 0) parts.push(`${formatQty(rest)} ${baseUnitCode}`);
  return parts.join(' ');
}
