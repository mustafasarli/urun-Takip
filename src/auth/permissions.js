// Kullanıcıya verilebilen ekran yetkileri (backend: ScreenPermission). menu.js'teki `permission` alanlarıyla aynı adlar.
// Kullanıcı Tanımları yalnızca admine açıktır; yetki olarak verilemez.
export const PERMISSION_GROUPS = [
  {
    label: 'Tanımlar',
    items: [
      { permission: 'CATEGORIES', label: 'Kategori Tanımları' },
      { permission: 'UNITS', label: 'Birim Tanımları' },
      { permission: 'PRODUCTS', label: 'Ürün Tanımları' },
      { permission: 'DOCUMENT_SERIES', label: 'Belge No Tanımları' },
    ],
  },
  {
    label: 'Stok',
    items: [
      { permission: 'PURCHASES', label: 'Alış Girişi' },
      { permission: 'ISSUES', label: 'Çıkış Fişi' },
      { permission: 'PURCHASE_RETURNS', label: 'Alış İade' },
      { permission: 'SALES_RETURNS', label: 'Satış İade' },
      { permission: 'STOCKS', label: 'Stok Durumu' },
    ],
  },
];

export const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items).map((i) => [i.permission, i.label])
);
