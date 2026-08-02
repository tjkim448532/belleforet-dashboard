import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  Building2, TrendingUp, Sparkles, 
  Ticket, Utensils, Calendar, RefreshCw, ShieldCheck,
  Activity, Grid, HelpCircle, CreditCard
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

interface StoreCorrelationItem {
  divisionName?: string;
  shopName: string;
  storeName?: string;
  channelName?: string;
  segmentName?: string;
  correlatedSales: number;
  correlatedVisitors: number;
  correlatedGuests?: number;
  spilloverRate: number;
  forwardSpillover?: number;
  reverseSpillover?: number;
  correlationCoefficient?: number;
  liftValue?: number;
  interactionGrade?: string;
  revPasContribution?: number;
}

export default function SynergyCorrelation() {
  const { startDate: globalStartDate, endDate: globalEndDate, setStartDate: setGlobalStartDate, setEndDate: setGlobalEndDate } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(globalStartDate || '2026-07-01');
  const [endDate, setEndDate] = useState<string>(globalEndDate || '2026-07-24');
  
  const [correlationData, setCorrelationData] = useState<StoreCorrelationItem[]>([]);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLeisureShop, setSelectedLeisureShop] = useState<string>('ALL');
  const [selectedFnbShop, setSelectedFnbShop] = useState<string>('ALL');

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
    let sDate = overrideStart || startDate;
    let eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate);

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
      
      const corrQueryParams = `startDate=${sDate}&endDate=${rangeActive && eDate ? eDate : sDate}`;

      // 1. Fetch V5 Synergy Store Correlation API (API 8)
      const corrRes = await secureFetcher(`${API_BASE}/api/v5/report/synergy-store-correlation?${corrQueryParams}`).catch(() => null);
      const corrPayload = corrRes?.data ?? corrRes;

      // 2. Fetch V5 Matrix Weekly (SSOT store sales)
      const matrixRes = await secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => null);
      const matrixPayload = matrixRes?.data ?? matrixRes;

      // 3. Fetch V5 Channel Sales
      const chRes = await secureFetcher(`${API_BASE}/api/v5/report/room-sales-by-channel?${queryParams}`).catch(() => null);
      const chPayload = chRes?.data ?? chRes;

      const processCorrItem = (item: any): StoreCorrelationItem => {
        const shopName = item.shopName || item.storeName || item.shop_name || '';
        
        // SSOT 위반 수정: 백엔드에서 누락될 경우 프론트엔드가 임의로 65%나 78%를 할당하는 가짜 폴백 제거
        const spilloverRate = item.spilloverRate !== undefined 
          ? (item.spilloverRate <= 1 ? Math.round(item.spilloverRate * 100) : Math.round(item.spilloverRate)) 
          : 0;

        const forwardSpillover = item.forwardSpillover !== undefined 
          ? (item.forwardSpillover <= 1 ? Number((item.forwardSpillover * 100).toFixed(1)) : Number(item.forwardSpillover.toFixed(1)))
          : 0;

        const reverseSpillover = item.reverseSpillover !== undefined 
          ? (item.reverseSpillover <= 1 ? Number((item.reverseSpillover * 100).toFixed(1)) : Number(item.reverseSpillover.toFixed(1)))
          : undefined;
          
        const correlationCoefficient = item.correlationCoefficient !== undefined ? Number(Number(item.correlationCoefficient).toFixed(2)) : undefined;
        const liftValue = item.liftValue !== undefined ? Number(Number(item.liftValue).toFixed(2)) : undefined;
        
        // SSOT 위반 수정: 상관계수를 기반으로 한 등급 추정 로직(HIGH_SYNERGY 등)을 제거하고 백엔드 응답만 신뢰
        const interactionGrade = item.interactionGrade;
        
        const revPasContribution = item.revPasContribution !== undefined ? Number(item.revPasContribution) : undefined;

        return {
          ...item,
          divisionName: item.divisionName || (item.storeName === '모토아레나' ? '모토아레나' : '기타'),
          shopName,
          storeName: shopName,
          correlatedSales: item.correlatedSales || 0,
          correlatedVisitors: item.correlatedVisitors || item.correlatedGuests || 0,
          spilloverRate,
          forwardSpillover,
          reverseSpillover,
          correlationCoefficient,
          liftValue,
          interactionGrade,
          revPasContribution,
        };
      };

      let corrList: StoreCorrelationItem[] = [];
      if (Array.isArray(corrPayload)) {
        corrList = corrPayload.map(item => processCorrItem(item));
      } else if (corrPayload && typeof corrPayload === 'object') {
        const ticketList = (Array.isArray(corrPayload.ticket) ? corrPayload.ticket : []).map((item: any) => processCorrItem(item));
        const fnbList = (Array.isArray(corrPayload.fnb) ? corrPayload.fnb : []).map((item: any) => processCorrItem(item));
        corrList = [...ticketList, ...fnbList];
      }
      setCorrelationData(corrList);

      if (Array.isArray(matrixPayload)) {
        setMatrixData(matrixPayload);
      }

      if (Array.isArray(chPayload)) {
        setChannelData(chPayload);
      }
    } catch (err) {
      console.error('Synergy Correlation API Error:', err);
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

  // Determine if query is an actual multi-day date range (startDate !== endDate)
  const isActualRange = useMemo(() => {
    return isRangeMode && !!endDate && startDate !== endDate;
  }, [isRangeMode, startDate, endDate]);

  // Real Total Rooms Sold in Period
  const totalRoomsSold = useMemo(() => {
    const gt = channelData.find(item => item.isGrandTotal || item.channelName === '전체 합계');
    if (gt) {
      return isActualRange ? (gt.mtdRooms || 0) : (gt.todayRooms || 0);
    }
    return 0;
  }, [channelData, isActualRange]);

  // Pure Dynamic SSOT Extraction for Leisure & Moto Stores from V5 Matrix Data
  const leisureStoreAnalysis = useMemo(() => {
    const leisureRows = matrixData.filter(r => 
      (r.categoryCode === 'TICKET' || r.categoryCode === 'MOTO') && 
      !r.isSubtotal && 
      !r.isGrandTotal && 
      r.shopName && 
      r.shopName !== '소계' && 
      !r.shopName.includes('미사용 티켓') &&
      Number(r.todayActual || r.ytdActual || 0) > 0
    );

    const map = new Map<string, { 
      totalSales: number; 
      correlatedSales: number; 
      correlatedVisitors: number; 
      spilloverRate: number; 
      revPasContribution: number;
      correlationCoefficient?: number;
      liftValue?: number;
      interactionGrade?: string;
      forwardSpillover?: number;
      reverseSpillover?: number;
    }>();

    leisureRows.forEach(r => {
      const shop = r.shopName.trim();
      const sales = Number(r.todayActual || r.ytdActual || 0);
      
      const matchedCorr = correlationData.find(c => {
        const cName = (c.shopName || c.storeName || '').trim();
        return cName === shop || shop.includes(cName) || cName.includes(shop);
      });
      const realSpillover = matchedCorr && matchedCorr.spilloverRate !== undefined ? matchedCorr.spilloverRate : 0;

      const curr = map.get(shop) || { 
        totalSales: 0, 
        correlatedSales: 0, 
        correlatedVisitors: 0, 
        spilloverRate: realSpillover, 
        revPasContribution: matchedCorr?.revPasContribution || 0,
        correlationCoefficient: matchedCorr?.correlationCoefficient,
        liftValue: matchedCorr?.liftValue,
        interactionGrade: matchedCorr?.interactionGrade,
        forwardSpillover: matchedCorr?.forwardSpillover,
        reverseSpillover: matchedCorr?.reverseSpillover,
      };
      
      curr.totalSales += sales;
      
      // SSOT 위반 수정: 프론트엔드에서 매출 * 비율로 직접 재계산하거나 18000원 하드코딩으로 객수 추정하지 않음. 
      // 백엔드가 제공한 값을 100% 그대로 사용
      curr.correlatedSales = matchedCorr?.correlatedSales || 0;
      curr.correlatedVisitors = matchedCorr?.correlatedVisitors || 0;
      curr.spilloverRate = realSpillover;
      curr.revPasContribution = matchedCorr?.revPasContribution || 0;
      
      map.set(shop, curr);
    });

    return Array.from(map.entries()).map(([shopName, val]) => ({
      shopName,
      ...val,
      color: 'border-purple-200 bg-purple-50/40 text-purple-900'
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [matrixData, totalRoomsSold, correlationData]);

  // Pure Dynamic SSOT Extraction for F&B Stores from V5 Matrix Data
  const fnbStoreAnalysis = useMemo(() => {
    const fnbRows = matrixData.filter(r => 
      r.categoryCode === 'FNB' && 
      !r.isSubtotal && 
      !r.isGrandTotal && 
      r.shopName && 
      r.shopName !== '소계' &&
      Number(r.todayActual || r.ytdActual || 0) > 0
    );

    const map = new Map<string, { 
      totalSales: number; 
      correlatedSales: number; 
      correlatedGuests: number; 
      spilloverRate: number; 
      revPasContribution: number;
      correlationCoefficient?: number;
      liftValue?: number;
      interactionGrade?: string;
      forwardSpillover?: number;
      reverseSpillover?: number;
    }>();

    fnbRows.forEach(r => {
      const shop = r.shopName.trim();
      const sales = Number(r.todayActual || r.ytdActual || 0);
      
      const matchedCorr = correlationData.find(c => {
        const cName = (c.shopName || c.storeName || '').trim();
        return cName === shop || shop.includes(cName) || cName.includes(shop);
      });
      const realSpillover = matchedCorr && matchedCorr.spilloverRate !== undefined ? matchedCorr.spilloverRate : 0;

      const curr = map.get(shop) || { 
        totalSales: 0, 
        correlatedSales: 0, 
        correlatedGuests: 0, 
        spilloverRate: realSpillover, 
        revPasContribution: matchedCorr?.revPasContribution || 0,
        correlationCoefficient: matchedCorr?.correlationCoefficient,
        liftValue: matchedCorr?.liftValue,
        interactionGrade: matchedCorr?.interactionGrade,
        forwardSpillover: matchedCorr?.forwardSpillover,
        reverseSpillover: matchedCorr?.reverseSpillover,
      };
      curr.totalSales += sales;
      // SSOT 위반 수정: 백엔드가 제공한 값만 사용
      curr.correlatedSales = matchedCorr?.correlatedSales || 0;
      curr.correlatedGuests = matchedCorr?.correlatedVisitors || 0;
      curr.spilloverRate = realSpillover;
      curr.revPasContribution = matchedCorr?.revPasContribution || 0;
      map.set(shop, curr);
    });

    return Array.from(map.entries()).map(([shopName, val]) => ({
      shopName,
      ...val,
      color: 'border-amber-200 bg-amber-50/40 text-amber-900'
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [matrixData, totalRoomsSold, correlationData]);

  // Overall Division Summary KPIs (100% Total Revenue directly as requested)
  const totalLeisureSales = useMemo(() => {
    return leisureStoreAnalysis.reduce((acc, cur) => acc + cur.totalSales, 0);
  }, [leisureStoreAnalysis]);

  const totalLeisureRevPas = useMemo(() => {
    return leisureStoreAnalysis.reduce((acc, cur) => acc + (cur.revPasContribution || 0), 0);
  }, [leisureStoreAnalysis]);

  const totalFnbSales = useMemo(() => {
    return fnbStoreAnalysis.reduce((acc, cur) => acc + cur.totalSales, 0);
  }, [fnbStoreAnalysis]);

  const totalFnbRevPas = useMemo(() => {
    return fnbStoreAnalysis.reduce((acc, cur) => acc + (cur.revPasContribution || 0), 0);
  }, [fnbStoreAnalysis]);


  const leisureCorrelationRows = useMemo(() => {
    if (correlationData.length > 0) {
      const rows = correlationData.filter(r => r.divisionName === '레저본부' || r.divisionName === '모토아레나');
      if (selectedLeisureShop === 'ALL') return rows;
      return rows.filter(r => r.shopName === selectedLeisureShop);
    }
    return [];
  }, [correlationData, selectedLeisureShop]);


  const fnbCorrelationRows = useMemo(() => {
    if (correlationData.length > 0) {
      const rows = correlationData.filter(r => r.divisionName === '식음팀');
      if (selectedFnbShop === 'ALL') return rows;
      return rows.filter(r => r.shopName === selectedFnbShop);
    }
    return [];
  }, [correlationData, selectedFnbShop]);

  // Filtered Leisure Items for Cards
  const filteredLeisureStores = useMemo(() => {
    if (selectedLeisureShop === 'ALL') return leisureStoreAnalysis;
    return leisureStoreAnalysis.filter(s => s.shopName === selectedLeisureShop);
  }, [leisureStoreAnalysis, selectedLeisureShop]);

  // Filtered FNB Items for Cards
  const filteredFnbStores = useMemo(() => {
    if (selectedFnbShop === 'ALL') return fnbStoreAnalysis;
    return fnbStoreAnalysis.filter(s => s.shopName === selectedFnbShop);
  }, [fnbStoreAnalysis, selectedFnbShop]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-400/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 tracking-wide uppercase">
                BELLE FORET CORRELATION ENGINE
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <ShieldCheck size={12} className="text-indigo-400" /> V5 SSOT Engine
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-medium tracking-tight mt-1 flex items-center gap-3">
              <Grid className="text-indigo-400" size={32} />
              영업장별 연계 상관관계 분석 대시보드
            </h1>
            <p className="text-indigo-100 mt-2 text-sm lg:text-base font-normal max-w-2xl">
              숙박 채널별(전화/메신저, OTA, 기업영업 등) 이용 고객이 레저본부 및 식음팀 내 세부 영업장으로 연결되는 교차 파급 상관관계를 분석합니다. (100% API SSOT 렌더링)
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
                <Sparkles size={14} /> 1. 콘도 세그먼트/채널 시너지 대시보드
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30"
              >
                <Activity size={14} /> 2. 영업장별 연계 상관관계 분석
              </NavLink>

              <NavLink 
                to="/synergy/bundles" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-cyan-500 text-white shadow-md ring-2 ring-cyan-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CreditCard size={14} /> 3. 💳 카드결제 추적 고객 묶음(Bundle) 분석 [NEW]
              </NavLink>
            </div>
          </div>

          {/* Period Range Selection Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-3 min-w-[420px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-medium text-indigo-300 flex items-center gap-1.5">
                <Calendar size={14} /> 분석 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    !isRangeMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    isRangeMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-indigo-200">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-indigo-200">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-indigo-200">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-indigo-200">상반기 (1~6월)</button>
            </div>

            {/* Inputs & Apply Button */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
              {isRangeMode && (
                <>
                  <span className="text-slate-300 text-xs">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </>
              )}

              <button 
                onClick={handleSearch}
                disabled={loading}
                className="ml-auto bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>

            <div className="text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>조회 기간: <strong>{startDate}</strong> {isRangeMode && endDate ? `~ ${endDate}` : ''}</span>
              <span className="text-indigo-300 font-semibold">{isRangeMode ? `총 ${totalDays}일간 상관관계` : '단일 1일 상관관계'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600" /> 레저본부 & 모토아레나 전체 매출
              </span>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                LEISURE & MOTO
              </span>
            </div>
            <div className="text-3xl font-medium text-slate-900 mb-1">
              {formatCurrency(totalLeisureSales)} <span className="text-lg text-slate-500 font-normal">원</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-3">레저본부 및 모토아레나 관할 영업장 100% 원천 매출 합계</p>
          </div>
          
          {/* Calculated Store List Badge */}
          <div className="mt-2 pt-2.5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-purple-700 block mb-1">
              📊 계산 포함 영업장 (총 {leisureStoreAnalysis.length}개):
            </span>
            <p className="text-[11px] text-purple-900/80 bg-purple-50/80 border border-purple-100/80 p-2 rounded-xl leading-relaxed max-h-20 overflow-y-auto">
              {leisureStoreAnalysis.map(s => s.shopName).join(', ') || '영업장 데이터 로딩 중...'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-600" /> 식음팀 전체 매출
              </span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                F&B REVENUE
              </span>
            </div>
            <div className="text-3xl font-medium text-slate-900 mb-1">
              {formatCurrency(totalFnbSales)} <span className="text-lg text-slate-500 font-normal">원</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-3">F&B 식음 영업장 100% 원천 매출 합계</p>
          </div>

          {/* Calculated Store List Badge */}
          <div className="mt-2 pt-2.5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-amber-700 block mb-1">
              📊 계산 포함 영업장 (총 {fnbStoreAnalysis.length}개):
            </span>
            <p className="text-[11px] text-amber-900/80 bg-amber-50/80 border border-amber-100/80 p-2 rounded-xl leading-relaxed max-h-20 overflow-y-auto">
              {fnbStoreAnalysis.map(s => s.shopName).join(', ') || '영업장 데이터 로딩 중...'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" /> 1실당 레저 & 모토 파급가치
              </span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                LEISURE RevPAS
              </span>
            </div>
            <div className="text-3xl font-medium text-indigo-600 mb-1">
              {formatCurrency(totalLeisureRevPas)} <span className="text-lg text-slate-500 font-normal">원/실</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">객실 1실 추가 판매 시 레저+모토아레나 예상 증가 매출 (통계적 회귀 기울기 합산)</p>
          </div>
          <div className="mt-2 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
            수식: ∑(각 영업장별 revPasContribution)
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" /> 1실당 식음 파급가치
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                F&B RevPAS
              </span>
            </div>
            <div className="text-3xl font-medium text-emerald-600 mb-1">
              {formatCurrency(totalFnbRevPas)} <span className="text-lg text-slate-500 font-normal">원/실</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">객실 1실 추가 판매 시 식음팀 예상 증가 매출 (통계적 회귀 기울기 합산)</p>
          </div>
          <div className="mt-2 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
            수식: ∑(각 영업장별 revPasContribution)
          </div>
        </div>
      </div>


      {/* 💡 상관관계 지표 정의 및 분석 가이드 (Info Guide Banner) */}
      <div className="bg-slate-900 text-white rounded-[28px] p-6 lg:p-7 shadow-xl mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-300">
            <HelpCircle size={20} /> 💡 객실-영업장 상관관계 및 시너지 분석 지표 가이드
          </h3>
          <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
            통계 분석 표준 명세 (V5 SSOT)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              1. 시계열 피어슨 상관계수 (r)
            </div>
            <p className="leading-relaxed text-slate-300">
              객실 투숙객 변화($X$)와 영업장 매출 변화($Y$)가 **얼마나 동반 상승/하강하는지** 변동성을 측정하는 지표입니다. ($-1.00 \sim +1.00$)
            </p>
            <div className="pt-2 text-[11px] space-y-1 text-slate-400 border-t border-white/10">
              <div className="flex justify-between"><span className="text-purple-300 font-semibold">r ≥ +0.70</span> <span>강력한 시너지 (동반 급증)</span></div>
              <div className="flex justify-between"><span className="text-indigo-300 font-semibold">+0.30 ≤ r &lt; +0.70</span> <span>중립적 시너지</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-semibold">r &lt; +0.30</span> <span>독립 영업장 (투숙 무관)</span></div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              2. 향상도 지수 (Lift Value, 배수)
            </div>
            <p className="leading-relaxed text-slate-300">
              일반 방문객 대비 **객실 투숙객이 해당 영업장을 추가 선택할 확률적 시너지 배수**입니다.
            </p>
            <div className="pt-2 text-[11px] space-y-1 text-slate-400 border-t border-white/10">
              <div><strong className="text-emerald-300">Lift &gt; 1.0배</strong>: 투숙객 이용 확률이 비투숙객보다 높음</div>
              <div><strong className="text-emerald-300">예: Lift 2.35x</strong>: 투숙객이 해당 영업장을 이용할 확률이 <span className="text-white font-semibold">2.35배 높음</span></div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              3. 양방향 파급률 (Spillover Rate, %)
            </div>
            <p className="leading-relaxed text-slate-300">
              객실과 영업장 간의 **상호 유입 비율**을 양방향으로 정밀 측정합니다.
            </p>
            <div className="pt-2 text-[11px] space-y-1 text-slate-400 border-t border-white/10">
              <div><strong className="text-amber-300">순방향 (Forward)</strong>: 전체 객실 투숙객 중 영업장으로 유입된 비중(%)</div>
              <div><strong className="text-amber-300">역방향 (Reverse)</strong>: 영업장 이용객 중 객실 투숙으로 이어진 비율(%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: 🎟️ 레저본부 영업장별 연계 상관관계 분석 */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              <Ticket className="text-purple-600" size={24} /> 🎟️ 레저본부 영업장별 객실 연계 상관관계 분석 (SSOT 동적 렌더링)
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              V5 API 원천 데이터 기준 실시간 매출 발생 레저 영업장별 투숙객 연계 지출액 및 파급률입니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedLeisureShop('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedLeisureShop === 'ALL' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 레저 영업장
            </button>
            {leisureStoreAnalysis.map((store, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedLeisureShop(store.shopName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
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
              <div key={idx} className={`p-5 rounded-2xl border ${store.color} transition-all shadow-sm hover:shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Ticket size={18} /> {store.shopName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {store.interactionGrade && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs ${
                        store.interactionGrade === 'HIGH_SYNERGY' ? 'bg-purple-600 text-white' :
                        store.interactionGrade === 'MODERATE_SYNERGY' ? 'bg-indigo-500 text-white' : 'bg-slate-500 text-white'
                      }`}>
                        {store.interactionGrade === 'HIGH_SYNERGY' ? '강력 시너지' :
                         store.interactionGrade === 'MODERATE_SYNERGY' ? '중립 시너지' : '독립 영업장'}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/80 border border-slate-200">
                      숙박객 비율 {store.spilloverRate}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {store.correlationCoefficient !== undefined && (
                    <div className="flex justify-between items-center p-2 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900">
                      <span className="font-semibold">시계열 상관계수 (r)</span>
                      <span className="font-extrabold text-purple-700">
                        {store.correlationCoefficient >= 0 ? `+${store.correlationCoefficient}` : store.correlationCoefficient}
                        {store.liftValue !== undefined && <span className="ml-1 text-slate-500 font-normal"> (Lift <strong>{store.liftValue}x</strong>)</span>}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-xl">
                    <span className="text-slate-500 font-medium">영업장 총 매출</span>
                    <span className="font-bold text-slate-800">{formatCurrency(store.totalSales)}원</span>
                  </div>

                  <div className="flex justify-between items-center bg-purple-100/70 p-2 rounded-xl">
                    <div>
                      <span className="text-purple-800 font-semibold block">객실 연계 파급매출</span>
                      {store.reverseSpillover !== undefined && (
                        <span className="text-[10px] text-purple-600 font-medium">
                          이용객 중 숙박객 {store.forwardSpillover ?? store.spilloverRate}% | 전체 숙박객의 이용률 {store.reverseSpillover}%
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-purple-900">{formatCurrency(store.correlatedSales)}원</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-slate-600">
                    <span>추정 연계 이용객수: <strong>{(store.correlatedVisitors || 0).toLocaleString()}명</strong></span>
                    <span className="text-indigo-700 font-semibold">1실당 기여액: +{formatCurrency(store.revPasContribution || 0)}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택된 분석 기간 내 매출이 발생한 레저 영업장 데이터가 없습니다.
          </div>
        )}

        {/* Leisure Correlation Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">레저 영업장</th>
                <th className="py-3.5 px-6">유입 채널 / 세그먼트</th>
                <th className="py-3.5 px-6 text-right">연계 이용객수</th>
                <th className="py-3.5 px-6 text-right">객실 연계 파급 매출</th>
                <th className="py-3.5 px-6 text-right">숙박객 연계 비율</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">1실당 RevPAS 기여액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leisureCorrelationRows.length > 0 ? (
                leisureCorrelationRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-medium">
                        {item.shopName}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">
                      {item.channelName} <span className="text-xs text-slate-400 font-normal">({item.segmentName})</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800">{(item.correlatedVisitors || item.correlatedGuests || 0).toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-bold text-purple-700">{formatCurrency(item.correlatedSales)}원</td>
                    <td className="py-4 px-6 text-right font-semibold text-indigo-600">{item.spilloverRate}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">+{formatCurrency(item.revPasContribution || 0)}원/실</td>
                  </tr>
                ))
              ) : (
                filteredLeisureStores.map((item, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-medium">
                        {item.shopName}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      V5 원천 영업장 (SSOT 연동)
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800">{(item.correlatedVisitors || 0).toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-bold text-purple-700">{formatCurrency(item.correlatedSales)}원</td>
                    <td className="py-4 px-6 text-right font-semibold text-indigo-600">{item.spilloverRate}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">+{formatCurrency(item.revPasContribution || 0)}원/실</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: 🍽️ 식음팀 영업장별 연계 상관관계 분석 */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              <Utensils className="text-amber-600" size={24} /> 🍽️ 식음팀 영업장별 객실 연계 상관관계 분석 (SSOT 동적 렌더링)
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              V5 API 원천 데이터 기준 실시간 매출 발생 식음 영업장별 투숙객 연계 지출액 및 파급률입니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFnbShop('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFnbShop === 'ALL' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 식음 영업장
            </button>
            {fnbStoreAnalysis.map((store, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFnbShop(store.shopName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
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
              <div key={idx} className={`p-5 rounded-2xl border ${store.color} transition-all shadow-sm hover:shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Utensils size={18} /> {store.shopName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {store.interactionGrade && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs ${
                        store.interactionGrade === 'HIGH_SYNERGY' ? 'bg-amber-600 text-white' :
                        store.interactionGrade === 'MODERATE_SYNERGY' ? 'bg-indigo-500 text-white' : 'bg-slate-500 text-white'
                      }`}>
                        {store.interactionGrade === 'HIGH_SYNERGY' ? '강력 시너지' :
                         store.interactionGrade === 'MODERATE_SYNERGY' ? '중립 시너지' : '독립 영업장'}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/80 border border-slate-200">
                      숙박객 비율 {store.spilloverRate}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {store.correlationCoefficient !== undefined && (
                    <div className="flex justify-between items-center p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900">
                      <span className="font-semibold">시계열 상관계수 (r)</span>
                      <span className="font-extrabold text-amber-800">
                        {store.correlationCoefficient >= 0 ? `+${store.correlationCoefficient}` : store.correlationCoefficient}
                        {store.liftValue !== undefined && <span className="ml-1 text-slate-500 font-normal"> (Lift <strong>{store.liftValue}x</strong>)</span>}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-xl">
                    <span className="text-slate-500 font-medium">영업장 총 매출</span>
                    <span className="font-bold text-slate-800">{formatCurrency(store.totalSales)}원</span>
                  </div>

                  <div className="flex justify-between items-center bg-amber-100/70 p-2 rounded-xl">
                    <div>
                      <span className="text-amber-800 font-semibold block">객실 연계 파급매출</span>
                      {store.reverseSpillover !== undefined && (
                        <span className="text-[10px] text-amber-700 font-medium">
                          이용객 중 숙박객 {store.forwardSpillover ?? store.spilloverRate}% | 전체 숙박객의 이용률 {store.reverseSpillover}%
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-amber-900">{formatCurrency(store.correlatedSales)}원</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-slate-600">
                    <span>추정 연계 고객수: <strong>{(store.correlatedGuests || 0).toLocaleString()}명</strong></span>
                    <span className="text-emerald-700 font-semibold">1실당 기여액: +{formatCurrency(store.revPasContribution || 0)}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택된 분석 기간 내 매출이 발생한 식음 영업장 데이터가 없습니다.
          </div>
        )}

        {/* FNB Correlation Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">식음 영업장</th>
                <th className="py-3.5 px-6">유입 채널 / 세그먼트</th>
                <th className="py-3.5 px-6 text-right">연계 이용객수</th>
                <th className="py-3.5 px-6 text-right">객실 연계 파급 매출</th>
                <th className="py-3.5 px-6 text-right">숙박객 연계 비율</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">1실당 RevPAS 기여액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fnbCorrelationRows.length > 0 ? (
                fnbCorrelationRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-medium">
                        {item.shopName}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">
                      {item.channelName} <span className="text-xs text-slate-400 font-normal">({item.segmentName})</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800">{(item.correlatedGuests || item.correlatedVisitors || 0).toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-bold text-amber-700">{formatCurrency(item.correlatedSales)}원</td>
                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">{item.spilloverRate}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">+{formatCurrency(item.revPasContribution || 0)}원/실</td>
                  </tr>
                ))
              ) : (
                filteredFnbStores.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-medium">
                        {item.shopName}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      V5 원천 영업장 (SSOT 연동)
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800">{(item.correlatedGuests || 0).toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-bold text-amber-700">{formatCurrency(item.correlatedSales)}원</td>
                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">{item.spilloverRate}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">+{formatCurrency(item.revPasContribution || 0)}원/실</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
