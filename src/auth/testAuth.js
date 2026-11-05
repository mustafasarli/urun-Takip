import { AuthContext, buildAuthValue } from './AuthContext';

// Yalnızca testler için: ekran testleri girişle uğraşmadan oturum açmış bir kullanıcıyla çalışır
export const TEST_ADMIN = {
  id: 1,
  username: 'admin',
  fullName: 'Yönetici',
  role: 'ADMIN',
  permissions: [],
  mustChangePassword: false,
};

const noop = async () => {};

export function TestAuthProvider({ user = TEST_ADMIN, children }) {
  const value = buildAuthValue({
    status: 'authenticated',
    user,
    notice: null,
    login: noop,
    logout: () => {},
    changePassword: noop,
    clearNotice: () => {},
  });
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
