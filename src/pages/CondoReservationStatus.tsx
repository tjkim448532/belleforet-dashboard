import React, { useState, useEffect, useMemo } from 'react';
import { 
  Hotel, Users, Calendar, CalendarCheck, CalendarDays, Search,
  ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, Building2,
  Phone, Layers, Sparkles, RefreshCw, BarChart3,
  TrendingUp, Info, ShieldCheck
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { parseNum } from '../lib/dataTransformers';
import { formatDate, getKSTNow } from '../lib/dateUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://belleforet-data.vercel.app';

// ============================================================================
// Types
// ============================================================================

interface RoomTypeStat {
  roomType: string;
  reservedRooms: number;
  capacity: number;
  rate: number;
  adr?: number;
  estimatedRevenue?: number;
}

interface DayGroupBooking {
  groupName: string;
  channel: string;
  totalRooms: number;
  sharePct?: number;
  roomSharePct?: number;
  roomTypeBreakdown?: string;
  contactName?: string;
  contactPhone?: string;
}

interface DailyReservationSummary {
  targetDate: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isFriday: boolean;
  totalReservedRooms: number;
  totalCapacity: number;
  occupancyRate: number | null;
  totalGroupRooms: number;
  groupSharePct: number;
  groupCount: number;
  estimatedRevenue: number | null;
  estimatedRoomRevenue: number | null;
  byRoomType: RoomTypeStat[];
  groups: DayGroupBooking[];
}

interface CorporateGroupItem {
  groupId?: string;
  groupName?: string;
  corporateName?: string;
  b2bSegment?: string;
  b2bSegmentName?: string;
  category?: string;
  categoryName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  salesManager?: string;
  checkInDate: string;
  checkOutDate: string;
  stayDays?: number;
  roomsCount?: number;
  paxCount?: number;
  paxCountFormatted?: string;
  totalRevenue?: number;
  totalRevenueFormatted?: string;
  spendingBreakdown?: {
    roomRevenue?: number;
    roomsCount?: number;
    roomTypesUsed?: string[];
    fnbRevenue?: number;
    golfRevenue?: number;
    leisureRevenue?: number;
  };
  paymentMethod?: string;
  notes?: string;
}

interface CorporateGroupSummary {
  totalGroups: number;
  uniqueCompanies: number;
  totalPax: number;
  totalPaxFormatted: string;
  totalRevenue: number;
  totalRevenueFormatted: string;
  avgSpendPerGroup?: number;
  avgSpendPerPax?: number;
  roomRevenue?: number;
  mice?: {
    groupsCount: number;
    totalRevenue: number;
    totalRevenueFormatted: string;
    roomsCount: number;
    totalPax: number;
    totalPaxFormatted: string;
  };
  corpFit?: {
    groupsCount: number;
    totalRevenue: number;
    totalRevenueFormatted: string;
    roomsCount: number;
    totalPax: number;
    totalPaxFormatted: string;
  };
  comp?: {
    groupsCount: number;
    totalRevenue: number;
    roomsCount: number;
    totalPax: number;
  };
}

// 요일 및 주말 계산 헬퍼
function getDayInfo(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayIdx = d.getDay();
    return {
      dayName: days[dayIdx] || '',
      isSunday: dayIdx === 0,
      isSaturday: dayIdx === 6,
      isFriday: dayIdx === 5,
      isWeekend: dayIdx === 0 || dayIdx === 6,
    };
  } catch {
    return { dayName: '', isSunday: false, isSaturday: false, isFriday: false, isWeekend: false };
  }
}

// 날짜 범위 배열 생성 함수 (최대 31일 제한)
function generateDateList(start: string, end: string): string[] {
  const list: string[] = [];
  try {
    const curr = new Date(start + 'T00:00:00');
    const target = new Date(end + 'T00:00:00');
    let safetyCounter = 0;
    while (curr <= target && safetyCounter < 31) {
      list.push(formatDate(curr));
      curr.setDate(curr.getDate() + 1);
      safetyCounter++;
    }
  } catch {
    // fallback
  }
  return list;
}

