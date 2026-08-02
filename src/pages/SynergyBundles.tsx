import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  CreditCard, Sparkles, Activity, Calendar, RefreshCw, ShieldCheck,
  Layers, Users, ShoppingBag, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export interface CustomerBundleItem {
  bundleKey: string;
  bundleName: string;
  categoryType: 'ROOM_INCLUDED' | 'DAY_VISIT' | 'GOLF_INCLUDED' | 'FNB_ONLY';
  storeList: string[];
  customerCount: number;
  ratioPct: number;
  totalSales: number;
  avgSpendPerCustomer: number;
  badgeColor?: string;
}

export default function SynergyBundles() {
  const { startDate: globalStartDate, endDate: globalEndDate, setStartDate: setGlobalStartDate, setEndDate: setGlobalEndDate } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(globalStartDate || '2026-07-01');
  const [endDate, setEndDate] = useState<string>(globalEndDate || '2026-07-24');
  
  const [bundleData, setBundleData] = useState<CustomerBundleItem[]>([]);
  const [apiMeta, setApiMeta] = useState<{ totalUniqueCustomers?: number; multiFacilityRatioPct?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Days difference calculation
  const totalDays = useMemo(() => {
    if (!isRangeMode || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [startDate, endDate, isRangeMode]);

  // SSOT 위반 수정: 백엔드 API 에러 시 임의의 하드코딩된 가짜 데이터를 
  // 화면에 그리는 폴백 로직을 전면 제거하고 빈 배열로 초기화합니다.
  const defaultBundles: CustomerBundleItem[] = useMemo(() => [], []);

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
      
      const res = await secureFetcher(`${API_BASE}/api/v5/report/customer-journey-bundles?${queryParams}`).catch(() => null);
      const payload = res?.data ?? res;

      if (payload && (payload.totalUniqueCustomers !== undefined || (Array.isArray(payload.bundleClusters) && payload.bundleClusters.length > 0))) {
        if (payload.totalUniqueCustomers !== undefined) {
          setApiMeta({
            totalUniqueCustomers: payload.totalUniqueCustomers,
            multiFacilityRatioPct: payload.multiFacilityRatioPct
          });
        }
        if (Array.isArray(payload.bundleClusters) && payload.bundleClusters.length > 0) {
          setBundleData(payload.bundleClusters);
        } else if (Array.isArray(payload) && payload.length > 0) {
          setBundleData(payload);
        }
      } else if (Array.isArray(payload) && payload.length > 0) {
        setApiMeta(null);
        setBundleData(payload);
      } else {
        setApiMeta(null);
        setBundleData(defaultBundles);
      }
    } catch (err) {
      console.error('Customer Bundles API Error:', err);
      setApiMeta(null);
      setBundleData(defaultBundles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    setGlobalStartDate(s);
    setGlobalEndDate(isRangeMode ? e : null);
    fetchData(s, e, isRangeMode);
  };

  // Preset Handler
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

  // Filtered Bundles
  const filteredBundles = useMemo(() => {
    if (selectedFilter === 'ALL') return bundleData;
    return bundleData.filter(b => b.categoryType === selectedFilter);
  }, [bundleData, selectedFilter]);

  // Top KPIs
  const kpiStats = useMemo(() => {
    const calculatedCustomers = bundleData.reduce((acc, b) => acc + (b.customerCount || 0), 0);
    const totalCustomers = apiMeta?.totalUniqueCustomers ?? calculatedCustomers;
    const totalSalesSum = bundleData.reduce((acc, b) => acc + (b.totalSales || 0), 0);
    const multiFacilityCustomers = bundleData
      .filter(b => b.storeList && b.storeList.length >= 2)
      .reduce((acc, b) => acc + (b.customerCount || 0), 0);
    const multiFacilityRatio = apiMeta?.multiFacilityRatioPct !== undefined
      ? apiMeta.multiFacilityRatioPct.toFixed(1)
      : (totalCustomers > 0 ? ((multiFacilityCustomers / totalCustomers) * 100).toFixed(1) : '0');

    const topCountBundle = [...bundleData].sort((a, b) => b.customerCount - a.customerCount)[0];
    const topRevenueBundle = [...bundleData].sort((a, b) => b.totalSales - a.totalSales)[0];

    return {
      totalCustomers,
      totalSalesSum,
      multiFacilityCustomers,
      multiFacilityRatio,
      topCountBundle,
      topRevenueBundle
    };
  }, [bundleData, apiMeta]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header with Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-400/20 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-full border border-cyan-400/30 tracking-wide uppercase">
                CREDIT CARD JOURNEY CLUSTER
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <ShieldCheck size={12} className="text-cyan-400" /> 동일 결제수단 추적 엔진
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-medium tracking-tight mt-1 flex items-center gap-3">
              <CreditCard className="text-cyan-400" size={32} />
              신용카드 결제 추적 기반 고객 이용 묶음(Bundle) 동선 분석
            </h1>
            <p className="text-cyan-100 mt-2 text-sm lg:text-base font-normal max-w-3xl">
              동일 카드 결제 식별자(<code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-200">card_hash</code>) 및 회원 번호를 추적하여 고객별 동시 방문 영업장 묶음 패턴([숙박+골프+남도예담], [숙박+미디어아트] 등)을 클러스터링 분석합니다.
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
                <Sparkles size={14} /> 1. 콘도 세그먼트/채널 시너지
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
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
              <span className="text-xs font-medium text-cyan-300 flex items-center gap-1.5">
                <Calendar size={14} /> 카드 추적 분석 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    !isRangeMode ? 'bg-cyan-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    isRangeMode ? 'bg-cyan-500 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-cyan-200">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-cyan-200">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-cyan-200">금월 (1일~오늘)</button>
              <button onClick={() => applyPreset('H1')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] text-cyan-200">상반기 (1~6월)</button>
            </div>

            {/* Inputs & Apply Button */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
              {isRangeMode && (
                <>
                  <span className="text-slate-300 text-xs">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/40 border border-white/20 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </>
              )}

              <button 
                onClick={handleSearch}
                disabled={loading}
                className="ml-auto bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>

            <div className="text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>조회 기간: <strong>{startDate}</strong> {isRangeMode && endDate ? `~ ${endDate}` : ''}</span>
              <span className="text-cyan-300 font-semibold">{isRangeMode ? `총 ${totalDays}일간 카드 동선 추적` : '단일 1일 추적'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" /> 식별 카드 고객 총수
            </span>
            <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">
              TOTAL CUSTOMERS
            </span>
          </div>
          <div className="text-3xl font-medium text-slate-900 mb-1">
            {kpiStats.totalCustomers.toLocaleString()} <span className="text-lg text-slate-500 font-normal">명</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">동일 카드/회원번호로 추적된 고유 고객</p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> 다중 영업장 교차 이용률
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              CROSS-BUYING
            </span>
          </div>
          <div className="text-3xl font-medium text-indigo-600 mb-1">
            {kpiStats.multiFacilityRatio}% <span className="text-lg text-slate-500 font-normal">({kpiStats.multiFacilityCustomers.toLocaleString()}명)</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">2개 이상 영업장을 교차 이용한 고객 비중</p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" /> 최다 선택 묶음 패턴
            </span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              TOP POPULAR
            </span>
          </div>
          <div className="text-lg font-bold text-purple-900 truncate mb-1" title={kpiStats.topCountBundle?.bundleName}>
            {kpiStats.topCountBundle?.bundleName || '-'}
          </div>
          <p className="text-xs text-purple-600 font-semibold">
            {kpiStats.topCountBundle ? `${kpiStats.topCountBundle.customerCount.toLocaleString()}명 이용 (${kpiStats.topCountBundle.ratioPct}%)` : '-'}
          </p>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" /> 최고 매출 창출 묶음
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              TOP REVENUE
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mb-1">
            {formatCurrency(kpiStats.topRevenueBundle?.totalSales || 0)} <span className="text-sm text-slate-500 font-normal">원</span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate" title={kpiStats.topRevenueBundle?.bundleName}>
            {kpiStats.topRevenueBundle?.bundleName} (1인당 {formatCurrency(kpiStats.topRevenueBundle?.avgSpendPerCustomer || 0)}원)
          </p>
        </div>
      </div>

      {/* 💡 카드결제 추적 묶음 분석 가이드 (Info Banner) */}
      <div className="bg-slate-900 text-white rounded-[28px] p-6 lg:p-7 shadow-xl mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-cyan-300">
            <HelpCircle size={20} /> 💡 신용카드 추적 기반 고객 이용 묶음(Customer Bundle) 분석이란?
          </h3>
          <span className="text-xs font-semibold px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
            교차 동선 클러스터링 엔진
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              1. 동일 카드 결제 식별자 트래킹
            </div>
            <p className="leading-relaxed text-slate-300">
              POS 및 콘도 PMS 승인 이력의 암호화된 카드 토큰(<code className="text-cyan-200">card_hash</code>)을 기반으로, 동일 고객이 동일 일자 또는 투숙 체류 기간 동안 방문한 **영업장 조합**을 자동으로 묶어 분류합니다.
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              2. 묶음 패키지 마케팅 인사이트
            </div>
            <p className="leading-relaxed text-slate-300">
              예를 들어 **[숙박 + 골프 + 남도예담]** 이용 고객(평균 72만원 지출)과 **[숙박 + 썸머랜드 + 투썸]** 이용 고객(평균 21만원 지출)의 타겟층을 구분하여 **맞춤형 모바일 패키지 쿠폰 및 프런트 체크인 패키지**를 설계할 수 있습니다.
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              3. 비투숙 당일 고객과 투숙객 분리
            </div>
            <p className="leading-relaxed text-slate-300">
              숙박 없이 **[골프 + 삼겹살]** 또는 **[남도예담 + 카페]**만 이용하는 당일 일일(Day-use) 방문객 묶음을 별도 분류하여 리조트 2차 유입 마케팅 타겟으로 활용합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Section: Customer Bundle Clusters Grid & Table */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              <Layers className="text-cyan-600" size={24} /> 🛍️ 고객 교차 이용 묶음(Bundle Cluster) 카드 현황
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              카드 결제 동선 기반으로 묶인 주요 고객 조합별 인원수, 매출액 및 1인당 평균 객단가입니다.
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'ALL' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 묶음 ({bundleData.length}개)
            </button>
            <button
              onClick={() => setSelectedFilter('ROOM_INCLUDED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'ROOM_INCLUDED' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏨 숙박 포함 묶음
            </button>
            <button
              onClick={() => setSelectedFilter('GOLF_INCLUDED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'GOLF_INCLUDED' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⛳ 골프 연계 묶음
            </button>
            <button
              onClick={() => setSelectedFilter('DAY_VISIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'DAY_VISIT' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🚗 비투숙 당일 묶음
            </button>
            <button
              onClick={() => setSelectedFilter('FNB_ONLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'FNB_ONLY' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🍽️ 식음 전용 묶음
            </button>
          </div>
        </div>

        {/* Bundle Cards Grid */}
        {filteredBundles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredBundles.map((bundle, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border ${bundle.badgeColor || 'border-slate-200 bg-white'} transition-all shadow-sm hover:shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/90 border border-slate-200 text-slate-700">
                    묶음 #{idx + 1}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-600 text-white">
                    {bundle.ratioPct}% ({bundle.customerCount.toLocaleString()}명)
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-3 line-clamp-1" title={bundle.bundleName}>
                  {bundle.bundleName}
                </h3>

                {/* Included Stores Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {bundle.storeList?.map((store, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-medium bg-white/80 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      {store}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-xl">
                    <span className="text-slate-500 font-medium">묶음 총 발생 매출</span>
                    <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(bundle.totalSales)}원</span>
                  </div>

                  <div className="flex justify-between items-center bg-cyan-50/80 p-2.5 rounded-xl text-cyan-950 border border-cyan-100">
                    <span className="font-semibold text-cyan-900">1인당 평균 객단가 (Spend)</span>
                    <span className="font-extrabold text-cyan-700 text-sm">{formatCurrency(bundle.avgSpendPerCustomer)}원/인</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택한 조건에 해당하는 고객 이용 묶음 데이터가 없습니다.
          </div>
        )}

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">순위</th>
                <th className="py-3.5 px-6">이용 묶음 패턴명 (Bundle Name)</th>
                <th className="py-3.5 px-6">포함 영업장 리스트</th>
                <th className="py-3.5 px-6 text-right">이용 고객수 (명)</th>
                <th className="py-3.5 px-6 text-right">전체 비중 (%)</th>
                <th className="py-3.5 px-6 text-right">묶음 총 매출액 (원)</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">1인당 평균 객단가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBundles.length > 0 ? (
                filteredBundles.map((item, idx) => (
                  <tr key={idx} className="hover:bg-cyan-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{item.bundleName}</td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.storeList?.map((s, sIdx) => (
                          <span key={sIdx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800">{item.customerCount.toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-semibold text-cyan-700">{item.ratioPct}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(item.totalSales)}원</td>
                    <td className="py-4 px-6 text-right font-bold text-indigo-700">{formatCurrency(item.avgSpendPerCustomer)}원/인</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    조회된 데이터가 없습니다.
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
