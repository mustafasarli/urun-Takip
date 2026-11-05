import { getPurchases } from '../../api/purchaseApi';
import { getIssues } from '../../api/stockIssueApi';

// İki iade ekranı aynı bileşenleri kullanır; farklar (metinler, kaynak fiş) burada
export const RETURN_TYPES = {
  PURCHASE_RETURN: {
    type: 'PURCHASE_RETURN',
    pageTitle: 'Alış İade',
    newLabel: 'Yeni Alış İade',
    docLabel: 'Alış İade Fişi',
    listLabel: 'Alış iade listesi',
    sourceLabel: 'Alış Fişi',
    partyLabel: 'Tedarikçi',
    quantityLabel: 'Alınan',
    effect: 'stoktan düşülür',
    // Kaynak fiş seçimi için tüm aktif alış fişleri (tarih filtresi yok)
    loadSources: () => getPurchases(),
    partyOf: (doc) => doc.supplierName,
  },
  SALES_RETURN: {
    type: 'SALES_RETURN',
    pageTitle: 'Satış İade',
    newLabel: 'Yeni Satış İade',
    docLabel: 'Satış İade Fişi',
    listLabel: 'Satış iade listesi',
    sourceLabel: 'Çıkış Fişi',
    partyLabel: 'Alıcı',
    quantityLabel: 'Satılan',
    effect: 'stoğa eklenir',
    loadSources: () => getIssues(),
    partyOf: (doc) => doc.customerName,
  },
};
