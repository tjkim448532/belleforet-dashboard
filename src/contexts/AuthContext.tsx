import React, { createContext, useContext, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  userRole: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; errorMsg?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const [userRole, setUserRole] = useState<string | null>(() => {
    return sessionStorage.getItem('userRole');
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
      const logs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
      logs.push({ email, timestamp: new Date().toLocaleString('ko-KR') });
      localStorage.setItem('superAdminLoginLogs', JSON.stringify(logs));
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Firebase Auth 로그인
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Firestore에서 권한(role) 조회
      const roleDocRef = doc(db, 'userRoles', email);
      const roleSnap = await getDoc(roleDocRef);
      
      let role = 'guest'; // 기본 권한
      if (roleSnap.exists()) {
        role = roleSnap.data().role;
      }

      // [긴급 권한 복구] 대표님 계정은 어떤 상황에서도 무조건 슈퍼 관리자로 접속되도록 하드코딩 보호
      if (email === 'tjkim@bsbelleforet.com' || email === 'tjkim448532@gmail.com') {
        role = 'admin';
      }

      // role이 admin이면 기존의 슈퍼 관리자 권한도 부여
      const isSuperAdmin = role === 'admin';

      setIsAuthenticated(true);
      setUserEmail(email);
      setIsAdmin(isSuperAdmin);
      setUserRole(role);
      
      sessionStorage.setItem('auth', 'true');
      sessionStorage.setItem('userEmail', email);
      sessionStorage.setItem('userRole', role);
      if (isSuperAdmin) {
        sessionStorage.setItem('isAdmin', 'true');
      } else {
        sessionStorage.removeItem('isAdmin');
      }

      // 파이어베이스에 로그인 로그 기록
      saveLoginLogToFirebase(email);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, errorMsg: error?.message || '알 수 없는 에러' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail(null);
    setIsAdmin(false);
    setUserRole(null);
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('userRole');
  };

  return <AuthContext.Provider value={{ isAuthenticated, userEmail, isAdmin, userRole, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
