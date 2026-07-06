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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('API 응답 시간이 초과되었습니다 (60초). 백엔드 서버 상태를 확인해주세요.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || 'API 요청 중 오류가 발생했습니다.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  
  // --- V4 Polyfill Logic ---
  // If API V4 'rooms' array exists, synthesize the legacy breakdown arrays for frontend compatibility
  const payload = data.data || data;
  if (payload && payload.rooms && Array.isArray(payload.rooms)) {
    const roomMap: Record<string, { qty: number, actual: number }> = {};
    const marketMap: Record<string, { qty: number, actual: number }> = {};
    const rateMap: Record<string, { qty: number, actual: number }> = {};
    
    payload.rooms.forEach((r: any) => {
      const rt = r.roomType || '기타';
      const mt = r.marketType || '기타';
      const rat = r.rateType || '기타';
      
      // 백엔드 다차원 데이터(ROLLUP 등)에서 '전체'나 '소계' 합산본이 넘어올 경우 중복 합산을 방지
      if (rt === '전체' || rt === '소계' || rt === '합계') return;
      if (mt === '전체' || mt === '소계' || mt === '합계') return;
      if (rat === '전체' || rat === '소계' || rat === '합계') return;

      const sold = Number(r.roomsSold || 0);
      const rev = Number(r.revenue || 0);
      
      if (!roomMap[rt]) roomMap[rt] = { qty: 0, actual: 0 };
      roomMap[rt].qty += sold;
      roomMap[rt].actual += rev;
      
      if (!marketMap[mt]) marketMap[mt] = { qty: 0, actual: 0 };
      marketMap[mt].qty += sold;
      marketMap[mt].actual += rev;
      
      if (!rateMap[rat]) rateMap[rat] = { qty: 0, actual: 0 };
      rateMap[rat].qty += sold;
      rateMap[rat].actual += rev;
    });
    
    payload.roomTypeBreakdown = Object.keys(roomMap).map(k => ({
      facility_name: k,
      qty: roomMap[k].qty,
      today_actual: roomMap[k].actual
    }));
    
    payload.marketTypeBreakdown = Object.keys(marketMap).map(k => ({
      facility_name: k,
      qty: marketMap[k].qty,
      today_actual: marketMap[k].actual
    }));
    
    payload.rateTypeBreakdown = Object.keys(rateMap).map(k => ({
      facility_name: k,
      qty: rateMap[k].qty,
      today_actual: rateMap[k].actual
    }));
  }

  return data;
};
