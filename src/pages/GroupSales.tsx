import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';
import { formatRevenue, formatFinancialKorean } from '../utils/formatters';
import { 
  Building2, 
  DollarSign, 
  Users, 
  RefreshCw, 
  BedDouble, 
  TrendingUp, 
  Globe, 
  Plane, 
  PhoneCall, 
  ChevronDown, 
  ChevronUp, 
  Table, 
  Grid, 
  Coins, 
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import type { CorporateGroupSalesV2Response } from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

interface RawChannelRoomItem {
  channel_name?: string;
  channelName?: string;
  channel?: string;
  room_type?: string;
  roomType?: string;
  todayRooms?: number | string;
  todayRevenue?: number | string;
  todayAdr?: number | string;
  adr?: number | string;
  mtdRooms?: number | string;
  mtdRevenue?: number | string;
  mtdAdr?: number | string;
  ytdRooms?: number | string;
  ytdRevenue?: number | string;
  ytdAdr?: number | string;
}

interface SegmentItem {
  roomType: string;
  roomsSold: number;
  revenue: number;
  adr: number;
  guests: number;
  channelSharePct: number;
  grandSharePct: number;
}

interface ChannelGroup {
  channelName: string;
  iconType: 'group' | 'corporate' | 'direct' | 'ota' | 'phone' | 'etc';
  badgeColor: string;
  totalRooms: number;
  totalRevenue: number;
  totalGuests: number;
  averageAdr: number;
  revenueSharePct: number;
  items: SegmentItem[];
}

// 평형별 대표 투숙 정원 (인원수 환산용)
const getRoomCapacity = (roomType: string): number => {
  if (roomType.includes('51') || roomType.includes('R51')) return 6;
  if (roomType.includes('35')) return 4;
  if (roomType.includes('16')) return 2;
  if (roomType.includes('부대') || roomType.includes('기타')) return 0;
  return 2;
};

// 채널별 시각적 아이콘 & 테마 색상 매핑
const getChannelMeta = (channelName: string): { iconType: ChannelGroup['iconType']; badgeColor: string; label: string } => {
  if (channelName.includes('세미나') || channelName.includes('단체영업')) {
    return { iconType: 'group', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: '단체영업' };
  }
  if (channelName.includes('휴양소') || channelName.includes('기업영업')) {
    return { iconType: 'corporate', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', label: '기업영업' };
  }
  if (channelName.includes('홈페이지') || channelName.includes('APP') || channelName.includes('자사')) {
    return { iconType: 'direct', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '자사 채널' };
  }
  if (channelName.includes('여행사') || channelName.includes('OTA')) {
    return { iconType: 'ota', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200', label: '온라인 여행사' };
  }
  if (channelName.includes('전화') || channelName.includes('예약실') || channelName.includes('메신저')) {
    return { iconType: 'phone', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200', label: '전화/예약실' };
  }
  return { iconType: 'etc', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', label: '부대/기타' };
};

export default function GroupSales() {
  const { startDate, endDate, setStartDate, setEndDate } = useDate();
  
  const [data, setData] = useState<CorporateGroupSalesV2Response | null>(null);
  const [channelRawData, setChannelRawData] = useState<RawChannelRoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 뷰 모드: CHANNEL_FIRST(판매방식별 그룹), PIVOT_MATRIX(크로스 피벗 매트릭스), SEGMENT_FIRST(평형별 그룹)
  const [viewMode, setViewMode] = useState<'CHANNEL_FIRST' | 'PIVOT_MATRIX' | 'SEGMENT_FIRST'>('CHANNEL_FIRST');
  
  // 펼침/접힘 상태 관리 (기본 모두 펼침)
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  
  // 0실/0원 항목 제외 필터
  const [hideZeroSales, setHideZeroSales] = useState<boolean>(true);

  const applyPreset = (preset: DatePresetType) => {
    const range = getPresetDateRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const isPresetActive = (preset: DatePresetType) => {
    const p = getPresetDateRange(preset);
    if (p.isRange) {
      return startDate === p.startDate && endDate === p.endDate;
    }
    return startDate === p.startDate && !endDate;
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const queryParams = endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `startDate=${startDate}&endDate=${startDate}`;

      // 1. 전체 메타 요약용 corporate-group-sales-v2
      // 2. 판매방식 × 평형별 세그먼트 교차 데이터용 room-channel-sales
      const [groupRes, channelRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales-v2?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/room-channel-sales?${queryParams}`).catch(() => null)
      ]);

      if (groupRes?.data && groupRes.data.success) {
        setData(groupRes.data);
      } else if (groupRes && groupRes.success) {
        setData(groupRes);
      } else {
        setData(null);
      }

      if (channelRes?.data && Array.isArray(channelRes.data)) {
        setChannelRawData(channelRes.data);
      } else if (Array.isArray(channelRes)) {
        setChannelRawData(channelRes);
      } else {
        setChannelRawData([]);
      }
    } catch (err) {
      console.error('Group / Channel Room Sales Fetch Error:', err);
      setData(null);
      setChannelRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]);

  // 🏛️ 판매방식(채널)별 × 평형별 세그먼트 정규화 및 집계
  const { channelGroups, grandTotals, uniqueRoomTypes, segmentGroups } = useMemo(() => {
    let grandRevenue = 0;
    let grandRooms = 0;
    let grandGuests = 0;

    const channelMap = new Map<string, RawChannelRoomItem[]>();
    const segmentMap = new Map<string, { channelName: string; rooms: number; revenue: number; adr: number; guests: number }[]>();
    const roomTypeSet = new Set<string>();

    channelRawData.forEach(item => {
      const channel = String(item.channelName || item.channel_name || item.channel || '기타채널').trim();
      const room = String(item.roomType || item.room_type || '기타').trim();

      // 전체 소계 레코드(isGrandTotal, isChannelSubtotal)는 제외하고 세부 조합 항목만 파싱
      if (channel === '총합계' || room === '전체') return;

      const rooms = Number(item.todayRooms ?? item.mtdRooms ?? 0);
      const revenue = Number(item.todayRevenue ?? item.mtdRevenue ?? 0);
      
      // 0원/0실 필터링
      if (hideZeroSales && rooms <= 0 && revenue === 0) return;

      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(item);

      grandRevenue += revenue;
      grandRooms += rooms;
      grandGuests += rooms * getRoomCapacity(room);

      roomTypeSet.add(room);

      // 평형 기준 맵에도 보관
      if (!segmentMap.has(room)) {
        segmentMap.set(room, []);
      }
      segmentMap.get(room)!.push({
        channelName: channel,
        rooms,
        revenue,
        adr: Number(item.todayAdr ?? item.adr ?? (rooms > 0 ? Math.round(revenue / rooms) : 0)),
        guests: rooms * getRoomCapacity(room)
      });
    });

    // 1. 판매방식별 그룹 생성
    const groups: ChannelGroup[] = [];

    channelMap.forEach((items, chName) => {
      let chRooms = 0;
      let chRev = 0;
      let chGuests = 0;

      const segItems: SegmentItem[] = [];

      items.forEach(raw => {
        const rType = String(raw.roomType || raw.room_type || '기타').trim();
        const rooms = Number(raw.todayRooms ?? raw.mtdRooms ?? 0);
        const rev = Number(raw.todayRevenue ?? raw.mtdRevenue ?? 0);
        const adr = Number(raw.todayAdr ?? raw.adr ?? (rooms > 0 ? Math.round(rev / rooms) : 0));
        const guests = rooms * getRoomCapacity(rType);

        chRooms += rooms;
        chRev += rev;
        chGuests += guests;

        segItems.push({
          roomType: rType,
          roomsSold: rooms,
          revenue: rev,
          adr,
          guests,
          channelSharePct: 0, // 아래에서 채널 총합 후 계산
          grandSharePct: grandRevenue > 0 ? (rev / grandRevenue) * 100 : 0
        });
      });

      // 채널 내 비중 채우기
      segItems.forEach(si => {
        si.channelSharePct = chRev > 0 ? (si.revenue / chRev) * 100 : 0;
      });

      // 평형 정렬 (51평 -> 35평 -> 16평 -> R51 -> 펫룸 -> 기타)
      const rankOrder = (name: string) => {
        if (name.includes('51') && !name.includes('펫') && !name.includes('R')) return 1;
        if (name.includes('35') && !name.includes('펫')) return 2;
        if (name.includes('16') && !name.includes('펫')) return 3;
        if (name.includes('R51')) return 4;
        if (name.includes('펫룸 51')) return 5;
        if (name.includes('펫룸 35')) return 6;
        if (name.includes('펫룸 16')) return 7;
        if (name.includes('부대') || name.includes('위약금')) return 9;
        return 8;
      };

      segItems.sort((a, b) => rankOrder(a.roomType) - rankOrder(b.roomType) || b.revenue - a.revenue);

      const meta = getChannelMeta(chName);

      groups.push({
        channelName: chName,
        iconType: meta.iconType,
        badgeColor: meta.badgeColor,
        totalRooms: chRooms,
        totalRevenue: chRev,
        totalGuests: chGuests,
        averageAdr: chRooms > 0 ? Math.round(chRev / chRooms) : 0,
        revenueSharePct: grandRevenue > 0 ? (chRev / grandRevenue) * 100 : 0,
        items: segItems
      });
    });

    // 판매방식 정렬: 매출액 기준 내림차순
    groups.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 2. 평형(세그먼트) 기준 그룹 생성
    const segGroups = Array.from(segmentMap.entries()).map(([roomType, chList]) => {
      const totalRooms = chList.reduce((s, c) => s + c.rooms, 0);
      const totalRev = chList.reduce((s, c) => s + c.revenue, 0);
      const totalGuests = chList.reduce((s, c) => s + c.guests, 0);
      return {
        roomType,
        totalRooms,
        totalRevenue: totalRev,
        totalGuests,
        averageAdr: totalRooms > 0 ? Math.round(totalRev / totalRooms) : 0,
        grandSharePct: grandRevenue > 0 ? (totalRev / grandRevenue) * 100 : 0,
        channels: chList.sort((a, b) => b.revenue - a.revenue)
      };
    });

    segGroups.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const sortedRoomTypes = Array.from(roomTypeSet).sort((a, b) => {
      const orderA = a.includes('51') ? 1 : a.includes('35') ? 2 : a.includes('16') ? 3 : 4;
      const orderB = b.includes('51') ? 1 : b.includes('35') ? 2 : b.includes('16') ? 3 : 4;
      return orderA - orderB;
    });

    return {
      channelGroups: groups,
      grandTotals: {
        revenue: grandRevenue,
        rooms: grandRooms,
        guests: grandGuests,
        adr: grandRooms > 0 ? Math.round(grandRevenue / grandRooms) : 0
      },
      uniqueRoomTypes: sortedRoomTypes,
      segmentGroups: segGroups
    };
  }, [channelRawData, hideZeroSales]);

  // 채널 접기/펼치기 토글
  const toggleChannel = (channelName: string) => {
    setExpandedChannels(prev => ({
      ...prev,
      [channelName]: prev[channelName] === undefined ? false : !prev[channelName]
    }));
  };

  // 평형 접기/펼치기 토글
  const toggleSegment = (roomType: string) => {
    setExpandedSegments(prev => ({
      ...prev,
      [roomType]: prev[roomType] === undefined ? false : !prev[roomType]
    }));
  };

  const isChannelExpanded = (channelName: string) => expandedChannels[channelName] !== false;
  const isSegmentExpanded = (roomType: string) => expandedSegments[roomType] !== false;

  const toggleAllChannels = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    channelGroups.forEach(g => {
      newState[g.channelName] = expand;
    });
    setExpandedChannels(newState);
  };

  const summary = data?.meta?.summary;
  const displayTotalRevenue = grandTotals.revenue > 0 ? grandTotals.revenue : (summary?.totalRevenue || 0);
  const displayTotalRooms = grandTotals.rooms > 0 ? grandTotals.rooms : (summary?.totalRoomsSold || 0);
  const displayTotalGuests = grandTotals.guests > 0 ? grandTotals.guests : (summary?.totalGuests || 0);
  const displayAdr = grandTotals.adr > 0 ? grandTotals.adr : (summary?.adr || 0);

  const revenueFinancial = formatFinancialKorean(displayTotalRevenue);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header with Institutional Polish */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-brand-mint/10 text-brand-mint rounded-2xl border border-brand-mint/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-keep whitespace-nowrap">
                세일즈본부 객실 판매 실적
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                판매방식 × 세그먼트 교차 분석
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 break-keep">
              판매방식(채널)별로 각 평형별(세그먼트) 판매 실적과 단가(ADR)를 정밀 분석합니다. (순매출/VAT 제외)
            </p>
          </div>
        </div>

        {/* Global Date & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { key: 'WEEK', label: '최근 7일' },
              { key: 'MTD', label: '당월' },
              { key: 'PAST_6M', label: '6개월' },
              { key: 'YTD', label: '연간' }
            ].map(p => {
              const active = isPresetActive(p.key as DatePresetType);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key as DatePresetType)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active ? 'bg-brand-mint text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <GlobalDatePicker showPresets={false} />
          <button
            onClick={fetchSalesData}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            조회
          </button>
        </div>
      </div>

      {/* 2. Executive Summary Cards (4-Grid with Financial Typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign size={16} className="text-brand-mint" /> 
              <span>총 매출액</span>
              <MetricExplainerTooltip presetKey="netRevenue" />
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
              순매출
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
                {formatRevenue(displayTotalRevenue)}
              </span>
              <span className="text-sm font-semibold text-slate-400">원</span>
            </div>
            <div className="text-xs font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md inline-block">
              {revenueFinancial.formatted}
            </div>
          </div>
        </div>

        {/* Card 2: Rooms Sold */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BedDouble size={16} className="text-brand-mint" /> 
              <span>총 판매 객실</span>
              <MetricExplainerTooltip presetKey="occupancy" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              계약 실적
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayTotalRooms.toLocaleString()}
              <span className="text-base font-semibold text-slate-400 ml-1">실</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              전체 세그먼트 합산 판매 객실
            </p>
          </div>
        </div>

        {/* Card 3: Total Guests */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <Users size={16} className="text-brand-mint" /> 
              <span>총 투숙객</span>
              <MetricExplainerTooltip presetKey="visitorCount" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              정원 기준 환산
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayTotalGuests.toLocaleString()}
              <span className="text-base font-semibold text-slate-400 ml-1">명</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              판매 평형별 정원 기반 투숙 인원
            </p>
          </div>
        </div>

        {/* Card 4: ADR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp size={16} className="text-brand-mint" /> 
              <span>평균 객단가 (ADR)</span>
              <MetricExplainerTooltip presetKey="adr" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              전사 평균
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {formatRevenue(displayAdr)}
              <span className="text-base font-semibold text-slate-400 ml-1">원</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              총 매출액 ÷ 판매 객실 수
            </p>
          </div>
        </div>

      </div>

      {/* 3. View Switcher & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('CHANNEL_FIRST')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'CHANNEL_FIRST'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table size={14} className="text-brand-mint" />
            <span>판매방식별 그룹 리포트 (추천)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('PIVOT_MATRIX')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'PIVOT_MATRIX'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid size={14} className="text-indigo-600" />
            <span>크로스 피벗 매트릭스</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('SEGMENT_FIRST')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'SEGMENT_FIRST'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChartIcon size={14} className="text-emerald-600" />
            <span>평형(세그먼트) 기준 뷰</span>
          </button>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideZeroSales}
              onChange={(e) => setHideZeroSales(e.target.checked)}
              className="rounded text-brand-mint focus:ring-brand-mint cursor-pointer"
            />
            <span>실적 있는 항목만 보기</span>
          </label>

          {viewMode === 'CHANNEL_FIRST' && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={() => toggleAllChannels(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
              >
                전체 펼치기
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => toggleAllChannels(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
              >
                전체 접기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Main Data Presentation Section */}

      {/* VIEW 1: 📑 판매방식(채널)별 그룹 리포트 (사용자 핵심 요청사항) */}
      {viewMode === 'CHANNEL_FIRST' && (
        <div className="space-y-5">
          {channelGroups.map((group) => {
            const isExpanded = isChannelExpanded(group.channelName);
            const channelFinancial = formatFinancialKorean(group.totalRevenue);

            return (
              <div 
                key={group.channelName}
                className="bg-white rounded-[24px] border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Channel Header Summary Bar */}
                <div 
                  onClick={() => toggleChannel(group.channelName)}
                  className="p-5 sm:p-6 bg-slate-50/70 hover:bg-slate-50 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      {group.iconType === 'group' && <Users className="w-5 h-5 text-indigo-600" />}
                      {group.iconType === 'corporate' && <Building2 className="w-5 h-5 text-blue-600" />}
                      {group.iconType === 'direct' && <Globe className="w-5 h-5 text-emerald-600" />}
                      {group.iconType === 'ota' && <Plane className="w-5 h-5 text-sky-600" />}
                      {group.iconType === 'phone' && <PhoneCall className="w-5 h-5 text-amber-600" />}
                      {group.iconType === 'etc' && <Coins className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight">
                          {group.channelName}
                        </h3>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${group.badgeColor}`}>
                          {group.items.length}개 평형
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        전사 객실 매출 기여도: <strong className="text-slate-700 font-semibold">{group.revenueSharePct.toFixed(1)}%</strong>
                      </p>
                    </div>
                  </div>

                  {/* Channel Summary Metrics Pills */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-wrap font-financial">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">판매 객실</div>
                      <div className="text-base font-extrabold text-slate-800">
                        {group.totalRooms.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-0.5">실</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">채널 총매출</div>
                      <div className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center justify-end gap-1.5">
                        <span>{formatRevenue(group.totalRevenue)}원</span>
                        <span className="text-[11px] font-bold text-brand-mint bg-brand-mint/10 px-1.5 py-0.2 rounded hidden sm:inline">
                          {channelFinancial.short}
                        </span>
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] text-slate-400 font-medium">평균 ADR</div>
                      <div className="text-base font-bold text-slate-700">
                        {formatRevenue(group.averageAdr)}원
                      </div>
                    </div>

                    <div className="text-right pl-2 border-l border-slate-200">
                      <div className="text-[11px] text-slate-400 font-medium">전사 비중</div>
                      <div className="text-base font-black text-emerald-700">
                        {group.revenueSharePct.toFixed(1)}%
                      </div>
                    </div>

                    <div className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Segment Breakdown Table inside Channel */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200/80 text-xs font-bold text-slate-600">
                          <th className="py-3 px-6 whitespace-nowrap">평형 (세그먼트)</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">판매 객실</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">매출액 (순매출)</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">예상 투숙객</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">객단가 (ADR)</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">채널 내 비중</th>
                          <th className="py-3 px-6 text-right whitespace-nowrap">전사 기여도</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-financial">
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{item.roomType}</span>
                                {item.roomType.includes('51') && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                                    대형
                                  </span>
                                )}
                                {item.roomType.includes('펫룸') && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60">
                                    반려견
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-sm text-right font-medium text-slate-700 whitespace-nowrap">
                              {item.roomsSold.toLocaleString()}실
                            </td>
                            <td className="py-3.5 px-4 text-sm text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatRevenue(item.revenue)}원
                            </td>
                            <td className="py-3.5 px-4 text-sm text-right text-slate-600 whitespace-nowrap">
                              {item.guests > 0 ? `${item.guests.toLocaleString()}명` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-right font-semibold text-slate-700 whitespace-nowrap">
                              {item.adr > 0 ? `${formatRevenue(item.adr)}원` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-right font-bold text-slate-800 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="bg-brand-mint h-full rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(0, item.channelSharePct))}%` }} 
                                  />
                                </div>
                                <span>{item.channelSharePct.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-sm text-right font-medium text-slate-500 whitespace-nowrap">
                              {item.grandSharePct.toFixed(1)}%
                            </td>
                          </tr>
                        ))}

                        {/* Channel Subtotal Row */}
                        <tr className="bg-slate-100/70 border-t-2 border-slate-200 font-bold text-slate-900">
                          <td className="py-3.5 px-6 text-sm">
                            <span className="text-brand-mint font-black">[{group.channelName} 소계]</span>
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right font-black">
                            {group.totalRooms.toLocaleString()}실
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right font-black text-slate-900">
                            {formatRevenue(group.totalRevenue)}원
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right">
                            {group.totalGuests.toLocaleString()}명
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right text-brand-mint font-extrabold">
                            {formatRevenue(group.averageAdr)}원
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right">
                            100.0%
                          </td>
                          <td className="py-3.5 px-6 text-sm text-right text-emerald-700 font-extrabold">
                            {group.revenueSharePct.toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {channelGroups.length === 0 && !loading && (
            <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200">
              해당 기간의 판매방식별 객실 실적 데이터가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: 📊 크로스 피벗 매트릭스 (행=판매방식, 열=평형) */}
      {viewMode === 'PIVOT_MATRIX' && (
        <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Grid size={18} className="text-indigo-600" />
                판매방식 × 평형별 교차 실적 매트릭스 (Pivot)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                행(판매 채널)과 열(객실 평형)의 교차 매출액 및 [판매실수 / ADR]을 한눈에 조망합니다.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              상단: 매출액 (원) / 하단: 판매실수 (ADR)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-financial text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold">
                  <th className="py-3.5 px-4 sticky left-0 bg-slate-100 z-10 whitespace-nowrap min-w-[150px]">
                    판매방식 (채널)
                  </th>
                  {uniqueRoomTypes.map(rt => (
                    <th key={rt} className="py-3.5 px-3 text-right whitespace-nowrap min-w-[120px]">
                      {rt}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right bg-slate-200 text-slate-900 font-black whitespace-nowrap min-w-[140px]">
                    채널 총합계
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {channelGroups.map(group => {
                  const itemByRoom = new Map(group.items.map(i => [i.roomType, i]));

                  return (
                    <tr key={group.channelName} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white z-10 whitespace-nowrap border-r border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand-mint" />
                          <span>{group.channelName}</span>
                        </div>
                      </td>

                      {uniqueRoomTypes.map(rt => {
                        const cell = itemByRoom.get(rt);
                        if (!cell || (cell.roomsSold === 0 && cell.revenue === 0)) {
                          return (
                            <td key={rt} className="py-3 px-3 text-right text-slate-300 font-normal">
                              -
                            </td>
                          );
                        }
                        return (
                          <td key={rt} className="py-3 px-3 text-right">
                            <div className="font-extrabold text-slate-900">
                              {formatRevenue(cell.revenue)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {cell.roomsSold}실 · {cell.adr > 0 ? `${formatRevenue(cell.adr)}원` : '-'}
                            </div>
                          </td>
                        );
                      })}

                      {/* Channel Row Grand Total */}
                      <td className="py-3 px-4 text-right bg-slate-50/80 font-black text-slate-900 border-l border-slate-200">
                        <div className="font-black text-slate-900 text-sm">
                          {formatRevenue(group.totalRevenue)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {group.totalRooms}실 · ADR {formatRevenue(group.averageAdr)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Column Totals Row */}
                <tr className="bg-slate-200/80 border-t-2 border-slate-400 font-black text-slate-900">
                  <td className="py-3.5 px-4 sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                    전사 평형별 합계
                  </td>
                  {uniqueRoomTypes.map(rt => {
                    const colRooms = channelGroups.reduce((sum, g) => {
                      const item = g.items.find(i => i.roomType === rt);
                      return sum + (item?.roomsSold || 0);
                    }, 0);
                    const colRev = channelGroups.reduce((sum, g) => {
                      const item = g.items.find(i => i.roomType === rt);
                      return sum + (item?.revenue || 0);
                    }, 0);
                    const colAdr = colRooms > 0 ? Math.round(colRev / colRooms) : 0;

                    return (
                      <td key={rt} className="py-3.5 px-3 text-right">
                        <div className="font-black text-slate-900">
                          {formatRevenue(colRev)}
                        </div>
                        <div className="text-[10px] text-slate-600 font-bold">
                          {colRooms}실 {colAdr > 0 && `· ${formatRevenue(colAdr)}`}
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-3.5 px-4 text-right bg-slate-300 font-black text-slate-950">
                    <div className="text-sm font-black">
                      {formatRevenue(grandTotals.revenue)}원
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold">
                      {grandTotals.rooms}실 · ADR {formatRevenue(grandTotals.adr)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: 🏛️ 평형(세그먼트) 기준 뷰 (평형별 드릴다운) */}
      {viewMode === 'SEGMENT_FIRST' && (
        <div className="space-y-4">
          {segmentGroups.map((seg) => {
            const isExpanded = isSegmentExpanded(seg.roomType);
            const segFinancial = formatFinancialKorean(seg.totalRevenue);

            return (
              <div 
                key={seg.roomType}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                <div 
                  onClick={() => toggleSegment(seg.roomType)}
                  className="p-5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-brand-mint font-black text-sm">
                      {seg.roomType.replace('평', '')}P
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{seg.roomType}</h4>
                        <span className="text-xs text-slate-400 font-normal">({seg.channels.length}개 판매채널)</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        전사 객실 매출 비중: <strong className="text-slate-700 font-semibold">{seg.grandSharePct.toFixed(1)}%</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 font-financial text-right">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">판매 실적</div>
                      <div className="text-sm font-extrabold text-slate-800">{seg.totalRooms.toLocaleString()}실</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">평형 총매출</div>
                      <div className="text-base font-extrabold text-slate-900 flex items-center justify-end gap-1">
                        <span>{formatRevenue(seg.totalRevenue)}원</span>
                        <span className="text-[10px] font-bold text-brand-mint bg-brand-mint/10 px-1.5 py-0.2 rounded hidden sm:inline">
                          {segFinancial.short}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">평균 ADR</div>
                      <div className="text-sm font-bold text-slate-700">{formatRevenue(seg.averageAdr)}원</div>
                    </div>
                    <div className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-financial">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500 font-bold">
                          <th className="py-2.5 px-4">판매방식 (채널)</th>
                          <th className="py-2.5 px-4 text-right">판매 객실</th>
                          <th className="py-2.5 px-4 text-right">매출액</th>
                          <th className="py-2.5 px-4 text-right">ADR</th>
                          <th className="py-2.5 px-4 text-right">해당 평형 내 비중</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seg.channels.map((ch, idx) => {
                          const pct = seg.totalRevenue > 0 ? (ch.revenue / seg.totalRevenue) * 100 : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{ch.channelName}</td>
                              <td className="py-2.5 px-4 text-right">{ch.rooms}실</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatRevenue(ch.revenue)}원</td>
                              <td className="py-2.5 px-4 text-right">{ch.adr > 0 ? `${formatRevenue(ch.adr)}원` : '-'}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-brand-mint">{pct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Insight & Strategy Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[24px] p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-brand-mint shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">경영진 세일즈 전략 의사결정 인사이트</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              단체영업(세미나)의 16평 대량 점유와 자사 홈페이지/APP의 51평 프리미엄 단가(ADR) 방어 효과를 교차 분석하여 패키지 가격 정책을 최적화하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-[11px] font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 text-slate-200">
            SSOT 교차 분석 Ver 6.0
          </span>
        </div>
      </div>

    </div>
  );
}
