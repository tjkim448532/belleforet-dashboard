import React, { createContext, useContext, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COMMON_PASSWORD = 'aebece'; // 일반 임직원 공용 비밀번호
const ADMIN_EMAIL = 'tjkim@bsbelleforet.com';
const ADMIN_PASSWORD = 'service';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('auth') === 'true';
  });
  
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('userEmail');
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });

  const saveLoginLogToFirebase = async (email: string) => {
    try {
      await addDoc(collection(db, 'loginLogs'), {
        email,
        timestamp: serverTimestamp(),
        localTimeStr: new Date().toLocaleString('ko-KR')
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      // Fallback to localStorage if Firebase fails (e.g. permissions)
      const logs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
      logs.push({ email, timestamp: new Date().toLocaleString('ko-KR') });
      localStorage.setItem('superAdminLoginLogs', JSON.stringify(logs));
    }
  };

  const login = async (email: string, password: string) => {
    let success = false;
    let isSuperAdmin = false;

    // 슈퍼 관리자 체크 (Firebase Auth 연동)
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      try {
        const { auth } = await import('../lib/firebase');
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
        success = true;
        isSuperAdmin = true;
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        // Firebase 인증 실패 시 에러 처리 (로그인 실패)
        return false;
      }
    } 
    // 일반 임직원 체크 (기존 방식 유지)
    else {
      const isCompanyEmail = email.endsWith('@daol.com') || email.endsWith('@belleforet.com') || email === 'admin';
      if (isCompanyEmail && password === COMMON_PASSWORD) {
        success = true;
      }
    }
    
    if (success) {
      setIsAuthenticated(true);
      setUserEmail(email);
      setIsAdmin(isSuperAdmin);
      
      sessionStorage.setItem('auth', 'true');
      sessionStorage.setItem('userEmail', email);
      if (isSuperAdmin) {
        sessionStorage.setItem('isAdmin', 'true');
      } else {
        sessionStorage.removeItem('isAdmin');
      }

      // 파이어베이스에 로그인 로그 기록 (비동기)
      saveLoginLogToFirebase(email);
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail(null);
    setIsAdmin(false);
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('isAdmin');
  };

  return <AuthContext.Provider value={{ isAuthenticated, userEmail, isAdmin, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
