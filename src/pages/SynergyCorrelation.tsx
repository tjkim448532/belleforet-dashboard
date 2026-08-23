import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Building2, TrendingUp, Sparkles, 
  Ticket, Utensils, Calendar, RefreshCw, ShieldCheck,
  Grid, HelpCircle, CreditCard, Zap, Compass, Flag, Waves
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

import type { StoreCorrelationItem, AnchorInfo, CrossSynergyItem } from '../components/synergy/types';
import SynergyStoreCard from '../components/synergy/SynergyStoreCard';
import SynergyTable from '../components/synergy/SynergyTable';

type AnchorType = 'ROOM' | 'MEDIA_ART' | 'LUGE' | 'GOLF' | 'SUMMERLAND' | 'FARM';

interface AnchorOption {
  code: AnchorType;
  name: string;
  category: string;
  icon: any;
  color: string;
  activeBg: string;
  desc: string;
}

const ANCHOR_OPTIONS: AnchorOption[] = [
  { code: 'ROOM', name: '객실 숙박료', category: '콘도', icon: Building2, color: 'text-indigo-400', activeBg: 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400/40', desc: '객실 투숙객 증가 시 타 부대시설(식음/레저/골프) 동반 소비 파급 효과' },
  { code: 'MEDIA_ART', name: '미디어아트센터', category: '레저', icon: Sparkles, color: 'text-purple-400', activeBg: 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400/40', desc: '미디어아트 관람객 증가 시 카페, 기프트샵, 인근 식음/레저 연동 반응' },
  { code: 'LUGE', name: '마운틴카트', category: '레저', icon: Compass, color: 'text-rose-400', activeBg: 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/40', desc: '마운틴카트(액티비티) 이용객 증가 시 목장, 모토아레나, 식음 매장 연계 소비' },
  { code: 'GOLF', name: '골프장', category: '골프', icon: Flag, color: 'text-emerald-400', activeBg: 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/40', desc: '골프 내장객 증가 시 스타트하우스, 레스토랑, 객실 서비스 연동' },
  { code: 'SUMMERLAND', name: '썸머랜드(워터파크)', category: '레저', icon: Waves, color: 'text-cyan-400', activeBg: 'bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400/40', desc: '워터파크 피크 시 푸드트럭, 편의점, 주변 부대시설 동반 반응' },
  { code: 'FARM', name: '벨포레 목장', category: '레저', icon: Ticket, color: 'text-amber-400', activeBg: 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/40', desc: '목장/체험 가족 단위 방문객 증가 시 미디어아트, 카페 연계 반응' },
];

export default function SynergyCorrelation() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate || globalStartDate);
  
  // Anchor Selection State (NEW SSOT)
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorType>('ROOM');
  const [anchorData, setAnchorData] = useState<AnchorInfo | null>(null);

  const [correlationData, setCorrelationData] = useState<StoreCorrelationItem[]>([]);
  const [includeMoto, setIncludeMoto] = useState<boolean>(true);
  const [summaryKpis, setSummaryKpis] = useState({
    ticketSales: 0,
    motoSales: 0,
    totalFnbSales: 0,
    totalRooms: 1
  });
  const [loading, setLoading] = useState(true);

  const [selectedLeisureShop, setSelectedLeisureShop] = useState<string>('ALL');
  const [selectedFnbShop, setSelectedFnbShop] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<'default' | 'correlation' | 'elasticity' | 'spillover'>('correlation');

  // Days difference calculation
  const totalDays = useMemo(() => {
    if (!isRangeMode || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [startDate, endDate, isRangeMode]);

  const isActualRange = useMemo(() => {
    return isRangeMode && !!endDate && startDate !== endDate;
  }, [isRangeMode, startDate, endDate]);

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean, overrideAnchor?: AnchorType) => {
    setLoading(true);
    let sDate = overrideStart || startDate;
    let eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate && sDate !== eDate);
    const targetAnchor = overrideAnchor || selectedAnchor;

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

      // Calculate statistical time-series range (if single date, use MTD range for valid correlation calculation)
      const monthStart = sDate ? `${sDate.substring(0, 7)}-01` : sDate;
      const crossStartDate = rangeActive && eDate ? sDate : monthStart;
      const crossEndDate = rangeActive && eDate ? eDate : sDate;

      const crossParams = `anchor=${targetAnchor}&startDate=${crossStartDate}&endDate=${crossEndDate}&_t=${Date.now()}`;

      // Parallel Fetch: Cross-Synergy Matrix API (V6 SSOT), Matrix-Weekly (49 venues SSOT), Revenue Summary
      const [crossRes, matrixRes, summaryRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/cross-synergy-matrix?${crossParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`).catch(() => null)
      ]);

      const matrixRows: any[] = matrixRes?.data || matrixRes || [];
      const summaryObj = summaryRes?.data?.summary || summaryRes?.summary || {};
      
      const cleanNum = (val: any) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        return Number(String(val).replace(/,/g, '').trim()) || 0;
      };

      // Extract total rooms sold
      let totalRooms = cleanNum(summaryObj.totalRooms);
      if (totalRooms <= 0) {
        const roomSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'ROOM' || r.categoryCode === '콘도'));
        totalRooms = cleanNum(rangeActive ? (roomSub?.rangeVisitors || roomSub?.mtdVisitors || summaryObj.totalRooms) : (roomSub?.todayVisitors || summaryObj.totalRooms || 0));
      }
      if (totalRooms <= 0) totalRooms = 0;

      // Extract Official Division Subtotals from matrix-weekly (Track 3 UNIFIED)
      let ticketSales = 0;
      let motoSales = 0;
      let fnbSales = 0;

      if (Array.isArray(matrixRows)) {
        const ticketSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'TICKET' || r.categoryName === '레저본부'));
        const motoSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'MOTO' || r.categoryName === '모토아레나'));
        const fnbSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'FNB' || r.categoryName === '식음'));

        const getSubSales = (sub: any) => {
          if (!sub) return 0;
          return rangeActive 
            ? cleanNum(sub.rangeActual || sub.mtdActual || sub.todayActual)
            : cleanNum(sub.todayActual);
        };

        if (ticketSub) ticketSales = getSubSales(ticketSub);
        if (motoSub) motoSales = getSubSales(motoSub);
        if (fnbSub) fnbSales = getSubSales(fnbSub);
      }

      setSummaryKpis({
        ticketSales,
        motoSales,
        totalFnbSales: fnbSales,
        totalRooms
      });

      // Calculate current selected anchor's exact revenue for the selected timeframe
      let currentAnchorPeriodSales = 0;
      if (Array.isArray(matrixRows)) {
        if (targetAnchor === 'ROOM') {
          const roomSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'ROOM' || r.categoryName === '콘도' || r.categoryCode === 'CONDO'));
          currentAnchorPeriodSales = cleanNum(rangeActive ? (roomSub?.rangeActual || roomSub?.mtdActual) : roomSub?.todayActual);
          if (currentAnchorPeriodSales <= 0) currentAnchorPeriodSales = cleanNum(summaryObj.totalRevenue);
        } else if (targetAnchor === 'GOLF') {
          const golfSub = matrixRows.find((r: any) => r.isSubtotal && (r.categoryCode === 'GOLF' || r.categoryName === '골프'));
          currentAnchorPeriodSales = cleanNum(rangeActive ? (golfSub?.rangeActual || golfSub?.mtdActual) : golfSub?.todayActual);
        } else if (targetAnchor === 'MEDIA_ART') {
          const mediaVenue = matrixRows.find((r: any) => r.shopName === '미디어아트센터');
          currentAnchorPeriodSales = cleanNum(rangeActive ? (mediaVenue?.rangeActual || mediaVenue?.mtdActual) : mediaVenue?.todayActual);
        } else if (targetAnchor === 'LUGE') {
          const kartVenue = matrixRows.find((r: any) => r.shopName === '마운틴카트');
          currentAnchorPeriodSales = cleanNum(rangeActive ? (kartVenue?.rangeActual || kartVenue?.mtdActual) : kartVenue?.todayActual);
        } else if (targetAnchor === 'SUMMERLAND') {
          const summerVenue = matrixRows.find((r: any) => r.shopName === '썸머랜드');
          currentAnchorPeriodSales = cleanNum(rangeActive ? (summerVenue?.rangeActual || summerVenue?.mtdActual) : summerVenue?.todayActual);
        } else if (targetAnchor === 'FARM') {
          const farmVenue = matrixRows.find((r: any) => r.shopName === '벨포레 목장');
          currentAnchorPeriodSales = cleanNum(rangeActive ? (farmVenue?.rangeActual || farmVenue?.mtdActual) : farmVenue?.todayActual);
        }
      }

      // Set Anchor Info
      if (crossRes?.anchor) {
        setAnchorData({
          ...crossRes.anchor,
          periodTotalRevenue: currentAnchorPeriodSales > 0 ? currentAnchorPeriodSales : crossRes.anchor.periodTotalRevenue,
          dailyAvgRevenue: crossRes.anchor.dailyAvgRevenue || currentAnchorPeriodSales
        });
      }

      // Map correlations from cross-synergy-matrix API (V6 SSOT)
      const rawCorrelations: CrossSynergyItem[] = crossRes?.correlations || [];
      const physicalShops = Array.isArray(matrixRows) ? matrixRows.filter((r: any) => !r.isSubtotal && !r.isGrandTotal) : [];

      const corrList: StoreCorrelationItem[] = rawCorrelations.map((item) => {
        const shopName = item.targetShopName;
        // Find corresponding venue in matrix-weekly for actual POS sales
        const matchVenue = physicalShops.find((r: any) => r.shopName === shopName || r.facilityName === shopName);
        const venueSales = matchVenue 
          ? (rangeActive ? cleanNum(matchVenue.rangeActual || matchVenue.mtdActual || matchVenue.todayActual) : cleanNum(matchVenue.todayActual))
          : 0;

        let division = '레저본부';
        if (item.categoryName === '식음' || item.categoryName === '식음팀') division = '식음팀';
        else if (item.categoryName === '모토아레나' || shopName.includes('모토아레나')) division = '모토아레나';
        else if (item.categoryName === '골프' || item.categoryName === '골프본부') division = '골프본부';
        else if (item.categoryName === '콘도' || item.categoryName === '객실') division = '콘도';

        return {
          shopName,
          storeName: shopName,
          divisionName: division,
          totalSales: venueSales,
          correlatedSales: item.spilloverPerMillion > 0 && crossRes?.anchor?.periodTotalRevenue 
            ? Math.round((crossRes.anchor.periodTotalRevenue / 1000000) * item.spilloverPerMillion) 
            : 0,
          correlatedVisitors: matchVenue ? cleanNum(matchVenue.todayVisitors || matchVenue.rangeVisitors || 0) : 0,
          spilloverRate: Math.round(item.elasticityPercent * 10) / 10,
          correlationCoefficient: item.correlationCoefficient,
          elasticityPercent: item.elasticityPercent,
          spilloverPerMillion: item.spilloverPerMillion,
          synergyGrade: item.synergyGrade,
          insight: item.insight,
          interactionGrade: item.synergyGrade === 'EXCELLENT' ? 'HIGH_SYNERGY' : item.synergyGrade === 'HIGH' ? 'MODERATE_SYNERGY' : 'WEAK',
          revPasContribution: totalRooms > 0 ? Math.round(venueSales / totalRooms) : 0,
          isGuestRatioTrackable: true,
          calculationMethod: 'TIME_SERIES_REGRESSION'
        };
      });

      setCorrelationData(corrList);
    } catch (err) {
      console.error('Synergy Correlation API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with global DateContext on mount and updates
  useEffect(() => {
    setIsRangeMode(globalIsRange);
    setStartDate(globalStartDate);
    setEndDate(globalEndDate || globalStartDate);
    fetchData(globalStartDate, globalEndDate || globalStartDate, globalIsRange, selectedAnchor);
  }, [globalStartDate, globalEndDate, globalIsRange, selectedAnchor]);

  const handleAnchorChange = (anchor: AnchorType) => {
    setSelectedAnchor(anchor);
    fetchData(startDate, endDate, isRangeMode, anchor);
  };

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
    fetchData(s, e, isRangeMode, selectedAnchor);
  };

  // Quick Preset Handlers
  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange, selectedAnchor);
  };

  // Sorting function
  const sortCorrelations = (items: StoreCorrelationItem[]) => {
    return [...items].sort((a, b) => {
      if (sortMode === 'correlation') {
        return (b.correlationCoefficient ?? -1) - (a.correlationCoefficient ?? -1);
      } else if (sortMode === 'elasticity') {
        return (b.elasticityPercent ?? 0) - (a.elasticityPercent ?? 0);
      } else if (sortMode === 'spillover') {
        return (b.spilloverPerMillion ?? 0) - (a.spilloverPerMillion ?? 0);
      }
      return b.totalSales - a.totalSales;
    });
  };

  // Leisure and Moto Stores
  const leisureStoreAnalysis = useMemo(() => {
    const items = correlationData.filter(c => {
      if (c.divisionName === '골프본부' || c.divisionName === '식음팀') return false;
      if (!includeMoto && (c.divisionName === '모토아레나' || c.shopName.includes('모토아레나'))) return false;
      return c.divisionName === '레저본부' || c.divisionName === '모토아레나';
    }).map(c => ({
      ...c,
      color: 'border-purple-200 bg-purple-50/40 text-purple-900'
    }));
    return sortCorrelations(items);
  }, [correlationData, includeMoto, sortMode]);

  // F&B Stores
  const fnbStoreAnalysis = useMemo(() => {
    const items = correlationData.filter(c => c.divisionName === '식음팀').map(c => ({
      ...c,
      color: 'border-amber-200 bg-amber-50/40 text-amber-900'
    }));
    return sortCorrelations(items);
  }, [correlationData, sortMode]);

  // Golf / Other Stores
  const golfStoreAnalysis = useMemo(() => {
    const items = correlationData.filter(c => c.divisionName === '골프본부' || c.divisionName === '콘도').map(c => ({
      ...c,
      color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
    }));
    return sortCorrelations(items);
  }, [correlationData, sortMode]);

  // Overall Division Summary KPIs
  const totalLeisureSales = includeMoto 
    ? summaryKpis.ticketSales + summaryKpis.motoSales 
    : summaryKpis.ticketSales;

  const totalFnbSales = summaryKpis.totalFnbSales;

  // Filtered for Cards
  const filteredLeisureStores = useMemo(() => {
    if (selectedLeisureShop !== 'ALL') {
      return leisureStoreAnalysis.filter(s => s.shopName === selectedLeisureShop);
    }
    return leisureStoreAnalysis;
  }, [leisureStoreAnalysis, selectedLeisureShop]);

  const filteredFnbStores = useMemo(() => {
    if (selectedFnbShop !== 'ALL') {
      return fnbStoreAnalysis.filter(s => s.shopName === selectedFnbShop);
    }
    return fnbStoreAnalysis;
  }, [fnbStoreAnalysis, selectedFnbShop]);

  const currentAnchorObj = ANCHOR_OPTIONS.find(a => a.code === selectedAnchor) || ANCHOR_OPTIONS[0];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-400/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30 tracking-wide">
                벨포레 교차 시너지 & 매출 탄력성 분석
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" /> 트랙 3 실시간 통합 정산 기준
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <Grid className="text-indigo-400" size={32} />
              영업장별 앵커 연계 교차 시너지 분석
            </h1>
            <p className="text-indigo-100 mt-2 text-sm lg:text-base font-normal max-w-2xl leading-relaxed">
              객실뿐만 아니라 미디어아트, 마운틴카트, 골프 등 주요 앵커 시설 매출 증가 시 전사 30여 개 영업장으로 파급되는 동반 성장 상관도와 매출 탄력성을 분석합니다.
            </p>

            {/* Navigation Sub-Tabs Bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-teal-500 text-white shadow-md' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Sparkles size={14} /> 1. 객실 세그먼트/채널 시너지 분석
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30"
              >
                <Zap size={14} /> 2. 앵커시설 교차 시너지 & 탄력성 분석
              </NavLink>

              <NavLink 
                to="/synergy/bundles" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-cyan-500 text-white shadow-md' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CreditCard size={14} /> 3. 고객 결제 묶음(Bundle) 분석
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Calendar size={14} /> 분석 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !isRangeMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isRangeMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">상반기</button>
              <button onClick={() => applyPreset('YTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">연누계 (YTD)</button>
            </div>

            {/* Date Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-400 transition-colors"
              />
              {isRangeMode && (
                <>
                  <span className="text-slate-400 text-xs">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-400 transition-colors"
                  />
                </>
              )}
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1 ml-auto"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl flex items-center justify-between">
              <span>조회 기간: <strong className="text-white">{startDate}</strong> {isRangeMode && endDate ? `~ ${endDate}` : ''}</span>
              <span className="text-indigo-300 font-bold">{isRangeMode ? `총 ${totalDays}일간 분석` : '단일 1일 분석'}</span>
            </div>
          </div>
        </div>

        {/* 🎯 [NEW SSOT] 6대 앵커 시설 선택 바 (Anchor Selector Bar) */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap size={15} className="text-amber-400" /> 분석 기준 앵커 시설 선택 (Driving Anchor Facility):
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              선택한 시설의 매출 증가 시 전사 30여 개 영업장 반응을 즉시 분석합니다.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {ANCHOR_OPTIONS.map((opt) => {
              const IconComponent = opt.icon;
              const isSelected = selectedAnchor === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleAnchorChange(opt.code)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-95 overflow-hidden ${
                    isSelected 
                      ? opt.activeBg 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <IconComponent size={18} className={`shrink-0 ${isSelected ? 'text-white' : opt.color}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0 ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                    }`}>
                      {opt.category}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs leading-snug truncate">{opt.name}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {opt.code === 'ROOM' ? '전사 32개 매장' : opt.code === 'MEDIA_ART' ? '목장/카페/식음' : opt.code === 'LUGE' ? '목장/서킷/식음' : opt.code === 'GOLF' ? '레스토랑/콘도' : '전사 동반 반응'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Data Controls (Sorting & MotoArena Toggle Switch) */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          {/* MotoArena Inclusion Switch */}
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/15 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-200">모토아레나(서킷) 분석:</span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIncludeMoto(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  includeMoto 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                포함 (레저+모토)
              </button>
              <button
                type="button"
                onClick={() => setIncludeMoto(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  !includeMoto 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                불포함 (순수 레저만)
              </button>
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">데이터 정렬 기준:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="bg-black/30 border border-white/20 text-white text-xs rounded-xl px-4 py-2 outline-none focus:border-indigo-400 focus:bg-black/50 transition-colors cursor-pointer font-medium"
            >
              <option value="correlation" className="text-slate-800">동반 매출 상관도(r) 높은 순</option>
              <option value="elasticity" className="text-slate-800">매출 탄력성(%) 높은 순</option>
              <option value="spillover" className="text-slate-800">100만원당 낙수액 높은 순</option>
              <option value="default" className="text-slate-800">영업장 실제 총매출 순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards (Anchor Overview & Total Sales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Anchor Overview Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-700/40 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-bold text-indigo-200 flex items-center gap-2 min-w-0">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" /> <span className="truncate">기준 앵커 시설 실적</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 whitespace-nowrap shrink-0">
                {currentAnchorObj.name}
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-1 tabular-nums whitespace-nowrap truncate">
              {formatCurrency(anchorData?.periodTotalRevenue || 0)} <span className="text-base text-slate-300 font-normal">원</span>
            </div>
            <p className="text-xs text-indigo-200 font-medium mb-3 truncate">
              {isActualRange ? `선택 기간(총 ${totalDays}일간) ` : `${startDate} 당일 `}
              <strong>{currentAnchorObj.name}</strong> 결제 실매출액
            </p>
          </div>
          <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
            <span>{isActualRange ? '1일 평균 매출:' : '금월(MTD) 1일 평균:'}</span>
            <strong className="text-white tabular-nums whitespace-nowrap">₩ {formatCurrency(anchorData?.dailyAvgRevenue || 0)}원/일</strong>
          </div>
        </div>

        {/* Leisure Subtotal Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2 min-w-0">
                <Ticket className="w-5 h-5 text-purple-600 shrink-0" /> 
                <span className="truncate">
                  {includeMoto 
                    ? (isActualRange ? '구간 레저·모토 총매출' : '레저본부 & 모토아레나 총매출')
                    : (isActualRange ? '구간 순수 레저 총매출' : '순수 레저본부 총매출')
                  }
                </span>
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                includeMoto ? 'text-purple-700 bg-purple-100' : 'text-amber-800 bg-amber-100'
              }`}>
                {includeMoto ? '레저·모토' : '순수 레저'}
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1 tabular-nums whitespace-nowrap truncate">
              {formatCurrency(totalLeisureSales)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-3 truncate">
              {includeMoto ? '레저본부 및 모토아레나 관할 영업장 실제 매출 합계' : '순수 레저본부 관할 영업장 실제 매출 합계 (모토 제외)'}
            </p>
          </div>
          <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>연계 분석 매장:</span>
            <strong className="text-purple-700 whitespace-nowrap">{leisureStoreAnalysis.length}개 매장</strong>
          </div>
        </div>

        {/* F&B Subtotal Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2 min-w-0">
                <Utensils className="w-5 h-5 text-amber-600 shrink-0" /> 
                <span className="truncate">{isActualRange ? '구간 식음팀 총매출' : '식음팀 총매출'}</span>
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                식음팀
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1 tabular-nums whitespace-nowrap truncate">
              {formatCurrency(totalFnbSales)} <span className="text-base text-slate-500 font-normal">원</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-3 truncate">식음(F&B) 영업장 실제 총매출 합계</p>
          </div>
          <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>연계 분석 매장:</span>
            <strong className="text-amber-700 whitespace-nowrap">{fnbStoreAnalysis.length}개 매장</strong>
          </div>
        </div>

        {/* Top Synergy Champion Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-200 flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2 min-w-0">
                <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" /> 
                <span className="truncate">최고 연계 시너지 매장</span>
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                Top 1
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mb-1 truncate" title={correlationData[0]?.shopName}>
              {correlationData[0]?.shopName || '분석 중'}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              상관도: <strong className="text-slate-900">+{correlationData[0]?.correlationCoefficient?.toFixed(3) || '0'}</strong> · 탄력성: <strong className="text-emerald-700">+{correlationData[0]?.elasticityPercent || 0}%</strong>
            </p>
          </div>
          <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>100만원당 낙수액:</span>
            <strong className="text-emerald-700 tabular-nums whitespace-nowrap">+₩ {formatCurrency(correlationData[0]?.spilloverPerMillion || 0)}원</strong>
          </div>
        </div>
      </div>

      {/* 💡 상관관계 지표 정의 및 분석 가이드 (Info Guide Banner) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 lg:p-7 shadow-xl mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <h3 className="font-bold text-base lg:text-lg flex items-center gap-2 text-indigo-300">
            <HelpCircle size={20} /> 💡 {currentAnchorObj.name} 기준 교차 시너지 지표 안내
          </h3>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
            {currentAnchorObj.desc}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              1. 동반 매출 상관도 (r)
            </div>
            <p className="leading-relaxed text-slate-300">
              <strong>{currentAnchorObj.name}</strong> 매출 변화와 타 영업장 매출 변화가 **얼마나 같은 방향으로 함께 뛰는지** 측정합니다. (-1.00 ~ +1.00)
            </p>
            <div className="pt-2 text-xs space-y-1 text-slate-400 border-t border-white/10">
              <div className="flex justify-between"><span className="text-purple-300 font-semibold">+0.70 이상</span> <span>🚀 초강력 앵커결합</span></div>
              <div className="flex justify-between"><span className="text-indigo-300 font-semibold">+0.40 ~ +0.70</span> <span>🔥 핵심 시너지</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-semibold">+0.40 미만</span> <span>🎯 일반/독립 연계</span></div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              2. 동반 매출 탄력성 (β)
            </div>
            <p className="leading-relaxed text-slate-300">
              <strong>{currentAnchorObj.name}</strong> 매출이 **10% 증가할 때**, 해당 영업장 매출은 **몇 % 동반 성장하는가?**
            </p>
            <div className="pt-2 text-xs space-y-1 text-slate-400 border-t border-white/10">
              <div><strong className="text-indigo-300">+7.0% 이상</strong>: 앵커 성장에 따른 즉각적 고탄력 동반 급증</div>
              <div><strong className="text-indigo-300">+3.0% ~ +7.0%</strong>: 안정적인 패키지/동선 연계 반응</div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              3. 100만원당 낙수 파급 효과
            </div>
            <p className="leading-relaxed text-slate-300">
              <strong>{currentAnchorObj.name}</strong>에 **100만원의 매출이 발생할 때마다**, 해당 영업장으로 얼마의 추가 부대매출이 동반 창출되는가?
            </p>
            <div className="pt-2 text-xs space-y-1 text-slate-400 border-t border-white/10">
              <div><strong className="text-emerald-300">낙수 금액</strong>: 추가 부대매출 창출액 (원 단위 실측)</div>
              <div><strong className="text-emerald-300">패키지 기획</strong>: 100만원당 낙수액이 높은 매장 우선 결합</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: 🎟️ 레저본부 영업장별 앵커 연계 시너지 분석 */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="text-purple-600" size={24} /> 🎟️ 레저/어트랙션 영업장별 {currentAnchorObj.name} 연계 시너지 분석
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {currentAnchorObj.name} 매출 발생 시 레저 영업장별 동반 매출 상관도 및 100만원당 낙수 효과입니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedLeisureShop('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedLeisureShop === 'ALL' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 레저 영업장 ({leisureStoreAnalysis.length})
            </button>
            {leisureStoreAnalysis.map((store, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedLeisureShop(store.shopName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedLeisureShop === store.shopName ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {store.shopName}
              </button>
            ))}
          </div>
        </div>

        {/* Store Contribution Cards Grid */}
        {filteredLeisureStores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredLeisureStores.map((store, idx) => (
              <SynergyStoreCard key={idx} store={store} type="leisure" anchorName={currentAnchorObj.name} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택된 분석 기간 내 레저 영업장 데이터가 없습니다.
          </div>
        )}

        {/* Leisure Correlation Table */}
        <SynergyTable 
          type="leisure" 
          correlationRows={leisureStoreAnalysis} 
          stores={filteredLeisureStores} 
        />
      </div>

      {/* Section 2: 🍽️ 식음팀 영업장별 앵커 연계 시너지 분석 */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="text-amber-600" size={24} /> 🍽️ 식음(F&B) 영업장별 {currentAnchorObj.name} 연계 시너지 분석
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {currentAnchorObj.name} 매출 발생 시 식음 영업장별 동반 매출 상관도 및 100만원당 낙수 효과입니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFnbShop('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFnbShop === 'ALL' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 식음 영업장 ({fnbStoreAnalysis.length})
            </button>
            {fnbStoreAnalysis.map((store, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFnbShop(store.shopName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedFnbShop === store.shopName ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {store.shopName}
              </button>
            ))}
          </div>
        </div>

        {/* F&B Store Cards Grid */}
        {filteredFnbStores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredFnbStores.map((store, idx) => (
              <SynergyStoreCard key={idx} store={store} type="fnb" anchorName={currentAnchorObj.name} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택된 분석 기간 내 식음 영업장 데이터가 없습니다.
          </div>
        )}

        {/* F&B Correlation Table */}
        <SynergyTable 
          type="fnb" 
          correlationRows={fnbStoreAnalysis} 
          stores={filteredFnbStores} 
        />
      </div>

      {/* Section 3: ⛳ 골프 & 부대시설 영업장별 앵커 연계 시너지 분석 */}
      {golfStoreAnalysis.length > 0 && (
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Flag className="text-emerald-600" size={24} /> ⛳ 골프 및 콘도 부대시설 {currentAnchorObj.name} 연계 시너지 분석
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {currentAnchorObj.name} 매출 발생 시 골프/콘도 부대영업장 동반 매출 상관도 및 낙수 효과입니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {golfStoreAnalysis.map((store, idx) => (
              <SynergyStoreCard key={idx} store={store} type="golf" anchorName={currentAnchorObj.name} />
            ))}
          </div>

          <SynergyTable 
            type="leisure" 
            correlationRows={golfStoreAnalysis} 
            stores={golfStoreAnalysis} 
          />
        </div>
      )}

    </div>
  );
}

