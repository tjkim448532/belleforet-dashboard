/**
 * 🏛️ 벨포레 금융/경영 지표 포맷팅 유틸리티 (SSOT Standard)
 * 은행/핀테크 플랫폼 수준의 엄격한 자릿수 및 직관적 한글 금융 단위 변환기
 */

export const formatRevenue = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
};

export interface FinancialKoreanResult {
  formatted: string;     // 예: "12억 4,500만 원" 또는 "4,500만 원"
  short: string;         // 예: "12.5억"
  full: string;          // 예: "1,245,000,000원"
  raw: number;
  isNegative: boolean;
}

/**
 * 숫자를 한글 억/만 단위로 직관적으로 분리 포맷팅
 * 경영진이 1초 만에 규모를 판별할 수 있도록 지원
 */
export const formatFinancialKorean = (amount: number | null | undefined): FinancialKoreanResult => {
  if (amount == null || isNaN(amount)) {
    return { formatted: '0원', short: '0원', full: '0원', raw: 0, isNegative: false };
  }

  const raw = Math.round(amount);
  const isNegative = raw < 0;
  const abs = Math.abs(raw);

  const full = `${isNegative ? '-' : ''}${new Intl.NumberFormat('ko-KR').format(abs)}원`;

  if (abs === 0) {
    return { formatted: '0원', short: '0원', full: '0원', raw: 0, isNegative: false };
  }

  const eok = Math.floor(abs / 100000000);
  const remainderAfterEok = abs % 100000000;
  const man = Math.floor(remainderAfterEok / 10000);
  const remainderWon = remainderAfterEok % 10000;

  const prefix = isNegative ? '-' : '';

  let formatted = '';
  if (eok > 0) {
    if (man > 0) {
      formatted = `${prefix}${eok}억 ${new Intl.NumberFormat('ko-KR').format(man)}만 원`;
    } else {
      formatted = `${prefix}${eok}억 원`;
    }
  } else if (man > 0) {
    if (remainderWon > 0 && abs < 1000000) {
      // 100만원 미만 소액은 원 단위까지 보존
      formatted = `${prefix}${man}만 ${new Intl.NumberFormat('ko-KR').format(remainderWon)}원`;
    } else {
      formatted = `${prefix}${new Intl.NumberFormat('ko-KR').format(man)}만 원`;
    }
  } else {
    formatted = `${prefix}${new Intl.NumberFormat('ko-KR').format(abs)}원`;
  }

  // 짧은 축약 표기
  let short = '';
  if (abs >= 100000000) {
    short = `${prefix}${(abs / 100000000).toFixed(1)}억`;
  } else if (abs >= 10000) {
    short = `${prefix}${(abs / 10000).toFixed(0)}만`;
  } else {
    short = `${prefix}${new Intl.NumberFormat('ko-KR').format(abs)}`;
  }

  return {
    formatted,
    short,
    full,
    raw,
    isNegative
  };
};

/**
 * 성장률/변화율을 핀테크 스타일 기호와 함께 포맷팅
 */
export const formatDeltaRate = (
  growth: number | null | undefined, 
  options: { showPlus?: boolean; digits?: number } = {}
): string => {
  if (growth == null || isNaN(growth)) return '-';
  const digits = options.digits ?? 1;
  const abs = Math.abs(growth).toFixed(digits);
  
  if (growth > 0) {
    return `${options.showPlus ? '+' : ''}${abs}%`;
  } else if (growth < 0) {
    return `-${abs}%`;
  }
  return `0.0%`;
};
