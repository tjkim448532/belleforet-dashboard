import React, { createContext, useContext, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  userRole: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; errorMsg?: string }>;
  logout: () => void;
  updateUserPassword: (newPassword: string) => Promise<{ success: boolean; errorMsg?: string }>;
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
      const addDocPromise = addDoc(collection(db, 'loginLogs'), {
        email,
        timestamp: serverTimestamp(),
        localTimeStr: new Date().toLocaleString('ko-KR')
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore log save timeout (방화벽 차단)')), 3000)
      );

      // 방화벽 차단으로 무한 대기하는 것을 방지하고 3초 후 에러를 발생시켜 localStorage 로컬 저장소로 넘김
      await Promise.race([addDocPromise, timeoutPromise]);
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
      
      // 2. Firestore에서 권한(role) 조회 (방화벽 차단 시 무한 대기 방지를 위해 3초 타임아웃 적용)
      const roleDocRef = doc(db, 'userRoles', email);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore connection timeout (방화벽 차단)')), 3000)
      );

      let role = 'guest'; // 기본 권한
      try {
        const roleSnap: any = await Promise.race([
          getDoc(roleDocRef),
          timeoutPromise
        ]);
        if (roleSnap.exists()) {
          role = roleSnap.data().role;
        }
      } catch (firestoreError) {
        console.warn('Firestore 조회 실패 (네트워크/방화벽 문제). 기본 권한으로 진행합니다.', firestoreError);
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

  const updateUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) return { success: false, errorMsg: '로그인된 상태가 아닙니다.' };
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (error: any) {
      console.error('Password update failed:', error);
      let errorMsg = '비밀번호 변경에 실패했습니다.';
      if (error?.code === 'auth/requires-recent-login') {
        errorMsg = '보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.';
      } else if (error?.code === 'auth/weak-password') {
        errorMsg = '비밀번호는 최소 6자리 이상이어야 합니다.';
      }
      return { success: false, errorMsg };
    }
  };

  return <AuthContext.Provider value={{ isAuthenticated, userEmail, isAdmin, userRole, login, logout, updateUserPassword }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
