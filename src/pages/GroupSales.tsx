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
  Table, 
  Grid, 
  Coins, 
  Sparkles,
  Layers
} from 'lucide-react';

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
  
  const [channelRawData, setChannelRawData] = useState<RawChannelRoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 🎯 사용자의 핵심 요구사항: 세일즈본부는 '단체영업(세미나)'이 주력이므로 기본값 고정
  const [selectedChannel, setSelectedChannel] = useState<string>('단체영업(세미나)');
  
  // 뷰 모드: FOCUS_SINGLE(선택된 판매방식 집중 뷰 - 기본), PIVOT_MATRIX(크로스 피벗 매트릭스), ALL_CHANNELS(전체 판매방식 목록)
  const [viewMode, setViewMode] = useState<'FOCUS_SINGLE' | 'PIVOT_MATRIX' | 'ALL_CHANNELS'>('FOCUS_SINGLE');
  
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

      // 판매방식 × 평형별 세그먼트 교차 데이터 (SSOT API)
      const channelRes = await secureFetcher(`${API_BASE}/api/v6/report/room-channel-sales?${queryParams}`).catch(() => null);

      if (channelRes?.data && Array.isArray(channelRes.data)) {
        setChannelRawData(channelRes.data);
      } else if (Array.isArray(channelRes)) {
        setChannelRawData(channelRes);
      } else {
        setChannelRawData([]);
      }
    } catch (err) {
      console.error('Channel Room Sales Fetch Error:', err);
      setChannelRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]);

  // 🏛️ 판매방식(채널)별 × 평형별 세그먼트 정규화 및 집계
  const { channelGroups, grandTotals, uniqueRoomTypes, availableChannels } = useMemo(() => {
    let grandRevenue = 0;
    let grandRooms = 0;
    let grandGuests = 0;

    const channelMap = new Map<string, RawChannelRoomItem[]>();
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
          channelSharePct: 0,
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
      availableChannels: groups.map(g => g.channelName)
    };
  }, [channelRawData, hideZeroSales]);

  // 🎯 현재 활성화된 채널 그룹 (기본: 단체영업(세미나))
  const activeChannelGroup = useMemo(() => {
    if (selectedChannel === 'ALL') return null;
    return channelGroups.find(g => g.channelName === selectedChannel || g.channelName.includes(selectedChannel)) 
      || channelGroups.find(g => g.channelName.includes('단체영업')) 
      || channelGroups[0] 
      || null;
  }, [channelGroups, selectedChannel]);

  // 상단 4대 KPI 지표 계산 (선택 채널 vs 전사)
  const isAllMode = selectedChannel === 'ALL';
  const displayRevenue = isAllMode ? grandTotals.revenue : (activeChannelGroup?.totalRevenue || 0);
  const displayRooms = isAllMode ? grandTotals.rooms : (activeChannelGroup?.totalRooms || 0);
  const displayGuests = isAllMode ? grandTotals.guests : (activeChannelGroup?.totalGuests || 0);
  const displayAdr = isAllMode ? grandTotals.adr : (activeChannelGroup?.averageAdr || 0);

  const displayRevenueFinancial = formatFinancialKorean(displayRevenue);
  const grandRevenueFinancial = formatFinancialKorean(grandTotals.revenue);

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
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                주력: 단체영업(세미나)
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 break-keep">
              세일즈본부 핵심 주력 사업인 단체영업(세미나)을 중심으로 각 평형별 실적을 집중 분석합니다.
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

      {/* 2. 🎯 [CORE CONTROL] 판매방식 드롭다운 선택기 & 뷰 모드 툴바 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Channel Selector Dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
            <Building2 size={18} className="text-brand-mint" />
            <span>판매방식 선택:</span>
          </span>

          <div className="relative inline-flex items-center">
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                if (e.target.value === 'ALL') {
                  setViewMode('PIVOT_MATRIX');
                } else {
                  setViewMode('FOCUS_SINGLE');
                }
              }}
              className="bg-slate-50 hover:bg-slate-100 border-2 border-brand-mint text-slate-900 text-sm font-extrabold rounded-xl px-4 py-2 pr-10 outline-none shadow-2xs focus:ring-2 focus:ring-brand-mint/40 cursor-pointer appearance-none transition-colors"
            >
              {availableChannels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch.includes('단체영업') || ch.includes('세미나') ? `👥 ${ch} ★ 주력 사업` : `🏢 ${ch}`}
                </option>
              ))}
              <option value="ALL">📊 [전체 통합] 모든 판매방식 비교하기</option>
            </select>
            <ChevronDown size={16} className="text-slate-500 absolute right-3 pointer-events-none" />
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={hideZeroSales}
              onChange={(e) => setHideZeroSales(e.target.checked)}
              className="rounded border-slate-300 text-brand-mint focus:ring-brand-mint accent-brand-mint"
            />
            <span>0실 항목 제외</span>
          </label>

          {selectedChannel.includes('단체영업') ? (
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={12} className="text-indigo-600" /> 세일즈본부 핵심 주력 사업
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedChannel('단체영업(세미나)');
                setViewMode('FOCUS_SINGLE');
              }}
              className="text-xs font-bold text-brand-mint hover:underline cursor-pointer flex items-center gap-1"
            >
              ↩ 주력(단체영업)으로 복귀
            </button>
          )}
        </div>

        {/* Right: View Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('FOCUS_SINGLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'FOCUS_SINGLE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table size={14} className="text-brand-mint" />
            <span>선택 채널 평형별 상세</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('PIVOT_MATRIX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            onClick={() => setViewMode('ALL_CHANNELS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'ALL_CHANNELS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} className="text-slate-600" />
            <span>전체 채널 목록</span>
          </button>
        </div>
      </div>

      {/* 3. Executive Summary Cards (4-Grid: 선택 채널 중심 동적 지표) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 총 매출액' : '선택 채널 매출액'}</span>
              <MetricExplainerTooltip presetKey="netRevenue" />
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
              isAllMode ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {isAllMode ? '전사 합산' : (activeChannelGroup?.channelName || '선택 실적')}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
                {formatRevenue(displayRevenue)}
              </span>
              <span className="text-sm font-semibold text-slate-400">원</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md">
                {displayRevenueFinancial.formatted}
              </span>
              {!isAllMode && activeChannelGroup && (
                <span className="text-slate-400 font-medium">
                  (전사 {grandRevenueFinancial.formatted} 중 <strong className="text-slate-700 font-bold">{activeChannelGroup.revenueSharePct.toFixed(1)}%</strong> 점유)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Rooms Sold */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BedDouble size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 판매 객실' : '선택 채널 판매 객실'}</span>
              <MetricExplainerTooltip presetKey="occupancy" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              계약 실적
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayRooms.toLocaleString()}
              <span className="text-base font-semibold text-slate-400 ml-1">실</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isAllMode 
                ? '전체 판매 객실 합계' 
                : `전체 ${grandTotals.rooms.toLocaleString()}실 중 ${displayRooms.toLocaleString()}실`}
            </p>
          </div>
        </div>

        {/* Card 3: Total Guests */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <Users size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 총 투숙객' : '선택 채널 투숙객'}</span>
              <MetricExplainerTooltip presetKey="visitorCount" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              정원 기준 환산
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayGuests.toLocaleString()}
              <span className="text-base font-semibold text-slate-400 ml-1">명</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              판매 평형별 정원 기준 인원
            </p>
          </div>
        </div>

        {/* Card 4: ADR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 평균 ADR' : '선택 채널 평균 ADR'}</span>
              <MetricExplainerTooltip presetKey="adr" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              평균 객단가
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {formatRevenue(displayAdr)}
              <span className="text-base font-semibold text-slate-400 ml-1">원</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              해당 채널 매출액 ÷ 판매 객실수
            </p>
          </div>
        </div>

      </div>

      {/* 4. MAIN CONTENT AREA */}

      {/* 🌟 1. 기본 메인 뷰: 선택된 판매방식(기본: 단체영업(세미나))의 각 평형별 실적 상세 */}
      {viewMode === 'FOCUS_SINGLE' && activeChannelGroup && (
        <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-6">
          
          {/* Main Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeChannelGroup.channelName} 각 평형별 실적 상세
                  </h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activeChannelGroup.badgeColor}`}>
                    {activeChannelGroup.items.length}개 평형 판매
                  </span>
                  {activeChannelGroup.channelName.includes('단체영업') && (
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand-mint text-white shadow-2xs">
                      세일즈본부 핵심 주력
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  선택하신 판매방식의 각 평형(세그먼트)별 판매 실적과 단가(ADR)입니다.
                </p>
              </div>
            </div>

            {/* Quick Channel Pill Switcher */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">다른 판매방식:</span>
              {channelGroups.slice(0, 4).map(g => (
                <button
                  key={g.channelName}
                  type="button"
                  onClick={() => setSelectedChannel(g.channelName)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    selectedChannel === g.channelName
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {g.channelName.split('(')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Main Segment Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-financial">
              <thead>
                <tr className="border-b-2 border-slate-800 text-sm font-bold text-slate-900">
                  <th className="py-4 px-6 whitespace-nowrap">평형 (세그먼트)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">판매 객실</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">매출액 (순매출)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">예상 투숙객</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">객단가 (ADR)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">
                    {activeChannelGroup.channelName.split('(')[0]} 내 비중
                  </th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">전사 매출 기여도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeChannelGroup.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 text-base">{item.roomType}</span>
                        {item.roomType.includes('51') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/70">
                            대형
                          </span>
                        )}
                        {item.roomType.includes('35') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70">
                            중형
                          </span>
                        )}
                        {item.roomType.includes('16') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            스탠다드
                          </span>
                        )}
                        {item.roomType.includes('펫룸') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/70">
                            반려견
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {item.roomsSold.toLocaleString()}실
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatRevenue(item.revenue)}원
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap">
                      {item.guests > 0 ? `${item.guests.toLocaleString()}명` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {item.adr > 0 ? `${formatRevenue(item.adr)}원` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-brand-mint h-full rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(0, item.channelSharePct))}%` }} 
                          />
                        </div>
                        <span>{item.channelSharePct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-500 whitespace-nowrap">
                      {item.grandSharePct.toFixed(1)}%
                    </td>
                  </tr>
                ))}

                {/* Subtotal Row */}
                <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td className="py-4 px-6 text-sm">
                    <span className="text-brand-mint font-black">[{activeChannelGroup.channelName} 총합계]</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black">
                    {activeChannelGroup.totalRooms.toLocaleString()}실
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black text-slate-900">
                    {formatRevenue(activeChannelGroup.totalRevenue)}원
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-bold">
                    {activeChannelGroup.totalGuests.toLocaleString()}명
                  </td>
                  <td className="py-4 px-4 text-sm text-right text-brand-mint font-extrabold">
                    {formatRevenue(activeChannelGroup.averageAdr)}원
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black">
                    100.0%
                  </td>
                  <td className="py-4 px-6 text-sm text-right text-emerald-700 font-extrabold">
                    {activeChannelGroup.revenueSharePct.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {activeChannelGroup.items.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              해당 기간의 {activeChannelGroup.channelName} 실적 데이터가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 🌟 2. 크로스 피벗 매트릭스 뷰 (행=판매방식, 열=평형) */}
      {viewMode === 'PIVOT_MATRIX' && (
        <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Grid size={18} className="text-indigo-600" />
                판매방식 × 평형별 교차 실적 매트릭스 (Pivot)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 판매방식(행)과 평형(열)의 교차 매출액 및 [판매실수 / ADR]을 한눈에 조망합니다.
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
                  <th className="py-3.5 px-4 sticky left-0 bg-slate-100 z-10 whitespace-nowrap min-w-[160px]">
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
                  const isCurrentTarget = group.channelName.includes('단체영업');

                  return (
                    <tr 
                      key={group.channelName} 
                      className={`transition-colors cursor-pointer ${
                        isCurrentTarget ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setSelectedChannel(group.channelName);
                        setViewMode('FOCUS_SINGLE');
                      }}
                      title="클릭하여 이 판매방식의 평형별 상세 보기"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white z-10 whitespace-nowrap border-r border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isCurrentTarget ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-brand-mint'}`} />
                          <span>{group.channelName}</span>
                          {isCurrentTarget && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1 rounded">주력</span>
                          )}
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

      {/* 🌟 3. 전체 판매방식 아코디언 목록 뷰 */}
      {viewMode === 'ALL_CHANNELS' && (
        <div className="space-y-4">
          {channelGroups.map((group) => {
            const channelFinancial = formatFinancialKorean(group.totalRevenue);
            const isTarget = group.channelName.includes('단체영업');

            return (
              <div 
                key={group.channelName}
                className={`bg-white rounded-[24px] border shadow-xs overflow-hidden transition-all duration-200 ${
                  isTarget ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200/90'
                }`}
              >
                <div className="p-5 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      {group.iconType === 'group' && <Users className="w-5 h-5 text-indigo-600" />}
                      {group.iconType === 'corporate' && <Building2 className="w-5 h-5 text-blue-600" />}
                      {group.iconType === 'direct' && <Globe className="w-5 h-5 text-emerald-600" />}
                      {group.iconType === 'ota' && <Plane className="w-5 h-5 text-sky-600" />}
                      {group.iconType === 'phone' && <PhoneCall className="w-5 h-5 text-amber-600" />}
                      {group.iconType === 'etc' && <Coins className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{group.channelName}</h4>
                        {isTarget && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">주력</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                          {group.items.length}개 평형
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        전사 기여도: <strong className="text-slate-700 font-semibold">{group.revenueSharePct.toFixed(1)}%</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 font-financial text-right">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">판매 객실</div>
                      <div className="text-sm font-extrabold text-slate-800">{group.totalRooms.toLocaleString()}실</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">채널 총매출</div>
                      <div className="text-base font-extrabold text-slate-900">{formatRevenue(group.totalRevenue)}원</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{channelFinancial.formatted}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">평균 ADR</div>
                      <div className="text-sm font-bold text-slate-700">{formatRevenue(group.averageAdr)}원</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannel(group.channelName);
                        setViewMode('FOCUS_SINGLE');
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-financial">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-bold">
                        <th className="py-2.5 px-4">평형</th>
                        <th className="py-2.5 px-4 text-right">판매 객실</th>
                        <th className="py-2.5 px-4 text-right">매출액</th>
                        <th className="py-2.5 px-4 text-right">ADR</th>
                        <th className="py-2.5 px-4 text-right">채널 내 비중</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-4 font-bold text-slate-800">{item.roomType}</td>
                          <td className="py-2 px-4 text-right">{item.roomsSold}실</td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900">{formatRevenue(item.revenue)}원</td>
                          <td className="py-2 px-4 text-right">{item.adr > 0 ? `${formatRevenue(item.adr)}원` : '-'}</td>
                          <td className="py-2 px-4 text-right font-bold text-brand-mint">{item.channelSharePct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Strategy Insight Footer */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[24px] p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-brand-mint shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">세일즈본부 단체영업(세미나) 주력 전략 인사이트</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              세미나/기업연수 등 대량 단체 고객을 위한 16평/35평 패키지 견적과 F&B 연계 시너지를 분석하여 객단가를 방어하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-[11px] font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 text-slate-200">
            세일즈본부 SSOT Ver 6.0
          </span>
        </div>
      </div>

    </div>
  );
}
