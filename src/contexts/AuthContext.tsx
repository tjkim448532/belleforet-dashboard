import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COMMON_PASSWORD = 'daol'; // 임시 공용 비밀번호

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('auth') === 'true';
  });
  
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('userEmail');
  });

  const login = (email: string, password: string) => {
    // 회사 이메일 도메인 검증 및 비밀번호 확인
    const isCompanyEmail = email.endsWith('@daol.com') || email.endsWith('@belleforet.com');
    
    if (isCompanyEmail && password === COMMON_PASSWORD) {
      setIsAuthenticated(true);
      setUserEmail(email);
      sessionStorage.setItem('auth', 'true');
      sessionStorage.setItem('userEmail', email);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail(null);
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('userEmail');
  };

  return <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
