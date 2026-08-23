import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Zap, Building2, TrendingUp, Sparkles, 
  Hotel, Activity, Calendar, RefreshCw, ShieldCheck, CreditCard,
  Globe, Smartphone, PhoneCall, Users, Layers, Landmark
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

const getChannelMeta = (name: string, rank: number) => {
  let icon = Globe;
  let iconColor = 'text-blue-600';
  let iconBg = 'bg-blue-50';
  let borderHover = 'hover:border-blue-300';
  let barColor = 'from-blue-500 to-sky-400';
  let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200/60';

  if (name.includes('온라인') || name.includes('OTA')) {
    icon = Globe;
    iconColor = 'text-blue-600';
    iconBg = 'bg-blue-50';
    borderHover = 'hover:border-blue-300';
    barColor = 'from-blue-500 to-sky-400';
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200/60';
  } else if (name.includes('홈페이지') || name.includes('APP') || name.includes('자사')) {
    icon = Smartphone;
    iconColor = 'text-emerald-600';
    iconBg = 'bg-emerald-50';
    borderHover = 'hover:border-emerald-300';
    barColor = 'from-emerald-500 to-teal-400';
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  } else if (name.includes('기업') || name.includes('휴양소')) {
    icon = Landmark;
    iconColor = 'text-indigo-600';
    iconBg = 'bg-indigo-50';
    borderHover = 'hover:border-indigo-300';
    barColor = 'from-indigo-500 to-violet-400';
    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
  } else if (name.includes('전화') || name.includes('메신저') || name.includes('예약실')) {
    icon = PhoneCall;
    iconColor = 'text-purple-600';
    iconBg = 'bg-purple-50';
    borderHover = 'hover:border-purple-300';
    barColor = 'from-purple-500 to-fuchsia-400';
    badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200/60';
  } else if (name.includes('단체') || name.includes('세미나') || name.includes('연회')) {
    icon = Users;
    iconColor = 'text-amber-600';
    iconBg = 'bg-amber-50';
    borderHover = 'hover:border-amber-300';
    barColor = 'from-amber-500 to-orange-400';
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200/60';
  } else {
    icon = Layers;
    iconColor = 'text-slate-600';
    iconBg = 'bg-slate-100';
    borderHover = 'hover:border-slate-300';
    barColor = 'from-slate-500 to-slate-400';
    badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200/60';
  }

  const rankBadge = rank === 1 
    ? 'bg-amber-500 text-white shadow-xs font-black' 
    : rank === 2 
    ? 'bg-slate-700 text-white font-bold' 
    : rank === 3 
    ? 'bg-amber-800 text-white font-bold' 
    : 'bg-slate-100 text-slate-600 font-semibold';

  return { icon, iconColor, iconBg, borderHover, barColor, badgeStyle, rankBadge };
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
  const [summaryData, setSummaryData] = useState<any>(null);
  const [matrixData, setMatrixData] = useState<any[]>([]);
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
        : `date=${eDate || sDate}`;

      // Parallel Fetch: 1. API 7 Channel Sales, 2. Revenue Summary, 3. API 2 Matrix Weekly (Category SSOT)
      const [channelRes, summaryRes, matrixRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${summaryQueryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => null)
      ]);

      const channelPayload = channelRes?.data ?? channelRes;
      const summaryPayload = summaryRes?.data ?? summaryRes;
      const matrixPayload = matrixRes?.data ?? matrixRes;

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
    const gtRow = channelData.find(item => item.isGrandTotal || item.channelName === '전체 합계');
    if (gtRow) {
      const rooms = parseNum(isActualRange ? (gtRow.mtdRooms || gtRow.todayRooms || 0) : (gtRow.todayRooms || 0));
      const revenue = parseNum(isActualRange ? (gtRow.mtdRevenue || gtRow.todayRevenue || 0) : (gtRow.todayRevenue || 0));
      if (rooms > 0 || revenue > 0) {
        return {
          rooms,
          revenue,
          adr: rooms > 0 ? Math.round(revenue / rooms) : 0
        };
      }
    }

    // Fallback: Bind directly from matrix-weekly SSOT
    if (matrixData && matrixData.length > 0) {
      const roomRow = matrixData.find(r => (r.isSubtotal || r.isChannelSubtotal) && (r.categoryCode === 'ROOM' || r.categoryCode === '콘도' || r.categoryName === '콘도'));
      if (roomRow) {
        const roomsSold = parseNum(summaryData?.summary?.totalRooms || roomRow.todayVisitors || roomRow.rangeVisitors || 0);
        const roomRev = parseNum(roomRow.todayActual || roomRow.rangeActual || roomRow.mtdActual || 0);
        if (roomRev > 0 || roomsSold > 0) {
          return {
            rooms: roomsSold,
            revenue: roomRev,
            adr: roomsSold > 0 ? Math.round(roomRev / roomsSold) : 0
          };
        }
      }
    }

    // Fallback: Bind directly from revenue-summary SSOT
    const roomCat = summaryData?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도' || c.categoryName === '콘도');
    const roomRev = parseNum(roomCat?.totalSales || roomCat?.todayActual || 0);
    const roomsSold = parseNum(summaryData?.summary?.totalRooms || 0);
    
    return {
      rooms: roomsSold,
      revenue: roomRev,
      adr: roomsSold > 0 ? Math.round(roomRev / roomsSold) : parseNum(summaryData?.summary?.totalADR || 0)
    };
  }, [channelData, matrixData, summaryData, isActualRange]);

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

      const totalAncillary = Math.max(0, totalRev > 0 ? (totalRev - roomRev) : (golfRev + fnbRev + leisureRev));
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
    
    const totalRev = parseNum(summaryData?.summary?.totalRevenue || 0);
    const roomRev = grandTotal.revenue || parseNum(cats.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도' || c.categoryName === '콘도')?.totalSales || cats.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도')?.todayActual || 0);
    const totalAncillary = Math.max(0, totalRev > 0 ? (totalRev - roomRev) : (golfRev + fnbRev + leisureRev));

    return {
      golf: golfRev,
      fnb: fnbRev,
      ticket: leisureRev,
      total: totalAncillary
    };
  }, [matrixData, summaryData, grandTotal.revenue]);

  // Ground-Up Breakdown Grouping (with intelligent MTD fallback for pipeline lag dates)
  const segmentSummaries = useMemo(() => {
    if (channelData && channelData.length > 0) {
      let subtotalRows = channelData.filter(item => item.isChannelSubtotal || (item.channelName && item.channelName.includes('[소계]')));
      if (selectedChannel !== 'ALL') {
        subtotalRows = subtotalRows.filter(item => item.channelName === selectedChannel || item.channelName?.startsWith(selectedChannel));
      }
      const totalRoomRev = grandTotal.revenue || 1;

      // 1. Try today's / range channel rows
      const mapped = subtotalRows
        .map(item => {
          let cleanName = (item.channelName || '').replace(/\s*\[소계\]/g, '').trim();
          const rooms = parseNum(isActualRange ? (item.mtdRooms || item.todayRooms || 0) : (item.todayRooms || 0));
          const revenue = parseNum(isActualRange ? (item.mtdRevenue || item.todayRevenue || 0) : (item.todayRevenue || 0));
          const shareRatio = totalRoomRev > 0 ? revenue / totalRoomRev : 0;

          return {
            name: cleanName,
            rooms,
            revenue,
            adr: rooms > 0 ? Math.round(revenue / rooms) : 0,
            sharePct: (shareRatio * 100).toFixed(1),
            isMtdFallback: false
          };
        })
        .filter(g => g.rooms > 0 || g.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);

      if (mapped.length > 0) return mapped;

      // 2. Fallback: If today's channel data is 0 due to pipeline lag, fallback to MTD channel distribution
      const mtdTotalRev = subtotalRows.reduce((sum, r) => sum + parseNum(r.mtdRevenue || 0), 0) || 1;
      const mtdMapped = subtotalRows
        .map(item => {
          let cleanName = (item.channelName || '').replace(/\s*\[소계\]/g, '').trim();
          const rooms = parseNum(item.mtdRooms || 0);
          const revenue = parseNum(item.mtdRevenue || 0);
          const shareRatio = mtdTotalRev > 0 ? revenue / mtdTotalRev : 0;

          return {
            name: `${cleanName} (당월 MTD)`,
            rooms,
            revenue,
            adr: rooms > 0 ? Math.round(revenue / rooms) : 0,
            sharePct: (shareRatio * 100).toFixed(1),
            isMtdFallback: true
          };
        })
        .filter(g => g.rooms > 0 || g.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);

      if (mtdMapped.length > 0) return mtdMapped;
    }

    // 3. Fallback: Map from salesByCategory
    const cats = (summaryData?.salesByCategory || []).filter((c: any) => c.categoryCode !== 'ROOM');
    const totalAncillary = ancillarySales.total || 1;

    return cats.map((c: any) => {
      const rev = parseNum(c.totalSales || c.todayActual || 0);
      const share = totalAncillary > 0 ? (rev / totalAncillary) * 100 : 0;
      const rooms = grandTotal.rooms || 0;
      const revpas = rooms > 0 ? Math.round(rev / rooms) : 0;
      return {
        name: `${c.categoryName || c.categoryCode} 시너지`,
        rooms: rooms,
        revenue: rev,
        adr: revpas,
        sharePct: share.toFixed(1),
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
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <Sparkles className="text-emerald-400" size={32} />
              객실 판매 채널별 연계 시너지 대시보드
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-2xl leading-relaxed">
              숙박객 유입 채널(자사몰, 온라인여행사, 휴양소, 단체영업 등)별 객실 판매와 타 부대시설(골프, 식음, 레저) 간의 복합 시너지 효과를 분석합니다.
            </p>

            {/* Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Sparkles size={14} /> 1. 객실 세그먼트/채널 시너지 분석
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Activity size={14} /> 2. 영업장별 객실 연계 시너지 분석
              </NavLink>

              <NavLink 
                to="/synergy/bundles" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-cyan-500 text-white shadow-md ring-2 ring-cyan-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CreditCard size={14} /> 3. 고객 결제 묶음(Bundle) 분석
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Calendar size={14} /> 조회 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isRangeMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium">상반기</button>
              <button onClick={() => applyPreset('YTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-emerald-200 font-medium">연누계 (YTD)</button>
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
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isActualRange ? '구간 총 점유 객실수' : '금일 점유 객실수'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
              {grandTotal.rooms.toLocaleString()} <span className="text-base text-slate-500 font-normal">실</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>객실 평균 단가 (ADR)</span>
            <strong className="text-slate-900 font-bold tabular-nums">{formatCurrency(grandTotal.adr)}원</strong>
          </div>
        </div>

        {/* KPI 2: Room Revenue */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <Building2 size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full">
                객실 순매출
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isActualRange ? '구간 객실 총 순매출' : '금일 객실 총 순매출'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(grandTotal.revenue)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>순매출 기준</span>
            <span className="text-slate-600 font-medium">부가세(VAT) 별도</span>
          </div>
        </div>

        {/* KPI 3: Spillover Synergy */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                <Zap size={20} />
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full">
                부대시설 연계매출
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isActualRange ? '구간 부대시설 연계 시너지' : '금일 부대시설 연계 시너지'}
            </span>
            <div className="text-3xl lg:text-4xl font-black text-amber-600 tracking-tight tabular-nums">
              {formatCurrency(totalSynergySum)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>연계 창출 부대시설</span>
            <span className="text-amber-800 font-bold">골프 · 식음 · 레저</span>
          </div>
        </div>

        {/* KPI 4: RevPAS */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-0.5 rounded-full">
                전사 통합 1실 가치
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              통합 객실당 가치 (RevPAS · 골프 포함)
            </span>
            <div className="text-3xl lg:text-4xl font-black text-indigo-600 tracking-tight tabular-nums">
              {formatCurrency(grandTotal.rooms > 0 ? Math.round((grandTotal.revenue + totalSynergySum) / grandTotal.rooms) : 0)} <span className="text-base text-slate-500 font-normal">원/실</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>(객실 + 골프 + 식음 + 레저) ÷ 객실수</span>
            <span className="text-indigo-700 font-bold">전사 총합 기준</span>
          </div>
        </div>
      </div>

      {/* Main Section 1: Segment Breakdown Grid */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-5 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Building2 size={18} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                객실 판매 채널별 연계 기여도
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium ml-10">
              자사채널, 여행사, 휴양소, 기업단체, 예약실 기준 객실 실적 및 부대시설 연계 기여도입니다.
            </p>
          </div>

          {/* Segment Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start xl:self-auto">
            <button
              onClick={() => setSelectedChannel('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
                          style={{ width: `${Math.min(100, Math.max(3, Number(item.sharePct)))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats Matrix (오와열 완벽 정렬 2-Column Box) */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 grid grid-cols-2 divide-x divide-slate-100 text-xs">
                    <div className="pr-3 flex flex-col justify-center">
                      <span className="text-[11px] font-medium text-slate-400 mb-0.5">판매 객실수</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {item.rooms.toLocaleString()}<span className="text-xs font-medium text-slate-500 ml-0.5">실</span>
                      </span>
                    </div>
                    <div className="pl-3.5 flex flex-col justify-center">
                      <span className="text-[11px] font-medium text-slate-400 mb-0.5">객실 단가 (ADR)</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {formatCurrency(item.adr)}<span className="text-xs font-medium text-slate-500 ml-0.5">원</span>
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
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="py-3.5 px-6 rounded-l-2xl">판매 채널명</th>
                <th className="py-3.5 px-6 text-right">조회기간 판매 객실수</th>
                <th className="py-3.5 px-6 text-right">조회기간 객실 순매출</th>
                <th className="py-3.5 px-6 text-right">객실 단가 (ADR)</th>
                <th className="py-3.5 px-6 text-right">월누계(MTD) 객실수</th>
                <th className="py-3.5 px-6 text-right rounded-r-2xl">월누계(MTD) 객실매출</th>
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
                  const adr = rooms > 0 ? Math.round(rev / rooms) : 0;
                  const mtdRooms = parseNum(item.mtdRooms || 0);
                  const mtdRev = parseNum(item.mtdRevenue || 0);

                  return (
                    <tr key={idx} className={rowClass}>
                      <td className="py-4 px-6 font-bold">
                        {isGrand 
                          ? '전체 합계' 
                          : isSub 
                          ? `${item.channelName || '채널'} [소계]` 
                          : item.partnerName && item.partnerName !== item.channelName && item.partnerName !== item.segmentName
                          ? `${item.channelName || item.segmentName || '채널'} - ${item.partnerName}${item.roomType ? ` (${item.roomType})` : ''}`
                          : item.roomType && item.roomType !== '채널 소계' && item.roomType !== '전체 합계'
                          ? `${item.segmentName || item.channelName || '세그먼트'} (${item.roomType})`
                          : `${item.segmentName || item.channelName || '세그먼트'}`}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold tabular-nums">{rooms.toLocaleString()}실</td>
                      <td className="py-4 px-6 text-right font-extrabold tabular-nums">{formatCurrency(rev)}원</td>
                      <td className="py-4 px-6 text-right font-semibold tabular-nums">{formatCurrency(adr)}원</td>
                      <td className={`py-4 px-6 text-right font-medium tabular-nums ${isGrand ? 'text-slate-200' : 'text-slate-500'}`}>{mtdRooms.toLocaleString()}실</td>
                      <td className={`py-4 px-6 text-right font-bold tabular-nums ${isGrand ? 'text-emerald-400' : 'text-slate-600'}`}>{formatCurrency(mtdRev)}원</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    조회된 채널 실적 데이터가 없습니다.
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
