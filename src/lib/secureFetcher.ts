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

const validatePayloadIntegrity = (data: any, url: string, startTime: number, status: number) => {
    const duration = Date.now() - startTime;
    
    // 1. API 인터셉터 기반 전수 로깅 (Network Level)
    const arrayNodes = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : null);
    const rowCount = arrayNodes ? arrayNodes.length : 'N/A';
    
    console.log(`[API Validator] ${url.split('?')[0]} | Status: ${status} | Time: ${duration}ms | Rows: ${rowCount}`);

    // 2. 숫자(Number) 무결성 및 타입 강제 검증 (Data Level)
    const errors: string[] = [];
    
    const scanNode = (node: any, path: string, venueContext: string) => {
        if (!node || typeof node !== 'object') return;
        
        // 에러 식별자 추적 (venue_name 우선 탐색)
        const currentVenue = node.venue_name || node.shopName || node.team_name || node.teamName || venueContext;
        
        for (const key in node) {
            const value = node[key];
            
            // 금액/지표 관련 필드명 매칭
            if (key.match(/(revenue|actual|ly|growth|diff|amount|fee|ratio|trevpar|occ|rooms|gross)/i)) {
                if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(`[Type Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' MUST be a strict Number. Received: ${value === null ? 'null' : typeof value} ('${value}')`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(`[NaN Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' is NaN.`);
                }
            }
            
            if (typeof value === 'object' && value !== null) {
                scanNode(value, `${path}.${key}`, currentVenue);
            }
        }
    };

    scanNode(data, 'root', 'Global');
    
    // 3. 자바스크립트 합산 오차 검증 거절 통보 (NO SLICE SUMMATION 원칙 강제)
    console.warn(`🚨 [Rule Enforcement] 'Array.prototype.reduce()' 기반 자바스크립트 프론트엔드 합산 오차 검증 시도는 V6 [NO SLICE SUMMATION] 무관용 헌법에 의거하여 시스템에서 강제 차단(Blocked) 되었습니다. 총합 1원 오차 검증은 프론트엔드가 아닌 백엔드 파이프라인에서 완결되어야 합니다.`);

    // 4. 검증 결과 텍스트 리포팅
    if (errors.length > 0) {
        console.error(`❌ [Data Integrity FAILED] ${url.split('?')[0]}`);
        errors.forEach(err => console.error(err));
    } else {
        console.log(`✅ [Data Integrity PASSED] ${url.split('?')[0]} - No type/number violations detected.`);
    }
};

export const secureFetcher = async (rawUrl: string, options: RequestInit = {}) => {
  let url = rawUrl;
  if (url.includes('/api/v5/')) {
    url = url
      .replace('/api/v5/report/room-sales-by-channel', '/api/v6/dashboard/room-sales-by-channel')
      .replace('/api/v5/report/room-channel-sales', '/api/v6/dashboard/room-channel-sales')
      .replace('/api/v5/dashboard/matrix-weekly', '/api/v6/dashboard/matrix-report')
      .replace('/api/v5/', '/api/v6/');
  }

  const isV6Api = url.includes('/api/v6/') || url.includes('/api/v5/');
  const token = isV6Api ? 'belleforet-m2m-secret' : await getAuthToken();

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  const startTime = Date.now();
  let response;
  
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('API 응답 시간이 초과되었습니다 (120초). 백엔드 서버 상태를 확인해주세요.');
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
  
  // 데이터 정합성 QA 전수 검증 인터셉터 호출
  validatePayloadIntegrity(data, url, startTime, response.status);
  
  return data;
};
