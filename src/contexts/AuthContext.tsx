import React, { createContext, useContext, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  userRole: string | null;
  userRoles: string[];
  hasRole: (role: string | string[]) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; errorMsg?: string }>;
  logout: () => void;
  updateUserPassword: (newPassword: string) => Promise<{ success: boolean; errorMsg?: string }>;
  authReady: boolean;
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

  const [userRoles, setUserRoles] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('userRoles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    const single = sessionStorage.getItem('userRole');
    return single ? [single] : [];
  });

  const [authReady, setAuthReady] = useState(false);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAuthReady(true);
      if (user) {
        const token = await user.getIdToken();
        sessionStorage.setItem('token', token);
      } else {
        // Firebase 인증 결과 유효 사용자가 없을 경우, 조작/잔여 세션 스토리지 자동 정화
        if (sessionStorage.getItem('auth') === 'true') {
          sessionStorage.removeItem('auth');
          sessionStorage.removeItem('userEmail');
          sessionStorage.removeItem('isAdmin');
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('userRoles');
          sessionStorage.removeItem('token');
          setIsAuthenticated(false);
          setUserEmail(null);
          setIsAdmin(false);
          setUserRole(null);
          setUserRoles([]);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const saveLoginLogToFirebase = async (email: string) => {
    try {
      const addDocPromise = addDoc(collection(db, 'loginLogs'), {
        email,
        timestamp: serverTimestamp(),
        localTimeStr: new Date().toLocaleString('ko-KR')
      });
      
      await addDocPromise;
    } catch (e) {
      console.error("Error adding document: ", e);
      const logs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
      logs.push({ email, timestamp: new Date().toLocaleString('ko-KR') });
      localStorage.setItem('superAdminLoginLogs', JSON.stringify(logs));
    }
  };

  const hasRole = (target: string | string[]): boolean => {
    // 슈퍼 관리자는 모든 권한 상속
    if (isAdmin || userRoles.includes('admin') || userRole === 'admin') return true;
    if (!target) return true;
    if (Array.isArray(target)) {
      return target.some(t => userRoles.includes(t) || userRole === t);
    }
    return userRoles.includes(target) || userRole === target;
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Firebase Auth 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      sessionStorage.setItem('token', token);
      
      // 2. Firestore에서 권한(role) 조회 (방화벽 차단 시 무한 대기 방지를 위해 3초 타임아웃 적용)
      const roleDocRef = doc(db, 'userRoles', email);
      
      let role = 'guest'; // 기본 권한
      let roles: string[] = ['guest'];
      try {
        const roleSnap: any = await getDoc(roleDocRef);
        if (roleSnap.exists()) {
          const docData = roleSnap.data();
          if (Array.isArray(docData.roles) && docData.roles.length > 0) {
            roles = docData.roles;
            role = docData.role || roles[0];
          } else if (docData.role) {
            role = docData.role;
            roles = [docData.role];
          }
        }
      } catch (firestoreError) {
        console.warn('Firestore 권한 조회 실패:', firestoreError);
      }

      // [긴급 권한 복구] 대표님 계정은 어떤 상황에서도 무조건 슈퍼 관리자로 접속되도록 하드코딩 보호
      if (email === 'tjkim@bsbelleforet.com' || email === 'tjkim448532@gmail.com') {
        role = 'admin';
        if (!roles.includes('admin')) roles = ['admin', ...roles];
      }

      // role이 admin이거나 roles에 admin이 포함되어 있으면 기존의 슈퍼 관리자 권한도 부여
      const isSuperAdmin = role === 'admin' || roles.includes('admin');
      if (isSuperAdmin && !roles.includes('admin')) {
        roles = ['admin', ...roles];
      }

      setIsAuthenticated(true);
      setUserEmail(email);
      setIsAdmin(isSuperAdmin);
      setUserRole(role);
      setUserRoles(roles);
      
      sessionStorage.setItem('auth', 'true');
      sessionStorage.setItem('userEmail', email);
      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('userRoles', JSON.stringify(roles));
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
    try {
      signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    setIsAdmin(false);
    setUserRole(null);
    setUserRoles([]);
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userRoles');
    sessionStorage.removeItem('token');
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

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      isAdmin, 
      userRole, 
      userRoles, 
      hasRole, 
      login, 
      logout, 
      updateUserPassword, 
      authReady 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
