import { auth } from './firebase';

export const secureFetcher = async (url: string, options: RequestInit = {}) => {
  const user = auth.currentUser;
  const token = user 
    ? await user.getIdToken(true) 
    : sessionStorage.getItem('token') || '';

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
