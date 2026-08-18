/**
 * 벨포레 대시보드 비즈니스 날짜 표준 유틸리티 (SSOT)
 * 
 * [경영진/리조트 운영 규칙]
 * - 호텔/리조트 특성상 정산 및 PMS 마감은 익일(D+1) 오전에 완료됩니다.
 * - 따라서 대시보드에서 '오늘(최신 영업일)'은 캘린더 당일이 아닌 【어제(Yesterday, D-1)】를 의미합니다.
 * - '최근 7일'은 【어제(D-1) 기준 직전 7일간】입니다.
 * - '금월(MTD)'은 【해당 월 1일 ~ 어제(D-1)】까지의 누적 기간을 의미합니다.
 */

export const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * 마감된 최신 영업일(어제, D-1) Date 객체 반환
 */
export const getClosedBusinessDate = (offsetDays: number = 1): Date => {
  const now = new Date();
  // KST 기준 어제 계산
  const target = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  return target;
};

/**
 * 마감된 최신 영업일(어제, D-1) YYYY-MM-DD 문자열 반환
 */
export const getLatestClosedDateStr = (): string => {
  return formatDate(getClosedBusinessDate(1));
};

export type DatePresetType = 'TODAY' | 'WEEK' | 'MTD' | 'H1';

export interface PresetDateResult {
  startDate: string;
  endDate: string | null;
  isRange: boolean;
  label: string;
}

/**
 * 벨포레 표준 프리셋 날짜 범위 계산
 */
export const getPresetDateRange = (preset: DatePresetType): PresetDateResult => {
  const yesterday = getClosedBusinessDate(1);
  const yesterdayStr = formatDate(yesterday);
  const yyyy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');

  switch (preset) {
    case 'TODAY':
      // '오늘' = 마감된 어제 1일 단일 조회
      return {
        startDate: yesterdayStr,
        endDate: null,
        isRange: false,
        label: '오늘 (어제 마감)'
      };

    case 'WEEK': {
      // '최근 7일' = 어제 기준 직전 7일간 (어제 포함 총 7일: yesterday - 6일)
      const weekStart = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000);
      const weekStartStr = formatDate(weekStart);
      return {
        startDate: weekStartStr,
        endDate: yesterdayStr,
        isRange: true,
        label: '최근 7일'
      };
    }

    case 'MTD': {
      // '금월' = 당월 1일 ~ 어제(D-1)
      const firstDayStr = `${yyyy}-${mm}-01`;
      return {
        startDate: firstDayStr,
        endDate: yesterdayStr,
        isRange: true,
        label: '금월 (1일~어제)'
      };
    }

    case 'H1': {
      // '상반기' = 1월 1일 ~ 6월 30일
      return {
        startDate: `${yyyy}-01-01`,
        endDate: `${yyyy}-06-30`,
        isRange: true,
        label: '상반기 (1~6월)'
      };
    }

    default:
      return {
        startDate: yesterdayStr,
        endDate: null,
        isRange: false,
        label: '오늘'
      };
  }
};
