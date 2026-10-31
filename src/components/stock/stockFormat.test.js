import { stockBreakdown } from './stockFormat';

const KOLI = { unitCode: 'KOLİ', multiplier: 12 };
const PALET = { unitCode: 'PLT', multiplier: 480 };

test('stoğu büyük birimden küçüğe böler', () => {
  expect(stockBreakdown(46, 'ADT', [KOLI])).toBe('3 KOLİ 10 ADT');
  expect(stockBreakdown(1000, 'ADT', [KOLI, PALET])).toBe('2 PLT 3 KOLİ 4 ADT');
  expect(stockBreakdown(24, 'ADT', [KOLI])).toBe('2 KOLİ');
});

test('kırılım anlamsızsa null döner', () => {
  expect(stockBreakdown(46, 'ADT', [])).toBeNull(); // ek birim yok
  expect(stockBreakdown(5, 'ADT', [KOLI])).toBeNull(); // bir koliden az
  expect(stockBreakdown(-3, 'ADT', [KOLI])).toBeNull(); // eksi stok
  expect(stockBreakdown(10, 'KG', [{ unitCode: 'PK', multiplier: 0.5 }])).toBeNull(); // küçük birim
});

test('ondalıklı temel miktar korunur', () => {
  expect(stockBreakdown(12.5, 'KG', [{ unitCode: 'ÇUVAL', multiplier: 5 }])).toBe('2 ÇUVAL 2,5 KG');
});
