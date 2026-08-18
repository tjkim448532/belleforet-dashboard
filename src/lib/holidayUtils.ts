// src/lib/holidayUtils.ts
// 대한민국 법정 국가지정공휴일 및 대체공휴일 캘린더 DB (2024 ~ 2027)

export const KOREAN_PUBLIC_HOLIDAYS: Record<string, string> = {
  // 2024년
  '2024-01-01': '신정',
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '설날 대체공휴일',
  '2024-03-01': '삼일절',
  '2024-04-10': '제22대 국회의원선거',
  '2024-05-05': '어린이날',
  '2024-05-06': '어린이날 대체공휴일',
  '2024-05-15': '부처님오신날',
  '2024-06-06': '현충일',
  '2024-08-15': '광복절',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  '2024-10-01': '국군의 날 임시공휴일',
  '2024-10-03': '개천절',
  '2024-10-09': '한글날',
  '2024-12-25': '성탄절',

  // 2025년
  '2025-01-01': '신정',
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-01': '삼일절',
  '2025-03-03': '삼일절 대체공휴일',
  '2025-05-05': '어린이날',
  '2025-05-06': '부처님오신날',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '추석 대체공휴일',
  '2025-10-09': '한글날',
  '2025-12-25': '성탄절',

  // 2026년
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '삼일절 대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '부처님오신날 대체공휴일',
  '2026-06-03': '전국동시지방선거일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '광복절 대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '개천절 대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',

  // 2027년
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '설날 대체공휴일',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-06-07': '현충일 대체공휴일',
  '2027-08-15': '광복절',
  '2027-08-16': '광복절 대체공휴일',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '개천절 대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '한글날 대체공휴일',
  '2027-12-25': '성탄절'
};

export interface HolidayPeriodInfo {
  totalDays: number;
  totalHolidays: number; // 토요일 + 일요일 + 국가지정공휴일 총합 일수 (중복 배제)
  saturdays: number;
  sundays: number;
  nationalHolidaysOnWeekdays: number;
  holidaysList: Array<{ date: string; name: string; isWeekend: boolean }>;
}

export interface HolidayComparisonInfo {
  currentPeriod: HolidayPeriodInfo;
  lastYearPeriod: HolidayPeriodInfo;
  diffHolidays: number; // 당해 공휴일수 - 전년 공휴일수
  currentLabel: string;
  lastYearLabel: string;
}

/**
 * 지정된 기간 [startDate, endDate] 내 토요일, 일요일, 국가지정공휴일의 합을 계산합니다.
 */
export function calculateHolidayInfo(startDateStr: string, endDateStr: string): HolidayPeriodInfo {
  if (!startDateStr || !endDateStr) {
    return {
      totalDays: 0,
      totalHolidays: 0,
      saturdays: 0,
      sundays: 0,
      nationalHolidaysOnWeekdays: 0,
      holidaysList: []
    };
  }

  const cur = new Date(startDateStr);
  const end = new Date(endDateStr);

  let totalDays = 0;
  let saturdays = 0;
  let sundays = 0;
  let nationalHolidaysOnWeekdays = 0;
  let totalHolidays = 0;
  const holidaysList: Array<{ date: string; name: string; isWeekend: boolean }> = [];

  while (cur <= end) {
    totalDays++;
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const dayOfWeek = cur.getDay(); // 0: 일, 6: 토
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSaturday || isSunday;
    const holidayName = KOREAN_PUBLIC_HOLIDAYS[dateKey];

    if (isSaturday) saturdays++;
    if (isSunday) sundays++;

    if (holidayName) {
      holidaysList.push({ date: dateKey, name: holidayName, isWeekend });
      if (!isWeekend) {
        nationalHolidaysOnWeekdays++;
      }
    }

    if (isWeekend || holidayName) {
      totalHolidays++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return {
    totalDays,
    totalHolidays,
    saturdays,
    sundays,
    nationalHolidaysOnWeekdays,
    holidaysList
  };
}

/**
 * 당월 1일부터 기준일까지의 당해 MTD 기간과 전년 동기간의 공휴일(토·일·국가지정공휴일) 일수를 비교 계산합니다.
 */
export function getMtdHolidayComparison(targetDateStr: string, endDateOverride?: string): HolidayComparisonInfo {
  const curEndStr = endDateOverride || targetDateStr;
  const curStartStr = `${curEndStr.slice(0, 7)}-01`;

  const curInfo = calculateHolidayInfo(curStartStr, curEndStr);

  // 전년 동기간 계산
  const curYear = parseInt(curEndStr.slice(0, 4), 10);
  const lyYear = curYear - 1;
  const lyStartStr = `${lyYear}-${curStartStr.slice(5)}`;
  const lyEndStr = `${lyYear}-${curEndStr.slice(5)}`;

  const lyInfo = calculateHolidayInfo(lyStartStr, lyEndStr);

  const diffHolidays = curInfo.totalHolidays - lyInfo.totalHolidays;

  return {
    currentPeriod: curInfo,
    lastYearPeriod: lyInfo,
    diffHolidays,
    currentLabel: `${curStartStr} ~ ${curEndStr}`,
    lastYearLabel: `${lyStartStr} ~ ${lyEndStr}`
  };
}
