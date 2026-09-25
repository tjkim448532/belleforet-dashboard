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

            if (typeof value === 'object' && value !== null) {
                scanNode(value, `${path}.${key}`, currentVenue);
                continue;
            }

            // 불리언(Boolean) 필드(isSubtotal, isStatisticallySignificant 등)는 숫자 검증 대상에서 제외
            if (typeof value === 'boolean' || key.startsWith('is') || key.startsWith('has')) {
                continue;
            }
            
            // 금액/지표 관련 필드명 매칭 (날씨 설명, 명칭, 텍스트 필드, 코드 등 제외)
            const isMetricKey = (
                key.match(/(revenue|actual|growth|diff|amount|fee|ratio|trevpar|trevpor|occ|rooms|gross)/i) ||
                key.match(/(today|mtd|ytd|last|roomcap)ly/i) ||
                key.match(/^ly([A-Z_]|$)/i)
            ) && !key.toLowerCase().includes('date') && !key.toLowerCase().includes('desc') && !key.toLowerCase().includes('weather') && !key.toLowerCase().includes('name') && !key.toLowerCase().includes('code') && !key.toLowerCase().includes('formatted');

            if (isMetricKey) {
                if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(`[Type Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' MUST be a strict Number. Received: ${value === null ? 'null' : typeof value} ('${value}')`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(`[NaN Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' is NaN.`);
                }
            }
        }
    };

    scanNode(data, 'root', 'Global');
    
    // 3. 자바스크립트 합산 오차 검증 거절 통보 (NO SLICE SUMMATION 원칙 강제)
    

    // 4. 검증 결과 텍스트 리포팅 (대량 오류 시 콘솔 폭주 및 브라우저 프리징 방지)
    if (errors.length > 0) {
        console.error(`❌ [Data Integrity FAILED] ${url.split('?')[0]} (총 ${errors.length}건 타입 위반 감지)`);
        // 상위 5개 대표 오류만 출력하여 브라우저 OOM/멈춤 방지
        errors.slice(0, 5).forEach(err => console.error(err));
        if (errors.length > 5) {
            console.warn(`⚠️ [Throttled] 나머지 ${errors.length - 5}건의 타입 오류는 브라우저 프리징 방지를 위해 생략되었습니다.`);
        }
    } else {
        console.log(`✅ [Data Integrity PASSED] ${url.split('?')[0]} - No type/number violations detected.`);
    }
};

/**
 * 백엔드 배포 전 과도기 또는 미정규화 문자열 숫자('1119093.00') 수신 시
 * UI 컴포넌트 크래시 및 문자열 연결 버그 방지를 위한 프론트엔드 방어적 정규화
 */
const sanitizePayloadNumbers = (node: any) => {
    if (!node || typeof node !== 'object') return;
    for (const key in node) {
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
            sanitizePayloadNumbers(value);
            continue;
        }
        if (typeof value === 'boolean' || key.startsWith('is') || key.startsWith('has')) {
            continue;
        }
        const isMetricKey = (
            key.match(/(revenue|actual|growth|diff|amount|fee|ratio|trevpar|trevpor|occ|rooms|gross)/i) ||
            key.match(/(today|mtd|ytd|last|roomcap)ly/i) ||
            key.match(/^ly([A-Z_]|$)/i)
        ) && !key.toLowerCase().includes('date') && !key.toLowerCase().includes('desc') && !key.toLowerCase().includes('weather') && !key.toLowerCase().includes('name') && !key.toLowerCase().includes('code') && !key.toLowerCase().includes('formatted');

        if (typeof value === 'string' && isMetricKey) {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
                node[key] = parsed;
            }
        }
    }
};


let sleepOverlayInjected = false;
const showSleepModeOverlay = () => {
  if (sleepOverlayInjected || typeof document === 'undefined') return;
  sleepOverlayInjected = true;
  
  const overlay = document.createElement('div');
  overlay.id = 'sleep-mode-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.backdropFilter = 'blur(10px)';
  overlay.style.color = 'white';
  overlay.style.fontFamily = 'Pretendard, sans-serif';
  
  overlay.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 2s infinite;">🌙</div>
    <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 16px; text-align: center;">현재 서버가 자고 있습니다</h1>
    <p style="font-size: 1.1rem; color: #94a3b8; text-align: center; max-width: 500px; line-height: 1.6; margin-bottom: 30px;">
      야간 비용 절감을 위해 매일 <b>20:00 ~ 08:00</b> 에는<br/>
      데이터베이스가 수면(Sleep) 모드에 들어갑니다.<br/>
      매일 아침 08:00에 다시 활기차게 가동됩니다!
    </p>
    <button id="sleep-mode-btn" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 99px; font-weight: bold; cursor: pointer; font-size: 1rem; transition: background 0.2s;">
      알겠습니다
    </button>
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
      #sleep-mode-btn:hover { background: #2563eb !important; }
    </style>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('sleep-mode-btn')?.addEventListener('click', () => {
    overlay.remove();
    sleepOverlayInjected = false;
  });
};

export const secureFetcher = async (rawUrl: string, options: RequestInit = {}) => {
  let url = rawUrl;
  if (url.includes('/api/v5/')) { throw new Error('[Zero-Proxy] V5 구버전 API 호출이 감지되었습니다. V6 엔드포인트로 즉시 교체하십시오.'); }

  const isV6Api = url.includes('/api/v6/') ;
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
    if (errorData?.details?.includes('심야 절전 운영')) {
      showSleepModeOverlay();
      return new Promise(() => {}); // 무한 대기
    }
    const error = new Error(errorData.error || 'API 요청 중 오류가 발생했습니다.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  
  if (data && data.success === false && data.details?.includes('심야 절전 운영')) {
    showSleepModeOverlay();
    return new Promise(() => {}); // 무한 대기
  }

  // 백엔드 내부 로직 크래시 (HTTP 200 이지만 error 인 경우) 방어
  if (data && (data.status === 'error' || data.success === false)) {
    const details = data.details || data.message || data.error || '';
    if (typeof details === 'string' && (details.includes('심야 절전 운영') || details.includes('수면 모드') || details.includes('절전'))) {
      showSleepModeOverlay();
    }
    const errorMsg = details || data.message || data.error || '백엔드 처리 중 치명적인 오류가 발생했습니다.';
    const error = new Error(errorMsg) as Error & { status?: number; details?: string };
    error.status = 200;
    error.details = details;
    throw error;
  }
  
  // 데이터 정합성 QA 전수 검증 인터셉터 호출 (백엔드 계약 위반 감지)
  validatePayloadIntegrity(data, url, startTime, response.status);
  
  // UI 런타임 안정성을 위한 방어적 정규화 (문자열 숫자를 안전한 Number로 보정)
  sanitizePayloadNumbers(data);
  
  return data;
};


