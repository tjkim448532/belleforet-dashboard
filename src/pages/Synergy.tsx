import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Zap, Building2, TrendingUp, Sparkles, 
  Hotel, Activity, Calendar, RefreshCw, ShieldCheck, CreditCard,
  Globe, Smartphone, PhoneCall, Users, Layers, Landmark, CloudRain
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const parseNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = parseNum(val);
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const CHANNEL_THEMES = [
  { icon: Globe, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', borderHover: 'hover:border-blue-300', barColor: 'from-blue-500 to-sky-400', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/60' },
  { icon: Smartphone, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', borderHover: 'hover:border-emerald-300', barColor: 'from-emerald-500 to-teal-400', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  { icon: Landmark, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', borderHover: 'hover:border-indigo-300', barColor: 'from-indigo-500 to-violet-400', badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
  { icon: PhoneCall, iconColor: 'text-purple-600', iconBg: 'bg-purple-50', borderHover: 'hover:border-purple-300', barColor: 'from-purple-500 to-fuchsia-400', badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/60' },
  { icon: Users, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', borderHover: 'hover:border-amber-300', barColor: 'from-amber-500 to-orange-400', badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  { icon: CreditCard, iconColor: 'text-teal-600', iconBg: 'bg-teal-50', borderHover: 'hover:border-teal-300', barColor: 'from-teal-500 to-emerald-400', badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200/60' },
  { icon: Sparkles, iconColor: 'text-rose-600', iconBg: 'bg-rose-50', borderHover: 'hover:border-rose-300', barColor: 'from-rose-500 to-pink-400', badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/60' },
  { icon: Layers, iconColor: 'text-slate-600', iconBg: 'bg-slate-100', borderHover: 'hover:border-slate-300', barColor: 'from-slate-500 to-slate-400', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200/60' },
];

const getChannelMeta = (_name: string, rank: number) => {
  const safeRank = Math.max(1, rank);
  const theme = CHANNEL_THEMES[(safeRank - 1) % CHANNEL_THEMES.length] || CHANNEL_THEMES[0];
  const rankBadge = rank === 1 
    ? 'bg-amber-500 text-white shadow-xs font-black' 
    : rank === 2 
    ? 'bg-slate-700 text-white font-bold' 
    : rank === 3 
    ? 'bg-amber-800 text-white font-bold' 
    : 'bg-slate-100 text-slate-600 font-semibold';

  return { ...theme, rankBadge };
};

interface RoomChannelSalesItem {
  segmentName: string;
  channelName: string;
  partnerName?: string;
  roomType: string;
  todayRooms: number;
  todayRevenue: number;
  mtdRooms: number;
  mtdRevenue: number;
  ytdRooms: number;
  ytdRevenue: number;
  adr?: number;
  todayAdr?: number;
  mtdAdr?: number;
  ytdAdr?: number;
  isChannelSubtotal?: boolean;
  isGrandTotal?: boolean;
}

export default function Synergy() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate || globalStartDate);
  
  const [channelData, setChannelData] = useState<RoomChannelSalesItem[]>([]);
  const [summaryData, setSummaryData] = useState<{
    summary?: {
      totalRevenue?: number;
      totalRooms?: number;
      occupiedRooms?: number;
      totalRoomRev?: number;
      totalADR?: number;
      totalAncillary?: number;
      totalTrevPOR?: number;
      totalRevPAS?: number;
      synergySales?: { total?: number; golf?: number; fnb?: number; leisure?: number; ticket?: number };
    };
    synergySales?: { total?: number; golf?: number; fnb?: number; leisure?: number; ticket?: number };
    salesByCategory?: any[];
    salesByFacility?: any[];
  } | null>(null);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [stayDurationIntel, setStayDurationIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  // Determine if query is an actual multi-day date range (startDate !== endDate)
  const isActualRange = useMemo(() => {
    return isRangeMode && !!endDate && startDate !== endDate;
  }, [isRangeMode, startDate, endDate]);

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean) => {
    setLoading(true);
    // 즉시 기존 State 초기화 (구간 조회 시 이전 일자 데이터 잔존 방지)
    setChannelData([]);
    setMatrixData([]);
    let sDate = overrideStart || startDate;
    let eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate && sDate !== eDate);

    if (rangeActive && sDate && eDate && sDate > eDate) {
      const temp = sDate;
      sDate = eDate;
      eDate = temp;
      setStartDate(sDate);
      setEndDate(eDate);
    }

    try {
      const queryParams = rangeActive && eDate
        ? `startDate=${sDate}&endDate=${eDate}`
        : `date=${sDate}`;
      
      const summaryQueryParams = rangeActive && eDate
        ? `startDate=${sDate}&endDate=${eDate}`
        : `date=${sDate}`;

      // Parallel Fetch: 1. API 7 Channel Sales, 2. Revenue Summary, 3. Matrix Report (Category SSOT), 4. Ticket 36 Stay Duration Synergy
      const [channelRes, summaryRes, matrixRes, stayRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-sales-by-channel?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${summaryQueryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/dashboard/matrix-report?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/customer-stay-duration-synergy?${queryParams}`).catch(() => null)
      ]);

      const channelPayload = channelRes?.data ?? channelRes;
      const summaryPayload = summaryRes?.data ?? summaryRes;
      const matrixPayload = matrixRes?.data ?? matrixRes;

      if (stayRes && (stayRes.summary || stayRes.data)) {
        setStayDurationIntel(stayRes.data || stayRes);
      } else {
        setStayDurationIntel(null);
      }

      if (Array.isArray(channelPayload)) {
        setChannelData(channelPayload);
      } else if (Array.isArray(channelPayload?.data)) {
        setChannelData(channelPayload.data);
      }

      if (summaryPayload) {
        setSummaryData(summaryPayload);
      }

      if (Array.isArray(matrixPayload)) {
        setMatrixData(matrixPayload);
      } else if (Array.isArray(matrixPayload?.data)) {
        setMatrixData(matrixPayload.data);
      }
    } catch (err) {
      console.error('Synergy Dashboard API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with global DateContext on mount and updates
  useEffect(() => {
    setIsRangeMode(globalIsRange);
    setStartDate(globalStartDate);
    setEndDate(globalEndDate || globalStartDate);
    fetchData(globalStartDate, globalEndDate || globalStartDate, globalIsRange);
  }, [globalStartDate, globalEndDate, globalIsRange]);

  const handleSearch = () => {
    let s = startDate;
    let e = endDate;
    if (isRangeMode && s && e && s > e) {
      const temp = s;
      s = e;
      e = temp;
      setStartDate(s);
      setEndDate(e);
    }
    setDateRange(s, isRangeMode ? e : null, isRangeMode);
    fetchData(s, e, isRangeMode);
  };

  // Quick Preset Handlers
  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange);
  };

  // Grand Total Rooms & Revenue (API 7 SSOT with matrix-weekly & revenue-summary fallbacks)
  const grandTotal = useMemo(() => {
    // 1. 최우선 SSOT: 백엔드가 계산해 준 완제품 summaryData.summary (totalRoomRev, totalADR, totalRooms)
    const summaryTotalRoomRev = parseNum(summaryData?.summary?.totalRoomRev || 0);
    const summaryTotalADR = parseNum(summaryData?.summary?.totalADR || 0);
    const summaryTotalRooms = parseNum(summaryData?.summary?.totalRooms || 0);

    if (summaryTotalRoomRev > 0 || summaryTotalRooms > 0 || summaryTotalADR > 0) {
      return {
        rooms: summaryTotalRooms,
        revenue: summaryTotalRoomRev,
        adr: summaryTotalADR
      };
    }

    // 2. 차순위: channelData의 gtRow (단일 일자 등에서 summaryData가 비어있을 경우)
    const gtRow = channelData.find(item => item.isGrandTotal || item.channelName === '전체 합계' || item.channelName === '총합계');
    if (gtRow) {
      const rooms = parseNum(isActualRange ? (gtRow.mtdRooms || gtRow.todayRooms || 0) : (gtRow.todayRooms || 0));
      const revenue = parseNum(isActualRange ? (gtRow.mtdRevenue || gtRow.todayRevenue || 0) : (gtRow.todayRevenue || 0));
      if (rooms > 0 || revenue > 0) {
        return {
          rooms,
          revenue,
          adr: parseNum(gtRow.adr || summaryTotalADR || 0)
        };
      }
    }

    // 3. Fallback: Bind directly from matrix-weekly SSOT
    if (matrixData && matrixData.length > 0) {
      const roomRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'ROOM' || r.categoryCode === '콘도' || r.categoryName === '콘도'));
      if (roomRow) {
        const roomsSold = parseNum(summaryTotalRooms || roomRow.todayVisitors || roomRow.rangeVisitors || 0);
        const roomRev = parseNum(roomRow.todayActual || roomRow.rangeActual || roomRow.mtdActual || 0);
        if (roomRev > 0 || roomsSold > 0) {
          return {
            rooms: roomsSold,
            revenue: roomRev,
            adr: summaryTotalADR
          };
        }
      }
    }

    // 4. Fallback: Bind directly from revenue-summary SSOT (salesByCategory)
    const roomCat = summaryData?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도' || c.categoryName === '콘도');
    const roomRev = parseNum(roomCat?.totalSales || roomCat?.todayActual || 0);
    const roomsSold = parseNum(summaryTotalRooms || 0);
    
    return {
      rooms: roomsSold,
      revenue: roomRev,
      adr: summaryTotalADR
    };
  }, [summaryData, channelData, matrixData, isActualRange]);

  // SSOT: 부대시설 연계 시너지 매출 (총매출 - 객실매출 또는 부대시설 카테고리 합)
  const ancillarySales = useMemo(() => {
    // 1. Primary SSOT: From matrix-weekly (Accurate for both Single Date and Multi-Day Range)
    if (matrixData && matrixData.length > 0) {
      const totalRow = matrixData.find(r => r.isGrandTotal || r.categoryCode === 'TOTAL' || r.categoryName === '총계');
      const roomRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'ROOM' || r.categoryCode === '콘도' || r.categoryName === '콘도'));
      const golfRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'GOLF' || r.categoryCode === '골프' || r.categoryName === '골프'));
      const fnbRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'FNB' || r.categoryCode === '식음' || r.categoryName === '식음'));
      const ticketRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'TICKET' || r.categoryCode === '레져본부' || r.categoryCode === '레져본부(외주)' || r.categoryName === '레져본부'));
      const motoRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'MOTO' || r.categoryCode === '모토아레나' || r.categoryName === '모토아레나'));

      const totalRev = parseNum(totalRow?.todayActual || totalRow?.rangeActual || totalRow?.mtdActual || 0);
      const roomRev = parseNum(roomRow?.todayActual || roomRow?.rangeActual || roomRow?.mtdActual || grandTotal.revenue || 0);
      const golfRev = parseNum(golfRow?.todayActual || golfRow?.rangeActual || golfRow?.mtdActual || 0);
      const fnbRev = parseNum(fnbRow?.todayActual || fnbRow?.rangeActual || fnbRow?.mtdActual || 0);
      const leisureRev = parseNum(ticketRow?.todayActual || ticketRow?.rangeActual || ticketRow?.mtdActual || 0) + 
                         parseNum(motoRow?.todayActual || motoRow?.rangeActual || motoRow?.mtdActual || 0);

      const totalAncillary = parseNum(summaryData?.summary?.totalAncillary || 0) || Math.max(0, totalRev - roomRev);
      if (totalAncillary > 0) {
        return {
          golf: golfRev,
          fnb: fnbRev,
          ticket: leisureRev,
          total: totalAncillary
        };
      }
    }

    // 2. Fallback: synergySales in revenue-summary
    const synergy = summaryData?.summary?.synergySales || summaryData?.synergySales;
    if (synergy && parseNum(synergy.total) > 0) {
      return { 
        golf: parseNum(synergy.golf || 0), 
        fnb: parseNum(synergy.fnb || 0), 
        ticket: parseNum(synergy.ticket || 0), 
        total: parseNum(synergy.total || 0) 
      };
    }

    // 3. Fallback: Calculate directly from salesByCategory (GOLF, FNB, TICKET, MOTO, etc.)
    const cats = summaryData?.salesByCategory || [];
    const golfRev = parseNum(cats.find((c: any) => c.categoryCode === 'GOLF' || c.categoryCode === '골프' || c.categoryName === '골프')?.totalSales || cats.find((c: any) => c.categoryCode === 'GOLF' || c.categoryCode === '골프')?.todayActual || 0);
    const fnbRev = parseNum(cats.find((c: any) => c.categoryCode === 'FNB' || c.categoryCode === '식음' || c.categoryName === '식음')?.totalSales || cats.find((c: any) => c.categoryCode === 'FNB' || c.categoryCode === '식음')?.todayActual || 0);
    const leisureRev = parseNum(cats.find((c: any) => c.categoryCode === 'TICKET' || c.categoryCode === 'MOTO' || c.categoryCode === '레져본부' || c.categoryCode === '모토아레나')?.totalSales || cats.find((c: any) => c.categoryCode === 'TICKET' || c.categoryCode === '레져본부')?.todayActual || 0);
    
    const totalAncillary = parseNum(summaryData?.summary?.totalAncillary || 0);

    return {
      golf: golfRev,
      fnb: fnbRev,
      ticket: leisureRev,
      total: totalAncillary
    };
  }, [matrixData, summaryData, grandTotal.revenue]);

  // Ground-Up Breakdown Grouping (Pure Zero-Proxy, No MTD fallback in single date mode)
  const segmentSummaries = useMemo(() => {
    if (channelData && channelData.length > 0) {
      let subtotalRows = channelData.filter(item => item.isChannelSubtotal);
      if (selectedChannel !== 'ALL') {
        subtotalRows = subtotalRows.filter(item => item.channelName === selectedChannel || item.channelName?.startsWith(selectedChannel));
      }

      const mapped = subtotalRows
        .map(item => {
          const cleanName = (item.channelName || '').trim();
          const rooms = parseNum(isActualRange ? (item.mtdRooms || item.todayRooms || 0) : (item.todayRooms || 0));
          const revenue = parseNum(isActualRange ? (item.mtdRevenue || item.todayRevenue || 0) : (item.todayRevenue || 0));
          const backendShare = (item as any).sharePct ?? (item as any).revenueSharePct ?? null;

          return {
            name: cleanName,
            rooms,
            revenue,
            adr: parseNum(item.adr || 0),
            sharePct: backendShare != null ? Number(backendShare).toFixed(1) : '-',
            isMtdFallback: false
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      if (mapped.length > 0) return mapped;
    }

    // Fallback: Map from salesByCategory
    const cats = (summaryData?.salesByCategory || []).filter((c: any) => c.categoryCode !== 'ROOM');

    return cats.map((c: any) => {
      const rev = parseNum(c.totalSales || c.todayActual || 0);
      const backendShare = c.sharePct ?? c.todaySharePct ?? null;
      const rooms = grandTotal.rooms || 0;
      const revpas = parseNum(summaryData?.summary?.totalRevPAS || 0);
      return {
        name: `${c.categoryName || c.categoryCode} 시너지`,
        rooms: rooms,
        revenue: rev,
        adr: revpas,
        sharePct: backendShare != null ? Number(backendShare).toFixed(1) : '-',
        isMtdFallback: false
      };
    }).filter((g: any) => g.revenue > 0).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [channelData, summaryData, grandTotal, ancillarySales.total, isActualRange, selectedChannel]);


  // Total Synergy Sales across all segments
  const totalSynergySum = useMemo(() => {
    return ancillarySales.total;
  }, [ancillarySales.total]);

  // Distinct Channel / Category Names for Table Filter
  const channelNames = useMemo(() => {
    const set = new Set<string>();
    if (channelData && channelData.length > 0) {
      channelData.forEach(item => {
        if (item.channelName && !item.isGrandTotal && item.channelName !== '전체 합계') {
          set.add(item.channelName);
        }
      });
    } else if (summaryData?.salesByCategory) {
      summaryData.salesByCategory.forEach((c: any) => {
        if (c.categoryName) set.add(c.categoryName);
      });
    }
    return Array.from(set);
  }, [channelData, summaryData]);

  // Filtered Table Rows
  const filteredTableRows = useMemo(() => {
    if (channelData && channelData.length > 0) {
      if (selectedChannel === 'ALL') {
        const subtotals = channelData.filter(r => r.isChannelSubtotal || r.isGrandTotal || r.channelName === '전체 합계');
        return subtotals.length > 0 ? subtotals : channelData;
      }
      return channelData.filter(r => {
        if (r.isGrandTotal) return true;
        if (r.channelName !== selectedChannel && !r.channelName?.startsWith(selectedChannel)) return false;
        const rooms = isActualRange ? (r.mtdRooms || r.todayRooms || 0) : (r.todayRooms || 0);
        const rev = isActualRange ? (r.mtdRevenue || r.todayRevenue || 0) : (r.todayRevenue || 0);
        return rooms > 0 || rev > 0 || r.isChannelSubtotal;
      });
    }

    // Fallback: Map from salesByFacility for deep breakdown
    const facilities = summaryData?.salesByFacility || [];
    if (facilities.length > 0) {
      return facilities
        .filter((f: any) => selectedChannel === 'ALL' || f.categoryName === selectedChannel || f.categoryCode === selectedChannel)
        .map((f: any) => {
          const rev = parseNum(f.totalSales || f.todayActual || 0);
          const visitors = parseNum(f.totalVisitors || f.visitors || 0);
          return {
            channelName: `[${f.categoryName || f.categoryCode}] ${f.shopName || f.facilityName}`,
            todayRooms: visitors,
            todayRevenue: rev,
            mtdRooms: visitors,
            mtdRevenue: rev,
            isChannelSubtotal: false,
            isGrandTotal: false
          };
        });
    }

    return [];
  }, [channelData, summaryData, selectedChannel, isActualRange]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                벨포레 채널별 시너지 분석
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" /> 실시간 통합 정산 기준
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3 flex-wrap break-keep">
              <Sparkles className="text-emerald-400 shrink-0" size={32} />
              <span className="break-keep">객실 판매 채널별 연계 시너지 대시보드</span>
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-2xl leading-relaxed break-keep">
              숙박객 유입 채널(자사몰, 온라인여행사, 휴양소, 단체영업 등)별 객실 판매와 타 부대시설(골프, 식음, 레저) 간의 복합 시너지 효과를 분석합니다.
            </p>

            {/* Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Sparkles size={14} className="shrink-0" /> <span className="whitespace-nowrap">1. 객실 세그먼트/채널 시너지 분석</span>
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Zap size={14} className="shrink-0" /> <span className="whitespace-nowrap">2. 앵커시설 순수 인과 & CAPA 분석</span>
              </NavLink>

              <NavLink 
                to="/synergy/weather-sales" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CloudRain size={14} className="shrink-0" /> <span className="whitespace-nowrap">3. 🌦️ 날씨-매출 상관관계 분석</span>
              </NavLink>

              <NavLink 
                to="/synergy/forecast" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'bg-teal-500 text-white shadow-md ring-2 ring-teal-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <TrendingUp size={14} className="shrink-0" /> <span className="whitespace-nowrap">4. 🔮 당일·익일 매출 예상</span>
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={14} /> 조회 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    !isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium whitespace-nowrap">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium whitespace-nowrap">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium whitespace-nowrap">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium whitespace-nowrap">상반기</button>
              <button onClick={() => applyPreset('YTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium whitespace-nowrap">연누계 (YTD)</button>
            </div>

            {/* Inputs & Apply Button */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:border-emerald-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
              
              {isRangeMode && (
                <>
                  <span className="text-slate-400 text-xs">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:border-emerald-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </>
              )}

              <button 
                onClick={handleSearch}
                disabled={loading}
                className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl flex items-center justify-between">
              <span>조회 기간: <strong className="text-white">{startDate}</strong> {isRangeMode && endDate ? `~ ${endDate}` : ''}</span>
              <span className="text-emerald-300 font-bold">{isActualRange ? `총 ${totalDays}일간 합계` : '단일 1일 실적'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* KPI 1: Rooms Sold */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
                <Hotel size={20} />
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-0.5 rounded-full">
                총 {grandTotal.rooms.toLocaleString()}실
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1 whitespace-nowrap">
              {isActualRange ? '구간 총 점유 객실수' : '금일 점유 객실수'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight tabular-nums whitespace-nowrap">
              {grandTotal.rooms.toLocaleString()} <span className="text-base text-slate-500 font-normal">실</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="whitespace-nowrap">객실 평균 단가 (ADR)</span>
            <strong className="text-slate-900 font-bold tabular-nums whitespace-nowrap">{grandTotal.adr > 0 ? `${formatCurrency(grandTotal.adr)}원` : '-'}</strong>
          </div>
        </div>

        {/* KPI 2: Room Revenue */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <Building2 size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full whitespace-nowrap">
                객실 순매출
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1 whitespace-nowrap">
              {isActualRange ? '구간 객실 총 순매출' : '금일 객실 총 순매출'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight tabular-nums whitespace-nowrap">
              {formatCurrency(grandTotal.revenue)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="whitespace-nowrap">순매출 기준</span>
            <span className="text-slate-600 font-medium whitespace-nowrap">부가세(VAT) 별도</span>
          </div>
        </div>

        {/* KPI 3: Spillover Synergy */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                <Zap size={20} />
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full whitespace-nowrap">
                부대시설 연계매출
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1 whitespace-nowrap">
              {isActualRange ? '구간 부대시설 연계 시너지' : '금일 부대시설 연계 시너지'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-amber-600 tracking-tight tabular-nums whitespace-nowrap">
              {formatCurrency(totalSynergySum)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="whitespace-nowrap">연계 창출 부대시설</span>
            <span className="text-amber-800 font-bold whitespace-nowrap">골프 · 식음 · 레저</span>
          </div>
        </div>

        {/* KPI 4: TRevPOR */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-0.5 rounded-full whitespace-nowrap">
                전사 통합 1실 가치
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1 whitespace-nowrap">
              통합 객실당 가치 (TRevPOR · 골프 포함)
            </span>
            <div className="text-3xl lg:text-4xl font-black text-indigo-600 tracking-tight tabular-nums whitespace-nowrap">
              {formatCurrency(parseNum(summaryData?.summary?.totalTrevPOR || 0))} <span className="text-base text-slate-500 font-normal">원/실</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="whitespace-nowrap">(객실 + 골프 + 식음 + 레저) ÷ 판매 객실수</span>
            <span className="text-indigo-700 font-bold whitespace-nowrap">전사 총합 기준</span>
          </div>
        </div>
      </div>

      {/* Main Section 1: Segment Breakdown Grid */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-5 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Building2 size={18} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                객실 판매 채널별 연계 기여도
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium ml-10 break-keep">
              자사채널, 여행사, 휴양소, 기업단체, 예약실 기준 객실 실적 및 부대시설 연계 기여도입니다.
            </p>
          </div>

          {/* Segment Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start xl:self-auto">
            <button
              onClick={() => setSelectedChannel('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedChannel === 'ALL' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              전체 채널
            </button>
            {channelNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChannel(name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedChannel === name 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Channel Cards Grid (3 Columns, Perfect '오와열' Alignment) */}
        {segmentSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {segmentSummaries.map((item: any, idx: number) => {
              const rank = idx + 1;
              const meta = getChannelMeta(item.name, rank);
              const ChannelIcon = meta.icon;

              return (
                <div 
                  key={idx} 
                  className={`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] hover:-translate-y-1 ${meta.borderHover} transition-all duration-300 flex flex-col justify-between group`}
                >
                  {/* Card Header: Rank, Icon, Channel Name & Share Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${meta.rankBadge}`}>
                          {rank}
                        </span>
                        <div className={`w-7 h-7 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center flex-shrink-0 border border-slate-100`}>
                          <ChannelIcon size={15} />
                        </div>
                        <h3 className="font-bold text-base text-slate-900 truncate">
                          {item.name}
                        </h3>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${meta.badgeStyle} flex-shrink-0`}>
                        비중 {item.sharePct}%
                      </span>
                    </div>

                    {/* Hero Metric: Revenue */}
                    <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/90 mb-4">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">
                        객실 순매출 (VAT 별도)
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight tabular-nums flex items-baseline">
                        <span>{formatCurrency(item.revenue)}</span>
                        <span className="text-sm font-bold text-slate-500 ml-1">원</span>
                      </div>

                      {/* Contribution Progress Bar */}
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-3">
                        <div 
                          className={`h-full bg-gradient-to-r ${meta.barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, Number(item.sharePct)))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats Matrix (오와열 완벽 정렬 2-Column Box) */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 grid grid-cols-2 divide-x divide-slate-100 text-xs">
                    <div className="pr-3 flex flex-col justify-center">
                      <span className="text-[11px] font-medium text-slate-400 mb-0.5">판매 객실수</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {item.rooms > 0 ? (
                          <>{item.rooms.toLocaleString()}<span className="text-xs font-medium text-slate-500 ml-0.5">실</span></>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">부대 정산</span>
                        )}
                      </span>
                    </div>
                    <div className="pl-3.5 flex flex-col justify-center">
                      <span className="text-[11px] font-medium text-slate-400 mb-0.5">객실 단가 (ADR)</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {item.adr > 0 ? (
                          <>{formatCurrency(item.adr)}<span className="text-xs font-medium text-slate-500 ml-0.5">원</span></>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">-</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            조회된 세그먼트 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* Main Section 2: Table 2 - 상세 판매 채널별 통합 실적 리포트 */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Activity size={18} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                상세 판매 채널별 실적 현황
              </h2>
              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                실시간 집계
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium ml-10">
              온라인 여행사(OTA), 전화/메신저, 기업영업 등 상세 채널별 객실 판매 실적 합계입니다.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm whitespace-nowrap min-w-[950px]">
            <thead className="whitespace-nowrap">
              <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 whitespace-nowrap">
                <th className="py-3.5 px-6 rounded-l-2xl whitespace-nowrap">판매 채널명</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">조회기간 판매 객실수</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">조회기간 객실 순매출</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">객실 단가 (ADR)</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">월누계(MTD) 객실수</th>
                <th className="py-3.5 px-6 text-right rounded-r-2xl whitespace-nowrap">월누계(MTD) 객실매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTableRows.length > 0 ? (
                filteredTableRows.map((item: any, idx: number) => {
                  const isGrand = item.isGrandTotal || item.channelName === '전체 합계';
                  const isSub = item.isChannelSubtotal;
                  
                  const rowClass = isGrand 
                    ? 'bg-slate-900 text-white font-extrabold shadow-sm'
                    : isSub 
                    ? 'bg-emerald-50/90 font-bold text-emerald-950 border-y border-emerald-100' 
                    : 'hover:bg-slate-50/80 transition-colors text-slate-700';

                  const rooms = parseNum(isActualRange ? (item.mtdRooms || 0) : (item.todayRooms || 0));
                  const rev = parseNum(isActualRange ? (item.mtdRevenue || 0) : (item.todayRevenue || 0));
                  const adr = parseNum(item.adr ?? 0);
                  const mtdRooms = parseNum(item.mtdRooms || 0);
                  const mtdRev = parseNum(item.mtdRevenue || 0);

                  return (
                    <tr key={idx} className={`${rowClass} whitespace-nowrap`}>
                      <td className="py-4 px-6 font-bold whitespace-nowrap">
                        {isGrand 
                          ? (item.channelName || '총합계') 
                          : (item.channelName || item.segmentName || '채널')}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold tabular-nums whitespace-nowrap">
                        {`${rooms.toLocaleString()}실`}
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold tabular-nums whitespace-nowrap">{formatCurrency(rev)}원</td>
                      <td className="py-4 px-6 text-right font-semibold tabular-nums whitespace-nowrap">
                        {adr > 0 ? `${formatCurrency(adr)}원` : '-'}
                      </td>
                      <td className={`py-4 px-6 text-right font-medium tabular-nums whitespace-nowrap ${isGrand ? 'text-slate-200' : 'text-slate-500'}`}>
                        {`${mtdRooms.toLocaleString()}실`}
                      </td>
                      <td className={`py-4 px-6 text-right font-bold tabular-nums whitespace-nowrap ${isGrand ? 'text-emerald-400' : 'text-slate-600'}`}>{formatCurrency(mtdRev)}원</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    조회된 채널 실적 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* [Ticket 36] 고객 여정 체류시간(duration_minutes) 구간별 객단가 및 복합 소비 시너지 분석 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-teal-50/50 via-white to-indigo-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs shrink-0 mt-0.5">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900">
                  고객 여정 체류시간(Stay Duration) 구간별 1인당 객단가 및 복합 소비 시너지
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  V6 SSOT · Ticket 36
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                통합 카드 결제 여정 마트(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">fact_customer_journeys</code>)의 최초 결제➔최종 결제 체류시간(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">duration_minutes</code>) 구간별 평균 소비액(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">avg_spent</code>)과 동선 결합 시너지를 분석합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stayDurationIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Fail-Stop · 백엔드 API 배포 대기 (/api/v6/report/customer-stay-duration-synergy)
              </span>
            )}
          </div>
        </div>

        {!stayDurationIntel ? (
          <div className="p-8 bg-slate-50/60">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800">
                [Zero-Fake / Fail-Stop] 고객 여정 체류시간 구간별 객단가 시너지 정규 마트 API 연동 대기 중
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">GET /api/v6/report/customer-stay-duration-synergy</code> 배포 전까지 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">단발 결제 (0분 · 단일업장)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">단일 업장 평균 객단가 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">1~3시간 체류 여정</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">레저+식음 연계 객단가 상승폭 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">3~6시간 체류 여정</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">반나절 체류 고객 평균 소비액 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">6시간+ 숙박·종일 체류</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">종일 체류 VIP 객단가 배수 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">총 분석 고객 여정 수</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {stayDurationIntel.summary?.totalJourneys != null ? `${Number(stayDurationIntel.summary.totalJourneys).toLocaleString()}건` : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  복합 소비 여정: {(stayDurationIntel.summary?.multiStopJourneys ?? stayDurationIntel.summary?.totalSynergyJourneys) != null ? `${Number(stayDurationIntel.summary?.multiStopJourneys ?? stayDurationIntel.summary?.totalSynergyJourneys).toLocaleString()}건` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">고객 평균 체류시간</div>
                <div className="text-xl font-black text-slate-700 mt-1">
                  {stayDurationIntel.summary?.avgStayMinutes != null ? `${stayDurationIntel.summary.avgStayMinutes}분` : (stayDurationIntel.summary?.singleStopAvgSpent != null ? `${formatCurrency(stayDurationIntel.summary.singleStopAvgSpent)}원` : '-')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  최초 결제 ➔ 최종 결제 구간
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">복합 소비 시너지 비중</div>
                <div className="text-xl font-black text-teal-700 mt-1">
                  {stayDurationIntel.summary?.synergySharePct != null ? `${stayDurationIntel.summary.synergySharePct}%` : (stayDurationIntel.summary?.midStayAvgSpent != null ? `${formatCurrency(stayDurationIntel.summary.midStayAvgSpent)}원` : '-')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  2개 이상 업장 복합 결제율
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <div className="text-xs font-bold text-indigo-700">단독 업장 소비 여정</div>
                <div className="text-lg font-black text-indigo-900 mt-1">
                  {(stayDurationIntel.summary?.golfOnlyJourneys != null && stayDurationIntel.summary?.roomOnlyJourneys != null) ? `골프 ${Number(stayDurationIntel.summary.golfOnlyJourneys).toLocaleString()} / 객실 ${Number(stayDurationIntel.summary.roomOnlyJourneys).toLocaleString()}건` : (stayDurationIntel.summary?.longStayAvgSpent != null ? `${formatCurrency(stayDurationIntel.summary.longStayAvgSpent)}원` : '-')}
                </div>
                <div className="text-[11px] text-indigo-600 mt-1">
                  단일 시설 집중 고객군
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">체류시간 구간별 여정 수 · 비중 · 복합 시너지 분석</span>
                <span className="text-[11px] text-slate-500">fact_customer_journeys 기준</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-bold">체류시간 구간</th>
                      <th className="py-2.5 px-4 text-right font-bold">여정 건수</th>
                      <th className="py-2.5 px-4 text-right font-bold">구간 비중</th>
                      <th className="py-2.5 px-4 text-right font-bold">복합 소비 건수</th>
                      <th className="py-2.5 px-4 text-right font-bold">복합 시너지율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(stayDurationIntel.durationTiers || stayDurationIntel.durationBuckets || []).map((b: any, idx: number) => (
                      <tr key={b.durationTier || b.stayBucket || idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-800">{b.durationTierName ?? b.stayBucket ?? '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {(b.journeyCount ?? b.journeys) != null ? `${Number(b.journeyCount ?? b.journeys).toLocaleString()}건` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {b.sharePct != null ? `${b.sharePct}%` : (b.avgStops != null ? `${b.avgStops}곳` : '-')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-teal-700">
                          {b.roomGolfSynergyCount != null ? `${Number(b.roomGolfSynergyCount).toLocaleString()}건` : (b.avgSpent != null ? `${formatCurrency(b.avgSpent)}원` : '-')}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {b.synergyRate != null ? `${b.synergyRate}%` : (b.totalRevenue != null ? `${formatCurrency(b.totalRevenue)}원` : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
