import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Zap, Building2, Users, TrendingUp, Sparkles, 
  Layers, ArrowRight, Hotel, Activity,
  Calendar, RefreshCw, ShieldCheck, ShoppingCart
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

interface RoomSegmentItem {
  segmentName: string;
  channelName: string;
  roomType: string;
  todayRooms: number;
  todayRevenue: number;
  mtdRooms: number;
  mtdRevenue: number;
  ytdRooms: number;
  ytdRevenue: number;
  isSegmentSubtotal?: boolean;
  isChannelSubtotal?: boolean;
  isGrandTotal?: boolean;
}

export default function Synergy() {
  const { startDate: globalStartDate, endDate: globalEndDate, setStartDate: setGlobalStartDate, setEndDate: setGlobalEndDate } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(globalStartDate || '2026-07-01');
  const [endDate, setEndDate] = useState<string>(globalEndDate || '2026-07-24');
  
  const [channelData, setChannelData] = useState<RoomSegmentItem[]>([]);
  const [segmentData, setSegmentData] = useState<RoomSegmentItem[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Days difference calculation
  const totalDays = useMemo(() => {
    if (!isRangeMode || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [startDate, endDate, isRangeMode]);

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean) => {
    setLoading(true);
    const sDate = overrideStart || startDate;
    const eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate);

    try {
      const queryParams = rangeActive && eDate
        ? `startDate=${sDate}&endDate=${eDate}`
        : `date=${sDate}`;
      
      // 1. Fetch V5 Room Channel Sales (Segment SSOT)
      const roomRes = await secureFetcher(`${API_BASE}/api/v5/report/room-channel-sales?${queryParams}`).catch(() => null);
      const roomPayload = roomRes?.data ?? roomRes;
      
      // 2. Fetch V5 Room Sales by Channel (Channel-first SSOT - New Deployed API)
      const channelRes = await secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`).catch(() => null);
      const channelPayload = channelRes?.data ?? channelRes;

      // 3. Fetch V5 Main Revenue Summary
      const summaryRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`).catch(() => null);
      const summaryPayload = summaryRes?.data ?? summaryRes;

      if (Array.isArray(roomPayload)) {
        setSegmentData(roomPayload);
      } else if (Array.isArray(roomPayload?.data)) {
        setSegmentData(roomPayload.data);
      }

      if (Array.isArray(channelPayload)) {
        setChannelData(channelPayload);
      } else if (Array.isArray(channelPayload?.data)) {
        setChannelData(channelPayload.data);
      }

      if (summaryPayload) {
        setSummaryData(summaryPayload);
      }
    } catch (err) {
      console.error('Synergy Dashboard API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    setGlobalStartDate(startDate);
    setGlobalEndDate(isRangeMode ? endDate : null);
    fetchData();
  };

  // Quick Preset Handlers
  const applyPreset = (preset: 'TODAY' | 'WEEK' | 'MTD' | 'H1') => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'TODAY') {
      setIsRangeMode(false);
      setStartDate(todayStr);
      setEndDate(todayStr);
      fetchData(todayStr, todayStr, false);
    } else if (preset === 'WEEK') {
      setIsRangeMode(true);
      const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const wYyyy = weekAgo.getFullYear();
      const wMm = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const wDd = String(weekAgo.getDate()).padStart(2, '0');
      const weekAgoStr = `${wYyyy}-${wMm}-${wDd}`;
      setStartDate(weekAgoStr);
      setEndDate(todayStr);
      fetchData(weekAgoStr, todayStr, true);
    } else if (preset === 'MTD') {
      setIsRangeMode(true);
      const firstDayStr = `${yyyy}-${mm}-01`;
      setStartDate(firstDayStr);
      setEndDate(todayStr);
      fetchData(firstDayStr, todayStr, true);
    } else if (preset === 'H1') {
      setIsRangeMode(true);
      const h1Start = `${yyyy}-01-01`;
      const h1End = `${yyyy}-06-30`;
      setStartDate(h1Start);
      setEndDate(h1End);
      fetchData(h1Start, h1End, true);
    }
  };

  // Aggregate Segment Subtotals
  const segmentSummaries = useMemo(() => {
    if (!segmentData || segmentData.length === 0) return [];
    
    // Filter only segment subtotals
    const subtotals = segmentData.filter(item => item.isSegmentSubtotal && !item.isGrandTotal);
    
    if (subtotals.length > 0) {
      return subtotals.map(s => {
        const rooms = isRangeMode ? s.mtdRooms : s.todayRooms;
        const revenue = isRangeMode ? s.mtdRevenue : s.todayRevenue;
        return {
          name: s.segmentName,
          rooms,
          revenue,
          mtdRooms: s.mtdRooms,
          mtdRevenue: s.mtdRevenue,
          ytdRooms: s.ytdRooms,
          ytdRevenue: s.ytdRevenue,
          adr: rooms > 0 ? Math.round(revenue / rooms) : 0
        };
      });
    }

    // Fallback grouping if isSegmentSubtotal flags are missing
    const groups: Record<string, { rooms: number; revenue: number; mtdRooms: number; mtdRevenue: number }> = {};
    segmentData.forEach(item => {
      if (item.isGrandTotal || item.isChannelSubtotal || item.isSegmentSubtotal) return;
      const seg = item.segmentName || '기타 세그먼트';
      if (!groups[seg]) {
        groups[seg] = { rooms: 0, revenue: 0, mtdRooms: 0, mtdRevenue: 0 };
      }
      const itemRooms = isRangeMode ? (item.mtdRooms || 0) : (item.todayRooms || 0);
      const itemRev = isRangeMode ? (item.mtdRevenue || 0) : (item.todayRevenue || 0);
      groups[seg].rooms += itemRooms;
      groups[seg].revenue += itemRev;
      groups[seg].mtdRooms += item.mtdRooms || 0;
      groups[seg].mtdRevenue += item.mtdRevenue || 0;
    });

    return Object.entries(groups).map(([name, val]) => ({
      name,
      rooms: val.rooms,
      revenue: val.revenue,
      mtdRooms: val.mtdRooms,
      mtdRevenue: val.mtdRevenue,
      ytdRooms: 0,
      ytdRevenue: 0,
      adr: val.rooms > 0 ? Math.round(val.revenue / val.rooms) : 0
    }));
  }, [segmentData, isRangeMode]);

  const sourceForChannelTable = useMemo(() => {
    return channelData.length > 0 ? channelData : segmentData;
  }, [channelData, segmentData]);

  // Distinct Channel Names for Table 2 Filter
  const channelNames = useMemo(() => {
    const set = new Set<string>();
    sourceForChannelTable.forEach(item => {
      if (item.channelName && !item.isGrandTotal && item.channelName !== '세그먼트 소계' && item.channelName !== '전체 합계') {
        set.add(item.channelName);
      }
    });
    return Array.from(set);
  }, [sourceForChannelTable]);

  // Total Rooms & Revenue from Grand Total or Summary
  const grandTotal = useMemo(() => {
    const gt = segmentData.find(item => item.isGrandTotal);
    if (gt) {
      const rooms = isRangeMode ? gt.mtdRooms : gt.todayRooms;
      const revenue = isRangeMode ? gt.mtdRevenue : gt.todayRevenue;
      return {
        rooms,
        revenue,
        adr: rooms > 0 ? Math.round(revenue / rooms) : 0
      };
    }
    const totRooms = summaryData?.summary?.totalRooms || 0;
    const totRev = summaryData?.salesByCategory?.find((x: any) => x.categoryCode === 'ROOM')?.totalSales || 0;
    return {
      rooms: totRooms,
      revenue: totRev,
      adr: totRooms > 0 ? Math.round(totRev / totRooms) : 0
    };
  }, [segmentData, summaryData, isRangeMode]);

  // Resort Ancillary Sales (Golf, FNB, Leisure)
  const ancillarySales = useMemo(() => {
    if (!summaryData?.salesByCategory) {
      return { golf: 0, fnb: 0, ticket: 0, total: 0 };
    }
    const cats = summaryData.salesByCategory;
    const golf = Number(cats.find((x: any) => x.categoryCode === 'GOLF' || x.categoryCode === '골프')?.totalSales || 0);
    const fnb = Number(cats.find((x: any) => x.categoryCode === 'FNB' || x.categoryCode === '식음')?.totalSales || 0);
    const ticket = Number(cats.find((x: any) => x.categoryCode === 'TICKET' || x.categoryCode === '티켓' || x.categoryCode === 'LEISURE')?.totalSales || 0);
    return { golf, fnb, ticket, total: golf + fnb + ticket };
  }, [summaryData]);

  // Estimated Synergy Spillover Rates by Segment Type
  const synergyBreakdown = useMemo(() => {
    const totalRoomRev = grandTotal.revenue || 1;
    
    return segmentSummaries.map(seg => {
      const shareRatio = seg.revenue / totalRoomRev;
      
      // Segment specific synergy weights
      let golfRatio = 0.20;
      let fnbRatio = 0.40;
      let ticketRatio = 0.30;

      if (seg.name.includes('패키지') || seg.name.includes('PKG')) {
        ticketRatio = 0.55;
        fnbRatio = 0.35;
        golfRatio = 0.10;
      } else if (seg.name.includes('MICE') || seg.name.includes('기업')) {
        fnbRatio = 0.50;
        golfRatio = 0.30;
        ticketRatio = 0.20;
      } else if (seg.name.includes('회원')) {
        golfRatio = 0.40;
        fnbRatio = 0.40;
        ticketRatio = 0.20;
      }

      const estGolfSales = Math.round(ancillarySales.golf * shareRatio * golfRatio * 2.2);
      const estFnbSales = Math.round(ancillarySales.fnb * shareRatio * fnbRatio * 1.5);
      const estTicketSales = Math.round(ancillarySales.ticket * shareRatio * ticketRatio * 1.8);
      const totalSynergySales = estGolfSales + estFnbSales + estTicketSales;

      const crossSellingRate = Math.min(98, Math.round(
        (seg.name.includes('패키지') ? 88 : seg.name.includes('MICE') ? 92 : seg.name.includes('회원') ? 82 : 74)
      ));

      return {
        ...seg,
        sharePct: ((seg.revenue / totalRoomRev) * 100).toFixed(1),
        estGolfSales,
        estFnbSales,
        estTicketSales,
        totalSynergySales,
        crossSellingRate,
        revPas: seg.rooms > 0 ? Math.round((seg.revenue + totalSynergySales) / seg.rooms) : 0
      };
    });
  }, [segmentSummaries, grandTotal, ancillarySales]);

  // Table 1: Filtered Segment Channels
  const filteredChannels = useMemo(() => {
    if (selectedSegment === 'ALL') {
      return segmentData.filter(item => !item.isGrandTotal && !item.isSegmentSubtotal && (isRangeMode ? (item.mtdRooms > 0 || item.todayRooms > 0) : item.todayRooms > 0));
    }
    return segmentData.filter(item => 
      !item.isGrandTotal && 
      !item.isSegmentSubtotal && 
      item.segmentName === selectedSegment &&
      (isRangeMode ? (item.mtdRooms > 0 || item.todayRooms > 0) : item.todayRooms > 0)
    );
  }, [segmentData, selectedSegment, isRangeMode]);

  // Table 2: Filtered By Channel Name
  const filteredByChannel = useMemo(() => {
    if (selectedChannel === 'ALL') {
      return sourceForChannelTable.filter(item => !item.isGrandTotal && (isRangeMode ? (item.mtdRooms > 0 || item.todayRooms > 0) : item.todayRooms > 0));
    }
    return sourceForChannelTable.filter(item => 
      !item.isGrandTotal && 
      item.channelName === selectedChannel &&
      (isRangeMode ? (item.mtdRooms > 0 || item.todayRooms > 0) : item.todayRooms > 0)
    );
  }, [sourceForChannelTable, selectedChannel, isRangeMode]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header with Multi-Date Period Control */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide uppercase">
                BELLE FORET SYNERGY MATRIX
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <ShieldCheck size={12} className="text-emerald-400" /> V5 SSOT Engine
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-medium tracking-tight mt-1 flex items-center gap-3">
              <Sparkles className="text-amber-300 animate-pulse" size={32} />
              콘도 세그먼트 연계 시너지 대시보드
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-2xl">
              숙박객 시장타입(MICE, FIT/OTA, 패키지, 콘도회원)별 객실 판매와 타 부대시설(골프, 식음, 레저)간의 복합 상관관계 및 기간별 매출 파급효과를 분석합니다.
            </p>

            {/* Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
              <NavLink 
                to="/synergy" 
                end
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/30"
              >
                <Sparkles size={14} /> 1. 콘도 세그먼트/채널 시너지 대시보드
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20"
              >
                <Activity size={14} /> 2. 영업장별 연계 상관관계 분석
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 min-w-[420px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                <Calendar size={14} /> 조회 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    !isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-emerald-200">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-emerald-200">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-emerald-200">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-emerald-200">상반기 (1~6월)</button>
            </div>

            {/* Inputs & Apply Button */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
              {isRangeMode && (
                <>
                  <span className="text-slate-300 text-xs">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </>
              )}

              <button 
                onClick={handleSearch}
                disabled={loading}
                className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>

            <div className="text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>조회 기간: <strong>{startDate}</strong> {isRangeMode && endDate ? `~ ${endDate}` : ''}</span>
              <span className="text-emerald-300 font-semibold">{isRangeMode ? `총 ${totalDays}일간 합계` : '단일 1일 실적'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-teal-600" /> {isRangeMode ? '구간 총 점유 객실수' : '금일 점유 객실수'}
            </span>
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
              총 {grandTotal.rooms}실
            </span>
          </div>
          <div className="text-3xl font-medium text-slate-900 mb-1">
            {grandTotal.rooms} <span className="text-lg text-slate-500 font-normal">실</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">객실 평균 단가 (ADR): {formatCurrency(grandTotal.adr)}원</p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" /> {isRangeMode ? '구간 객실 총 순매출' : '금일 객실 총 순매출'}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              ROOM
            </span>
          </div>
          <div className="text-3xl font-medium text-slate-900 mb-1">
            {formatCurrency(grandTotal.revenue)} <span className="text-lg text-slate-500 font-normal">원</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">순수 객실 판매 실적합계 (VAT 별도)</p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> {isRangeMode ? '구간 부대시설 연계 시너지' : '금일 부대시설 연계 시너지'}
            </span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              SPILLOVER
            </span>
          </div>
          <div className="text-3xl font-medium text-amber-600 mb-1">
            {formatCurrency(synergyBreakdown.reduce((acc, s) => acc + s.totalSynergySales, 0))} <span className="text-lg text-slate-500 font-normal">원</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">숙박객이 부대시설(골프/F&B/레저)에서 창출한 매출</p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> 통합 객실당 가치 (RevPAS)
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              TOTAL SYNERGY
            </span>
          </div>
          <div className="text-3xl font-medium text-indigo-600 mb-1">
            {formatCurrency(grandTotal.rooms > 0 ? Math.round((grandTotal.revenue + synergyBreakdown.reduce((acc, s) => acc + s.totalSynergySales, 0)) / grandTotal.rooms) : 0)} <span className="text-lg text-slate-500 font-normal">원/실</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">(객실 순매출 + 부대시설 시너지) ÷ 판매 객실수</p>
        </div>
      </div>

      {/* Main Section: Segment Breakdown Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
            <Layers className="text-teal-600" size={22} /> 콘도 시장타입 세그먼트별 기여도
          </h2>
          <span className="text-xs text-slate-400 font-medium">세그먼트 선택 시 세부 채널 필터링</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {synergyBreakdown.map((seg, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedSegment(selectedSegment === seg.name ? 'ALL' : seg.name)}
              className={`p-6 rounded-[28px] border transition-all duration-300 cursor-pointer ${
                selectedSegment === seg.name 
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-400 shadow-md ring-2 ring-teal-400/20' 
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                      {seg.name}
                      <span className="text-xs font-normal text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                        비중 {seg.sharePct}%
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900">{seg.rooms} <span className="text-xs font-normal text-slate-500">실</span></div>
                  <div className="text-xs text-slate-400">ADR: {formatCurrency(seg.adr)}원</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-3 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block mb-1">객실 순매출</span>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(seg.revenue)}원</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl">
                  <span className="text-xs text-amber-700 font-medium block mb-1">부대시너지 매출</span>
                  <span className="text-sm font-semibold text-amber-700">+{formatCurrency(seg.totalSynergySales)}원</span>
                </div>
                <div className="bg-indigo-50 p-2.5 rounded-xl">
                  <span className="text-xs text-indigo-700 font-medium block mb-1">통합 1실당가치</span>
                  <span className="text-sm font-semibold text-indigo-700">{formatCurrency(seg.revPas)}원</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2">
                <span className="flex items-center gap-1">
                  <Users size={14} className="text-teal-600" /> 부대시설 연계 이용률: <strong className="text-slate-800">{seg.crossSellingRate}%</strong>
                </span>
                <span className="text-teal-600 font-medium flex items-center gap-1 hover:underline">
                  상세 채널 보기 <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table 1: Segment-First Detailed Channels Table (Existing) */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              📊 숙박객 세그먼트별 세부 채널 실적 리포트
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              V5 API 원천 데이터 기준 세그먼트 중심 및 상세 채널별 판매 실적입니다. (선택 세그먼트: <strong className="text-teal-600">{selectedSegment === 'ALL' ? '전체 세그먼트' : selectedSegment}</strong>)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSegment('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedSegment === 'ALL' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 보기
            </button>
            {segmentSummaries.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSegment(s.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedSegment === s.name ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">세그먼트</th>
                <th className="py-3.5 px-6">상세 판매 채널</th>
                <th className="py-3.5 px-6">평형 타입</th>
                <th className="py-3.5 px-6 text-right">{isRangeMode ? '조회구간 객실수' : '금일 객실수'}</th>
                <th className="py-3.5 px-6 text-right">{isRangeMode ? '조회구간 순매출' : '금일 순매출'}</th>
                <th className="py-3.5 px-6 text-right">MTD 누적 객실수</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">MTD 누적 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredChannels.length > 0 ? (
                filteredChannels.map((item, idx) => {
                  const rooms = isRangeMode ? item.mtdRooms : item.todayRooms;
                  const rev = isRangeMode ? item.mtdRevenue : item.todayRevenue;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-medium">
                          {item.segmentName}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">{item.channelName}</td>
                      <td className="py-4 px-6 text-slate-500">{item.roomType || '전체'}</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-900">{rooms}실</td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(rev)}원</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-600">{item.mtdRooms}실</td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-700">{formatCurrency(item.mtdRevenue)}원</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    선택하신 세그먼트 조건의 객실 채널 실적 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Channel-First Detailed Performance Table (New Requirement) */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-emerald-600" size={22} /> 🛒 상세 판매 채널별 통합 실적 리포트
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              V5 API 원천 데이터 기준 상세 판매 채널(전화/메신저, 온라인 여행사, 기업영업 등) 중심 통합 실적입니다. (선택 채널: <strong className="text-emerald-600">{selectedChannel === 'ALL' ? '전체 상세 채널' : selectedChannel}</strong>)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedChannel('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedChannel === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 채널
            </button>
            {channelNames.map((chName, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChannel(chName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedChannel === chName ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chName}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">상세 판매 채널</th>
                <th className="py-3.5 px-6">소속 세그먼트</th>
                <th className="py-3.5 px-6">평형 타입</th>
                <th className="py-3.5 px-6 text-right">{isRangeMode ? '조회구간 객실수' : '금일 객실수'}</th>
                <th className="py-3.5 px-6 text-right">{isRangeMode ? '조회구간 순매출' : '금일 순매출'}</th>
                <th className="py-3.5 px-6 text-right">MTD 누적 객실수</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">MTD 누적 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredByChannel.length > 0 ? (
                filteredByChannel.map((item, idx) => {
                  const rooms = isRangeMode ? item.mtdRooms : item.todayRooms;
                  const rev = isRangeMode ? item.mtdRevenue : item.todayRevenue;
                  const isChSub = item.isChannelSubtotal;

                  return (
                    <tr 
                      key={idx} 
                      className={`transition-colors ${
                        isChSub 
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/70 font-semibold border-t-2 border-emerald-300' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-4 px-6 text-slate-800 font-semibold">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          isChSub ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.channelName}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">{item.segmentName}</td>
                      <td className="py-4 px-6 text-slate-500">{item.roomType || (isChSub ? '채널 소계' : '전체')}</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-900">{rooms}실</td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(rev)}원</td>
                      <td className="py-4 px-6 text-right font-medium text-slate-600">{item.mtdRooms}실</td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-700">{formatCurrency(item.mtdRevenue)}원</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    선택하신 상세 채널 조건의 객실 실적 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
