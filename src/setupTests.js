// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Material UI ekranları test ortamında yavaş çizilir (özellikle test dosyaları paralel çalışırken);
// varsayılan 5 sn test ve 1 sn findBy/waitFor süreleri yetmiyor. Formu çok alanlı ekranlar (ürün, alış fişi)
// paralel çalışırken 30 sn'yi aşabildiği için 60 sn.
jest.setTimeout(60000);
configure({ asyncUtilTimeout: 5000 });