export default function CondoReservationStatus() {
  // 오늘 날짜 (KST 기준)
  const todayStr = useMemo(() => formatDate(getKSTNow()), []);

  // 디폴트 기간: 오늘부터 일주일 (7일간: today ~ today + 6)
  const defaultEndStr = useMemo(() => {
    const d = getKSTNow();
    d.setDate(d.getDate() + 6);
    return formatDate(d);
  }, []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(defaultEndStr);
  const [activePreset, setActivePreset] = useState<'7d' | '14d' | '30d' | 'custom'>('7d');
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

  // 로딩 상태
  const [loadingDaily, setLoadingDaily] = useState<boolean>(true);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(true);

  // 일자별 객실 예약 데이터
  const [dailyData, setDailyData] = useState<DailyReservationSummary[]>([]);
  
  // 단체 예약 데이터
  const [groupList, setGroupList] = useState<CorporateGroupItem[]>([]);
  const [groupSummary, setGroupSummary] = useState<CorporateGroupSummary | null>(null);

  // 상단 객실 뷰 모드: 카드 뷰 vs 테이블 뷰
  const [upperViewMode, setUpperViewMode] = useState<'cards' | 'table'>('cards');

  // 특정 일자 상세 모달 / 선택
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailyReservationSummary | null>(null);

  // 단체 필터 및 검색 상태
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [groupSegmentFilter, setGroupSegmentFilter] = useState<string>('ALL');
  const [groupSortBy, setGroupSortBy] = useState<'checkIn' | 'rooms' | 'pax'>('checkIn');
  const [groupSortOrder, setGroupSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // 프리셋 변경 핸들러
  const handlePresetChange = (preset: '7d' | '14d' | '30d') => {
    const start = getKSTNow();
    const end = getKSTNow();
    let daysToAdd = 6;
    if (preset === '14d') daysToAdd = 13;
    if (preset === '30d') daysToAdd = 29;

    end.setDate(end.getDate() + daysToAdd);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setActivePreset(preset);
    setRangeWarning(null);
  };

  // 수동 날짜 변경 핸들러 (최대 31일 검증)
  const handleDateChange = (newStart: string, newEnd: string) => {
    if (!newStart || !newEnd) return;
    setActivePreset('custom');

    const s = new Date(newStart + 'T00:00:00');
    let e = new Date(newEnd + 'T00:00:00');

    if (s > e) {
      e = new Date(s);
      newEnd = newStart;
    }

    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) {
      // 31일로 자동 제한
      const maxEnd = new Date(s);
      maxEnd.setDate(maxEnd.getDate() + 30);
      newEnd = formatDate(maxEnd);
      setRangeWarning('최대 조회 가능 기간은 31일(1개월)입니다. 31일로 자동 조정되었습니다.');
    } else {
      setRangeWarning(null);
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  // ============================================================================
  // Data Fetching: 1. 일자별 객실 예약 현황
  // ============================================================================
  const fetchDailyReservations = async (start: string, end: string) => {
    setLoadingDaily(true);
    try {
      const dates = generateDateList(start, end);
      const responses = await Promise.all(
        dates.map(date =>
          secureFetcher(`${API_BASE}/api/v6/dashboard/condo-reservations?date=${date}`).catch(() => null)
        )
      );

      const parsedList: DailyReservationSummary[] = dates.map((date, idx) => {
        const res = responses[idx];
        const dayInfo = getDayInfo(date);
        const s = res?.summary || res?.condoSummary;

        const byRoomType: RoomTypeStat[] = (res?.byRoomType || [])
          .filter((t: any) => t.roomType && t.roomType !== '미지정')
          .map((t: any) => ({
            roomType: t.roomType,
            reservedRooms: parseNum(t.reservedRooms || t.roomsSold || 0),
            capacity: parseNum(t.capacity || t.fixedCapacity || 0),
            rate: Number(t.rate || 0),
            adr: t.adr ? parseNum(t.adr) : undefined,
            estimatedRevenue: t.estimatedRevenue ? parseNum(t.estimatedRevenue) : undefined,
          }));

        const groups: DayGroupBooking[] = (res?.groups || []).map((g: any) => ({
          groupName: g.groupName || '단체',
          channel: g.channel || '단체영업',
          totalRooms: parseNum(g.totalRooms || 0),
          sharePct: g.sharePct ? Number(g.sharePct) : undefined,
          roomSharePct: g.roomSharePct ? Number(g.roomSharePct) : undefined,
          roomTypeBreakdown: g.roomTypeBreakdown || '',
          contactName: g.contactName,
          contactPhone: g.contactPhone,
        }));

        return {
          targetDate: date,
          dayOfWeek: dayInfo.dayName,
          isWeekend: dayInfo.isWeekend,
          isSunday: dayInfo.isSunday,
          isSaturday: dayInfo.isSaturday,
          isFriday: dayInfo.isFriday,
          totalReservedRooms: s ? parseNum(s.totalReservedRooms) : 0,
          totalCapacity: s && s.totalCapacity !== undefined ? parseNum(s.totalCapacity) : 0,
          occupancyRate: s && s.occupancyRate !== undefined && s.occupancyRate !== null ? Number(s.occupancyRate) : null,
          totalGroupRooms: s ? parseNum(s.totalGroupRooms || 0) : 0,
          groupSharePct: s ? Number(s.groupSharePct || 0) : 0,
          groupCount: s ? parseNum(s.groupCount || 0) : 0,
          estimatedRevenue: s?.estimatedRevenue ? parseNum(s.estimatedRevenue) : null,
          estimatedRoomRevenue: s?.estimatedRoomRevenue ? parseNum(s.estimatedRoomRevenue) : null,
          byRoomType,
          groups,
        };
      });

      setDailyData(parsedList);
    } catch (err) {
      console.error('Failed to load daily condo reservations:', err);
      setDailyData([]);
    } finally {
      setLoadingDaily(false);
    }
  };

  // ============================================================================
  // Data Fetching: 2. 단체 예약 현황
  // ============================================================================
  const fetchGroupReservations = async (start: string, end: string) => {
    setLoadingGroups(true);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?startDate=${start}&endDate=${end}`).catch(() => null);
      if (res && res.success) {
        setGroupList(res.groups || []);
        setGroupSummary(res.summary || null);
      } else {
        setGroupList([]);
        setGroupSummary(null);
      }
    } catch (err) {
      console.error('Failed to load corporate group sales:', err);
      setGroupList([]);
      setGroupSummary(null);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 기간 변경 시 데이터 리로드
  useEffect(() => {
    fetchDailyReservations(startDate, endDate);
    fetchGroupReservations(startDate, endDate);
  }, [startDate, endDate]);

  // 상단 객실 예약 종합 KPI 산출
  const condoPeriodKPIs = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        totalDays: 0,
        totalRoomNights: 0,
        totalCapNights: 0,
        avgOccupancyRate: 0,
        peakDate: '-',
        peakRooms: 0,
        peakOccRate: 0,
        totalGroupRooms: 0,
        groupRoomShare: 0,
        totalEstimatedRevenue: 0,
      };
    }

    let sumRooms = 0;
    let sumCap = 0;
    let sumGroupRooms = 0;
    let sumRevenue = 0;
    let peakRooms = -1;
    let peakDate = '-';
    let peakOccRate = 0;

    dailyData.forEach(d => {
      sumRooms += d.totalReservedRooms;
      sumCap += d.totalCapacity;
      sumGroupRooms += d.totalGroupRooms;
      if (d.estimatedRoomRevenue) {
        sumRevenue += d.estimatedRoomRevenue;
      }
      if (d.totalReservedRooms > peakRooms) {
        peakRooms = d.totalReservedRooms;
        peakDate = d.targetDate;
        peakOccRate = d.occupancyRate ?? 0;
      }
    });

    const avgOcc = sumCap > 0 ? (sumRooms / sumCap) * 100 : 0;
    const groupShare = sumRooms > 0 ? (sumGroupRooms / sumRooms) * 100 : 0;

    return {
      totalDays: dailyData.length,
      totalRoomNights: sumRooms,
      totalCapNights: sumCap,
      avgOccupancyRate: avgOcc,
      peakDate,
      peakRooms: peakRooms >= 0 ? peakRooms : 0,
      peakOccRate,
      totalGroupRooms: sumGroupRooms,
      groupRoomShare: groupShare,
      totalEstimatedRevenue: sumRevenue,
    };
  }, [dailyData]);

  // 단체 리스트 필터링 & 정렬
  const filteredAndSortedGroups = useMemo(() => {
    let result = [...groupList];

    // 검색어 필터 (단체명, 기업명, 담당자, 전화번호, 비고)
    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.trim().toLowerCase();
      result = result.filter(g =>
        (g.groupName && g.groupName.toLowerCase().includes(q)) ||
        (g.corporateName && g.corporateName.toLowerCase().includes(q)) ||
        (g.contactName && g.contactName.toLowerCase().includes(q)) ||
        (g.contactPhone && g.contactPhone.includes(q)) ||
        (g.notes && g.notes.toLowerCase().includes(q))
      );
    }

    // 세그먼트/카테고리 필터
    if (groupSegmentFilter !== 'ALL') {
      if (groupSegmentFilter === 'SEMINAR') {
        result = result.filter(g => g.category === 'SEMINAR' || (g.categoryName && g.categoryName.includes('세미나')));
      } else if (groupSegmentFilter === 'COMP') {
        result = result.filter(g => (g.b2bSegment === 'COMP' || (g.b2bSegmentName && g.b2bSegmentName.includes('무상'))) && g.category !== 'SEMINAR');
      } else if (groupSegmentFilter === 'MICE') {
        result = result.filter(g => (g.categoryName && g.categoryName.includes('MICE')) || (g.b2bSegmentName && g.b2bSegmentName.includes('MICE')));
      } else if (groupSegmentFilter === 'CORP') {
        result = result.filter(g => g.b2bSegment === 'CORP_FIT' || (g.categoryName && g.categoryName.includes('기업')));
      }
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;
      if (groupSortBy === 'checkIn') {
        comparison = a.checkInDate.localeCompare(b.checkInDate);
      } else if (groupSortBy === 'rooms') {
        const roomsA = a.spendingBreakdown?.roomsCount ?? a.roomsCount ?? 0;
        const roomsB = b.spendingBreakdown?.roomsCount ?? b.roomsCount ?? 0;
        comparison = roomsA - roomsB;
      } else if (groupSortBy === 'pax') {
        comparison = (a.paxCount || 0) - (b.paxCount || 0);
      }
      return groupSortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [groupList, groupSearchQuery, groupSegmentFilter, groupSortBy, groupSortOrder]);

  const toggleGroupExpand = (id: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ============================================================================ */}
      {/* 1. Page Header & Date Range Control Bar */}
      {/* ============================================================================ */}
      <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-[#284F42]/10 rounded-xl text-[#284F42]">
                <CalendarCheck size={26} />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#1B382E] tracking-tight">
                  리조트 예약현황
                </h1>
                <p className="text-sm font-medium text-[#5A6B63] mt-0.5">
                  실시간 PMS 예약 원장 기반 전사 객실 점유율 및 단체 행사 투숙 현황
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#284F42]/10 text-xs font-semibold text-[#284F42]">
                <ShieldCheck size={13} />
                단일 진실 공급원 (SSOT)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B59269]/15 text-xs font-semibold text-[#B59269]">
                물리 가용 175실 기준
              </span>
            </div>
          </div>

          {/* Date Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Presets */}
            <div className="inline-flex bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/50">
              <button
                type="button"
                onClick={() => handlePresetChange('7d')}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePreset === '7d'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                오늘 ~ 7일 (디폴트)
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('14d')}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePreset === '14d'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                오늘 ~ 14일
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('30d')}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePreset === '30d'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                오늘 ~ 30일 (1개월)
              </button>
            </div>

            {/* Custom Range Picker */}
            <div className="flex items-center gap-2 bg-[#F4F3EE] px-3 py-1.5 rounded-xl border border-[#D0C6BB]/50">
              <Calendar size={16} className="text-[#5A6B63]" />
              <input
                type="date"
                value={startDate}
                onChange={e => handleDateChange(e.target.value, endDate)}
                className="bg-transparent text-xs font-bold text-[#1B382E] outline-none cursor-pointer"
              />
              <span className="text-xs text-[#5A6B63] font-medium">~</span>
              <input
                type="date"
                value={endDate}
                onChange={e => handleDateChange(startDate, e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1B382E] outline-none cursor-pointer"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                fetchDailyReservations(startDate, endDate);
                fetchGroupReservations(startDate, endDate);
              }}
              title="새로고침"
              className="p-2.5 rounded-xl bg-[#284F42] hover:bg-[#1f3f35] text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
            >
              <RefreshCw size={16} className={`${loadingDaily || loadingGroups ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Warning notification if clamped */}
        {rangeWarning && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>{rangeWarning}</span>
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* 2. TOP SECTION: 전사 객실 예약현황 (일자별 예약 및 점유율) */}
      {/* ============================================================================ */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#284F42] text-white rounded-lg">
              <Hotel size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1B382E] tracking-tight">
                일자별 객실 예약 현황
              </h2>
              <p className="text-xs font-medium text-[#5A6B63]">
                {startDate} ~ {endDate} ({condoPeriodKPIs.totalDays}일간) 전사 객실 예약 추이 및 평형별 가동 분석
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white p-1 rounded-xl border border-[#D0C6BB]/75 shadow-2xs">
              <button
                type="button"
                onClick={() => setUpperViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  upperViewMode === 'cards'
                    ? 'bg-[#284F42] text-white'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                <Layers size={14} />
                일자별 카드
              </button>
              <button
                type="button"
                onClick={() => setUpperViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  upperViewMode === 'table'
                    ? 'bg-[#284F42] text-white'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                <BarChart3 size={14} />
                상세 데이터 테이블
              </button>
            </div>
          </div>
        </div>

        {/* 기간 요약 KPI 5종 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* 1. 총 예약 객실수 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63]">총 예약 객실수</span>
              <span className="p-1.5 bg-[#284F42]/10 rounded-md text-[#284F42]">
                <CalendarDays size={14} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-[#1B382E] font-mono">
              {loadingDaily ? '-' : condoPeriodKPIs.totalRoomNights.toLocaleString()}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">실</span>
            </div>
            <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
              가용 {loadingDaily ? '-' : condoPeriodKPIs.totalCapNights.toLocaleString()}실 대비
            </div>
          </div>

          {/* 2. 기간 평균 점유율 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63]">기간 평균 점유율</span>
              <span className="p-1.5 bg-[#B59269]/15 rounded-md text-[#B59269]">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-[#284F42] font-mono">
              {loadingDaily ? '-' : `${condoPeriodKPIs.avgOccupancyRate.toFixed(1)}%`}
            </div>
            <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
              일일 점유율 가중 평균
            </div>
          </div>

          {/* 3. 최고 피크일 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63]">최고 예약일 (피크)</span>
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                <Sparkles size={14} />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-rose-700 font-mono">
              {loadingDaily ? '-' : condoPeriodKPIs.peakDate.slice(5)}
            </div>
            <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
              {loadingDaily ? '-' : `${condoPeriodKPIs.peakRooms}실 (${condoPeriodKPIs.peakOccRate.toFixed(1)}%)`}
            </div>
          </div>

          {/* 4. 단체 객실 비중 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63]">단체 객실 비중</span>
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                <Users size={14} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-900 font-mono">
              {loadingDaily ? '-' : `${condoPeriodKPIs.groupRoomShare.toFixed(1)}%`}
            </div>
            <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
              단체 {loadingDaily ? '-' : condoPeriodKPIs.totalGroupRooms.toLocaleString()}실 투숙
            </div>
          </div>

          {/* 5. 총 예상 객실 매출 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63]">총 예상 객실 매출</span>
              <span className="p-1.5 bg-[#B59269]/15 rounded-md text-[#B59269]">
                <Building2 size={14} />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-[#1B382E] font-mono">
              {loadingDaily ? '-' : condoPeriodKPIs.totalEstimatedRevenue.toLocaleString()}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">원</span>
            </div>
            <div className="text-[11px] text-[#5A6B63] mt-1 font-medium">
              예상 객실 매출 SSOT
            </div>
          </div>
        </div>

        {/* 뷰 1: 일자별 카드 뷰 */}
        {upperViewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loadingDaily ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#D0C6BB]/75 p-5 animate-pulse space-y-4 shadow-2xs">
                  <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-16 bg-slate-100 rounded"></div>
                </div>
              ))
            ) : dailyData.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-[#D0C6BB]/75 p-12 text-center text-slate-500">
                선택하신 기간에 등록된 예약 데이터가 없습니다.
              </div>
            ) : (
              dailyData.map(day => {
                const isSelected = selectedDayDetail?.targetDate === day.targetDate;
                const occ = day.occupancyRate ?? 0;
                const occBadgeColor =
                  occ >= 70
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : occ >= 50
                    ? 'bg-emerald-50 text-[#284F42] border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

                const dayOfWeekBadge = day.isSunday
                  ? 'bg-rose-100 text-rose-700'
                  : day.isSaturday
                  ? 'bg-blue-100 text-blue-700'
                  : day.isFriday
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={day.targetDate}
                    onClick={() => setSelectedDayDetail(isSelected ? null : day)}
                    className={`bg-white rounded-2xl border transition-all cursor-pointer p-5 hover:shadow-md ${
                      isSelected
                        ? 'border-[#284F42] ring-2 ring-[#284F42]/20 shadow-md'
                        : 'border-[#D0C6BB]/75 hover:border-[#284F42]/40 shadow-2xs'
                    }`}
                  >
                    {/* Card Header: 날짜 및 점유율 배지 */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black ${dayOfWeekBadge}`}>
                          {day.dayOfWeek}
                        </span>
                        <span className="font-extrabold text-[#1B382E] font-mono text-base">
                          {day.targetDate}
                        </span>
                        {day.targetDate === todayStr && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#284F42] text-white">
                            오늘
                          </span>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border font-mono ${occBadgeColor}`}>
                        {occ.toFixed(1)}%
                      </span>
                    </div>

                    {/* Rooms Gauge & Counts */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-[#5A6B63]">예약 객실수</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#1B382E] font-mono">
                            {day.totalReservedRooms}
                          </span>
                          <span className="text-xs font-semibold text-[#5A6B63] ml-1">
                            / {day.totalCapacity}실
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occ >= 70 ? 'bg-rose-500' : occ >= 50 ? 'bg-[#284F42]' : 'bg-[#B59269]'
                          }`}
                          style={{ width: `${Math.min(occ, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Room Type Breakdown Chips */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center">
                      {day.byRoomType.slice(0, 3).map(rt => (
                        <div key={rt.roomType} className="bg-[#F4F3EE]/80 rounded-lg p-1.5">
                          <div className="text-[10px] font-bold text-[#5A6B63] truncate">{rt.roomType}</div>
                          <div className="text-xs font-extrabold text-[#1B382E] font-mono">
                            {rt.reservedRooms}실
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {rt.rate.toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Group Rooms Footer Info */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[#5A6B63]">
                        <Users size={13} className="text-blue-600" />
                        <span>단체</span>
                        <strong className="text-blue-900 font-mono font-bold">
                          {day.totalGroupRooms}실
                        </strong>
                        <span className="text-[11px] text-slate-400">({day.groupSharePct}%)</span>
                      </div>
                      {day.estimatedRoomRevenue ? (
                        <span className="font-mono text-xs font-bold text-[#284F42]">
                          {(day.estimatedRoomRevenue / 10000).toFixed(0)}만원
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 뷰 2: 상세 그리드 테이블 뷰 */}
        {upperViewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                  <tr>
                    <th className="py-3 px-4">체크인 일자</th>
                    <th className="py-3 px-3 text-center">요일</th>
                    <th className="py-3 px-4 text-right">예약 객실수</th>
                    <th className="py-3 px-3 text-right">점유율</th>
                    <th className="py-3 px-3 text-right">16평</th>
                    <th className="py-3 px-3 text-right">35평</th>
                    <th className="py-3 px-3 text-right">51평</th>
                    <th className="py-3 px-3 text-right">펫룸</th>
                    <th className="py-3 px-3 text-right">단체 객실수</th>
                    <th className="py-3 px-3 text-right">단체 비중</th>
                    <th className="py-3 px-4 text-right">예상 객실 매출</th>
                    <th className="py-3 px-3 text-center">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDaily ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                        예약 데이터를 집계 중입니다...
                      </td>
                    </tr>
                  ) : dailyData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        조회된 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    dailyData.map(day => {
                      const occ = day.occupancyRate ?? 0;
                      const findRoomType = (name: string) => day.byRoomType.find(r => r.roomType.includes(name));
                      const r16 = findRoomType('16평');
                      const r35 = findRoomType('35평');
                      const r51 = findRoomType('51평');
                      const rPet = findRoomType('펫룸');

                      return (
                        <tr
                          key={day.targetDate}
                          onClick={() => setSelectedDayDetail(selectedDayDetail?.targetDate === day.targetDate ? null : day)}
                          className={`hover:bg-[#F4F3EE]/50 transition-colors cursor-pointer ${
                            selectedDayDetail?.targetDate === day.targetDate ? 'bg-[#284F42]/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#1B382E]">
                            {day.targetDate}
                            {day.targetDate === todayStr && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#284F42] text-white">
                                오늘
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                day.isSunday
                                  ? 'text-rose-600 bg-rose-50'
                                  : day.isSaturday
                                  ? 'text-blue-600 bg-blue-50'
                                  : day.isFriday
                                  ? 'text-amber-700 bg-amber-50'
                                  : 'text-slate-600'
                              }`}
                            >
                              {day.dayOfWeek}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#1B382E]">
                            {day.totalReservedRooms}
                            <span className="text-slate-400 font-normal ml-1">/ {day.totalCapacity}실</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                occ >= 70
                                  ? 'bg-rose-50 text-rose-700 font-bold'
                                  : occ >= 50
                                  ? 'bg-emerald-50 text-[#284F42] font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {occ.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {r16 ? `${r16.reservedRooms}실 (${r16.rate.toFixed(0)}%)` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {r35 ? `${r35.reservedRooms}실 (${r35.rate.toFixed(0)}%)` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {r51 ? `${r51.reservedRooms}실 (${r51.rate.toFixed(0)}%)` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {rPet ? `${rPet.reservedRooms}실` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                            {day.totalGroupRooms}실
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-blue-600">
                            {day.groupSharePct}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#284F42]">
                            {day.estimatedRoomRevenue ? `${day.estimatedRoomRevenue.toLocaleString()}원` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              className="text-xs text-[#284F42] font-bold hover:underline"
                            >
                              상세
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 선택 일자 세부 팝업/서브 섹션 (선택 시 표출) */}
        {selectedDayDetail && (
          <div className="bg-white rounded-2xl border-2 border-[#284F42]/30 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-[#284F42] text-white rounded-lg">
                  <Calendar size={18} />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1B382E]">
                    {selectedDayDetail.targetDate} ({selectedDayDetail.dayOfWeek}요일) 체크인 상세 원장
                  </h3>
                  <p className="text-xs text-[#5A6B63]">
                    총 예약 {selectedDayDetail.totalReservedRooms}실 / 가용 {selectedDayDetail.totalCapacity}실 (점유율 {selectedDayDetail.occupancyRate?.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                닫기 ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 좌측: 평형별 예약 및 ADR 현황 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#284F42] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} />
                  평형별 예약 및 기대 수익
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">객실 유형</th>
                        <th className="py-2.5 px-3 text-right">예약 / 가용</th>
                        <th className="py-2.5 px-3 text-right">점유율</th>
                        <th className="py-2.5 px-3 text-right">예상 ADR</th>
                        <th className="py-2.5 px-3 text-right">예상 매출</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDayDetail.byRoomType.map(rt => (
                        <tr key={rt.roomType}>
                          <td className="py-2.5 px-3 font-bold text-[#1B382E]">{rt.roomType}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {rt.reservedRooms} / {rt.capacity}실
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#284F42]">
                            {rt.rate.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {rt.adr ? `${rt.adr.toLocaleString()}원` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B382E]">
                            {rt.estimatedRevenue ? `${rt.estimatedRevenue.toLocaleString()}원` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 우측: 해당 일자 투숙 단체 명단 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} />
                  당일 투숙 단체 명단 ({selectedDayDetail.groups.length}건, 총 {selectedDayDetail.totalGroupRooms}실)
                </h4>
                {selectedDayDetail.groups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
                    당일 투숙 예정인 단체 예약이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {selectedDayDetail.groups.map((g, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#F4F3EE]/50 border border-[#D0C6BB]/60 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-[#1B382E] text-sm">
                            {g.groupName}
                          </div>
                          <div className="text-[11px] text-[#5A6B63] mt-0.5 flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">
                              {g.channel}
                            </span>
                            {g.roomTypeBreakdown && (
                              <span className="text-slate-600">{g.roomTypeBreakdown}</span>
                            )}
                          </div>
                          {g.contactName && (
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <Phone size={11} />
                              {g.contactName} ({g.contactPhone || '-'})
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-blue-900 font-mono">
                            {g.totalRooms}
                          </span>
                          <span className="text-xs font-semibold text-[#5A6B63] ml-0.5">실</span>
                          {g.roomSharePct && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              점유 {g.roomSharePct}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* 3. BOTTOM SECTION: 단체 예약 현황 (따로 구분된 전용 섹션) */}
      {/* ============================================================================ */}
      <div className="pt-6 border-t-2 border-[#D0C6BB]/75 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-900 text-white rounded-xl">
              <Users size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-[#1B382E] tracking-tight">
                  단체 예약 현황
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-900">
                  기업·MICE·세미나 전용
                </span>
              </div>
              <p className="text-xs font-medium text-[#5A6B63] mt-0.5">
                {startDate} ~ {endDate} 기간 내 체크인하는 기업 연수, 세미나, 법인/단체 투숙 상세 원장
              </p>
            </div>
          </div>

          <div className="text-xs text-[#5A6B63] font-medium">
            총 <strong className="text-blue-900 font-bold">{filteredAndSortedGroups.length}</strong>건 조회됨 (전체 {groupList.length}건 중)
          </div>
        </div>

        {/* 단체 요약 지표 카드 5종 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* 1. 총 유치 단체 수 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="text-xs font-bold text-[#5A6B63]">총 유치 단체 건수</div>
            <div className="mt-2 text-2xl font-black text-blue-900 font-mono">
              {loadingGroups ? '-' : (groupSummary?.totalGroups ?? groupList.length).toLocaleString()}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">건</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">기업 및 일반 단체 포함</div>
          </div>

          {/* 2. 총 투숙 인원 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="text-xs font-bold text-[#5A6B63]">총 단체 투숙 인원</div>
            <div className="mt-2 text-2xl font-black text-[#1B382E] font-mono">
              {loadingGroups ? '-' : (groupSummary?.totalPaxFormatted ?? '-')}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">명</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">실 투숙 예정 방문객</div>
          </div>

          {/* 3. 유치 기업 수 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="text-xs font-bold text-[#5A6B63]">유치 기업 수</div>
            <div className="mt-2 text-2xl font-black text-[#284F42] font-mono">
              {loadingGroups ? '-' : (groupSummary?.uniqueCompanies ?? '-')}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">개사</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">순수 법인 고객사</div>
          </div>

          {/* 4. MICE / 세미나 건수 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs">
            <div className="text-xs font-bold text-[#5A6B63]">MICE / 세미나</div>
            <div className="mt-2 text-2xl font-black text-[#B59269] font-mono">
              {loadingGroups ? '-' : (groupSummary?.mice?.groupsCount ?? 0)}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">건</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              연회·대관 결합 행사
            </div>
          </div>

          {/* 5. 단체 총 객실 매출 */}
          <div className="bg-white rounded-xl border border-[#D0C6BB]/75 p-4 shadow-2xs col-span-2 md:col-span-1">
            <div className="text-xs font-bold text-[#5A6B63]">단체 총 매출</div>
            <div className="mt-2 text-xl font-black text-blue-900 font-mono">
              {loadingGroups ? '-' : (groupSummary?.totalRevenueFormatted ?? '-')}
              <span className="text-xs font-bold text-[#5A6B63] ml-1">원</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">PMS 정산 확정 원장</div>
          </div>
        </div>

        {/* 검색 및 필터 컨트롤 바 */}
        <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="단체명, 기업명, 담당자, 전화번호 검색..."
              value={groupSearchQuery}
              onChange={e => setGroupSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F4F3EE] rounded-xl text-xs font-medium text-[#1B382E] placeholder:text-slate-400 outline-none border border-transparent focus:border-[#284F42]"
            />
          </div>

          {/* Filters & Sorters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Segment Tabs */}
            <div className="inline-flex bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/50 text-xs">
              <button
                type="button"
                onClick={() => setGroupSegmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  groupSegmentFilter === 'ALL'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setGroupSegmentFilter('SEMINAR')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  groupSegmentFilter === 'SEMINAR'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                기업 세미나
              </button>
              <button
                type="button"
                onClick={() => setGroupSegmentFilter('CORP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  groupSegmentFilter === 'CORP'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                기업 휴양소
              </button>
              <button
                type="button"
                onClick={() => setGroupSegmentFilter('COMP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  groupSegmentFilter === 'COMP'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                COMP/사내
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F4F3EE] px-3 py-1.5 rounded-xl border border-[#D0C6BB]/50 text-xs">
              <ArrowUpDown size={14} className="text-[#5A6B63]" />
              <select
                value={groupSortBy}
                onChange={e => setGroupSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-[#1B382E] outline-none cursor-pointer"
              >
                <option value="checkIn">입실일순</option>
                <option value="rooms">객실수순</option>
                <option value="pax">투숙인원순</option>
              </select>
              <button
                type="button"
                onClick={() => setGroupSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="ml-1 text-[11px] font-extrabold text-[#284F42] hover:underline"
              >
                {groupSortOrder === 'asc' ? '↑오름차순' : '↓내림차순'}
              </button>
            </div>
          </div>
        </div>

        {/* 단체 리스트 테이블 */}
        <div className="bg-white rounded-2xl border border-[#D0C6BB]/75 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                <tr>
                  <th className="py-3.5 px-4">입실일 ~ 퇴실일</th>
                  <th className="py-3.5 px-4">단체명 / 고객사명</th>
                  <th className="py-3.5 px-3">유형</th>
                  <th className="py-3.5 px-3 text-right">객실수</th>
                  <th className="py-3.5 px-3 text-right">인원</th>
                  <th className="py-3.5 px-4">평형 구성</th>
                  <th className="py-3.5 px-4">고객사 담당자</th>
                  <th className="py-3.5 px-3">영업 담당자</th>
                  <th className="py-3.5 px-3 text-right">매출액</th>
                  <th className="py-3.5 px-3 text-center">비고/상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingGroups ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      단체 예약 원장을 불러오는 중입니다...
                    </td>
                  </tr>
                ) : filteredAndSortedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      해당 조건에 일치하는 단체 예약 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedGroups.map((group, idx) => {
                    const rowKey = group.groupId || `${group.checkInDate}-${idx}`;
                    const isExpanded = expandedGroupIds.has(rowKey);
                    const rooms = group.spendingBreakdown?.roomsCount ?? group.roomsCount ?? 0;
                    const roomTypes = group.spendingBreakdown?.roomTypesUsed || [];

                    const isSeminar = group.category === 'SEMINAR' || (group.categoryName && group.categoryName.includes('세미나'));
                    const isComp = !isSeminar && (group.b2bSegment === 'COMP' || (group.b2bSegmentName && group.b2bSegmentName.includes('무상')));

                    const segmentBadge =
                      isSeminar
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : isComp
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                    return (
                      <React.Fragment key={rowKey}>
                        <tr className="hover:bg-[#F4F3EE]/50 transition-colors">
                          {/* 1. 입실일 ~ 퇴실일 */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#1B382E]">
                              {group.checkInDate}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ~ {group.checkOutDate} ({group.stayDays || 1}박)
                            </div>
                          </td>

                          {/* 2. 단체명 */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#1B382E] text-sm">
                              {group.groupName || group.corporateName || '단체'}
                            </div>
                            {group.corporateName && group.corporateName !== group.groupName && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                {group.corporateName}
                              </div>
                            )}
                          </td>

                          {/* 3. 유형 */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${segmentBadge}`}>
                              {isSeminar ? '기업 세미나' : isComp ? '무상/사내' : (group.categoryName || group.b2bSegmentName || '일반단체')}
                            </span>
                          </td>

                          {/* 4. 객실수 */}
                          <td className="py-3.5 px-3 text-right font-mono font-extrabold text-[#1B382E] text-sm whitespace-nowrap">
                            {rooms.toLocaleString()}
                            <span className="text-xs font-normal text-slate-400 ml-0.5">실</span>
                          </td>

                          {/* 5. 인원 */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                            {group.paxCountFormatted || (group.paxCount ? group.paxCount.toLocaleString() : '-')}
                            <span className="text-xs font-normal text-slate-400 ml-0.5">명</span>
                          </td>

                          {/* 6. 평형 구성 */}
                          <td className="py-3.5 px-4">
                            {roomTypes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {roomTypes.map((rt, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-medium"
                                  >
                                    {rt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* 7. 고객사 담당자 */}
                          <td className="py-3.5 px-4">
                            {group.contactName ? (
                              <div>
                                <div className="font-bold text-[#1B382E]">{group.contactName}</div>
                                {group.contactPhone && (
                                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone size={10} />
                                    {group.contactPhone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* 8. 영업 담당자 */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-600">
                            {group.salesManager || '-'}
                          </td>

                          {/* 9. 매출액 */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-900 whitespace-nowrap">
                            {group.totalRevenueFormatted ? `${group.totalRevenueFormatted}원` : '-'}
                          </td>

                          {/* 10. 비고/상세 버튼 */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {group.notes ? (
                              <button
                                type="button"
                                onClick={() => toggleGroupExpand(rowKey)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#284F42] bg-[#284F42]/10 hover:bg-[#284F42]/20 px-2.5 py-1 rounded-md transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    접기 <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    비고 <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>

                        {/* 비고 및 요청사항 확장 행 */}
                        {isExpanded && group.notes && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={10} className="py-3 px-6 text-xs text-slate-700">
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <div className="font-bold text-[#1B382E] mb-1 flex items-center gap-1.5 text-xs">
                                  <Info size={13} className="text-[#284F42]" />
                                  행사 요청사항 및 비고 내역
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">
                                  {group.notes}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
