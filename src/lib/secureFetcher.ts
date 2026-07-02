import { auth } from './firebase';

import { onAuthStateChanged } from 'firebase/auth';

const getAuthToken = async (): Promise<string> => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(true);
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken(true);
        resolve(token);
      } else {
        resolve(sessionStorage.getItem('token') || '');
      }
    });
  });
};

export const secureFetcher = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || 'API 요청 중 오류가 발생했습니다.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
};
