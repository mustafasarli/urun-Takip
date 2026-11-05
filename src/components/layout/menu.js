import CategoryPage from '../category/CategoryPage';
import DocumentSeriesPage from '../documentSeries/DocumentSeriesPage';
import IssuePage from '../issue/IssuePage';
import ProductPage from '../product/ProductPage';
import PurchasePage from '../purchase/PurchasePage';
import { PurchaseReturnPage, SalesReturnPage } from '../return/ReturnPage';
import StockPage from '../stock/StockPage';
import UnitPage from '../unit/UnitPage';
import UserPage from '../user/UserPage';

/**
 * Sol menü tanımı. Yeni bir ekran eklemek için ilgili grubun `items` listesine eklemek yeterli.
 * `permission`: backend'deki ScreenPermission adı; kullanıcı bu yetkiye sahipse ekranı görür.
 * `adminOnly`: yalnızca admin (yetki olarak verilemez). Admin tüm ekranları görür.
 */
export const MENU = [
  {
    key: 'definitions',
    label: 'Tanımlar',
    items: [
      { key: 'categories', label: 'Kategori Tanımları', permission: 'CATEGORIES', component: CategoryPage },
      { key: 'units', label: 'Birim Tanımları', permission: 'UNITS', component: UnitPage },
      { key: 'products', label: 'Ürün Tanımları', permission: 'PRODUCTS', component: ProductPage },
      { key: 'documentSeries', label: 'Belge No Tanımları', permission: 'DOCUMENT_SERIES', component: DocumentSeriesPage },
      { key: 'users', label: 'Kullanıcı Tanımları', adminOnly: true, component: UserPage },
    ],
  },
  {
    key: 'stock',
    label: 'Stok',
    items: [
      { key: 'purchases', label: 'Alış Girişi', permission: 'PURCHASES', component: PurchasePage },
      { key: 'issues', label: 'Çıkış Fişi', permission: 'ISSUES', component: IssuePage },
      { key: 'purchaseReturns', label: 'Alış İade', permission: 'PURCHASE_RETURNS', component: PurchaseReturnPage },
      { key: 'salesReturns', label: 'Satış İade', permission: 'SALES_RETURNS', component: SalesReturnPage },
      { key: 'stocks', label: 'Stok Durumu', permission: 'STOCKS', component: StockPage },
    ],
  },
];

export function canSee(item, auth) {
  return item.adminOnly ? auth.isAdmin : auth.hasScreen(item.permission);
}

// Kullanıcının görebileceği menü; ekranı kalmayan grup gizlenir
export function visibleMenu(auth) {
  return MENU.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i, auth)) })).filter((g) => g.items.length > 0);
}

// Yetkisiz ekran anahtarı (örn. başka ekrandan yönlendirme) bulunamaz sayılır
export function findMenuItem(key, auth) {
  for (const group of auth ? visibleMenu(auth) : MENU) {
    const item = group.items.find((i) => i.key === key);
    if (item) return { group, item };
  }
  return null;
}
