import CategoryPage from '../category/CategoryPage';
import ProductPage from '../product/ProductPage';
import PurchasePage from '../purchase/PurchasePage';
import StockPage from '../stock/StockPage';
import UnitPage from '../unit/UnitPage';

// Sol menü tanımı. Yeni bir ekran eklemek için ilgili grubun `items` listesine eklemek yeterli.
export const MENU = [
  {
    key: 'definitions',
    label: 'Tanımlar',
    items: [
      { key: 'categories', label: 'Kategori Tanımları', component: CategoryPage },
      { key: 'units', label: 'Birim Tanımları', component: UnitPage },
      { key: 'products', label: 'Ürün Tanımları', component: ProductPage },
    ],
  },
  {
    key: 'stock',
    label: 'Stok',
    items: [
      { key: 'purchases', label: 'Alış Girişi', component: PurchasePage },
      { key: 'stocks', label: 'Stok Durumu', component: StockPage },
    ],
  },
];

export function findMenuItem(key) {
  for (const group of MENU) {
    const item = group.items.find((i) => i.key === key);
    if (item) return { group, item };
  }
  return null;
}
