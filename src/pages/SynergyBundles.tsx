import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import { 
  CreditCard, Sparkles, Zap, Calendar, RefreshCw, ShieldCheck,
  Layers, Users, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

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

const cleanStoreName = (name: string) => {
  if (!name) return '';
  if (name === 'CRS') return '전화/예약실(CRS)';
  if (name === '홈페이지') return '자사몰(홈페이지)';
  return name;
};

const formatBundleTitle = (bundle: CustomerBundleItem) => {
  if (bundle.storeList && bundle.storeList.length === 1) {
    return `[${cleanStoreName(bundle.storeList[0])} 단독 이용]`;
  }
  if (bundle.storeList && bundle.storeList.length > 1) {
    return `[${bundle.storeList.map(cleanStoreName).join(' + ')}]`;
  }
  return bundle.bundleName.replace(/\bCRS\b/g, '전화/예약실(CRS)').replace(/\b홈페이지\b/g, '자사몰(홈페이지)');
};

export default function SynergyBundles() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();
  
  // Date Range State
  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate || globalStartDate);
  
  const [bundleData, setBundleData] = useState<CustomerBundleItem[]>([]);
  const [apiMeta, setApiMeta] = useState<{ totalUniqueCustomers?: number; multiFacilityRatioPct?: number; totalSales?: number; multiFacilityCustomers?: number; singleFacilityArpu?: number; multiFacilityArpu?: number; arpuLiftMultiplier?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('MULTI_ONLY');

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

  // Preset Handler
  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange);
  };

  const multiBundlesCount = useMemo(() => bundleData.filter(b => b.storeList && b.storeList.length >= 2).length, [bundleData]);
  const singleBundlesCount = useMemo(() => bundleData.filter(b => !b.storeList || b.storeList.length <= 1).length, [bundleData]);

  const filteredBundles = useMemo(() => {
    if (selectedFilter === 'MULTI_ONLY') {
      return bundleData.filter(b => b.storeList && b.storeList.length >= 2);
    }
    if (selectedFilter === 'SINGLE_ONLY') {
      return bundleData.filter(b => !b.storeList || b.storeList.length <= 1);
    }
    if (selectedFilter === 'ALL') {
      return bundleData;
    }
    return bundleData.filter(b => b.categoryType === selectedFilter);
  }, [bundleData, selectedFilter]);

  const kpiStats = useMemo(() => {
    const totalCustomers = apiMeta?.totalUniqueCustomers || 0;
    const totalSalesSum = apiMeta?.totalSales || 0;
    const multiFacilityRatio = apiMeta?.multiFacilityRatioPct !== undefined
      ? apiMeta.multiFacilityRatioPct.toFixed(1)
      : '0';

    const multiFacilityCustomers = apiMeta?.multiFacilityCustomers !== undefined
      ? apiMeta.multiFacilityCustomers
      : (totalCustomers > 0 ? Math.round(totalCustomers * (Number(multiFacilityRatio) / 100)) : 0);

    const topCountBundle = [...bundleData].sort((a, b) => b.customerCount - a.customerCount)[0];
    const topRevenueBundle = [...bundleData].sort((a, b) => b.totalSales - a.totalSales)[0];

    const singleFacilityArpu = apiMeta?.singleFacilityArpu || 0;
    const multiFacilityArpu = apiMeta?.multiFacilityArpu || 0;
    const arpuLiftMultiplier = apiMeta?.arpuLiftMultiplier || (singleFacilityArpu > 0 && multiFacilityArpu > 0 ? Number((multiFacilityArpu / singleFacilityArpu).toFixed(1)) : 1.0);

    return {
      totalCustomers,
      totalSalesSum,
      multiFacilityCustomers,
      multiFacilityRatio,
      topCountBundle,
      topRevenueBundle,
      singleFacilityArpu,
      multiFacilityArpu,
      arpuLiftMultiplier
    };
  }, [bundleData, apiMeta]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-400/20 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full border border-cyan-400/30 tracking-wide">
                고객 결제 동선 분석
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 font-medium">
                <ShieldCheck size={14} className="text-cyan-400" /> 실시간 통합 정산 기준
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <CreditCard className="text-cyan-400" size={32} />
              고객 결제 동선 기반 이용 묶음(Bundle) 분석
            </h1>
            <p className="text-cyan-100 mt-2 text-sm lg:text-base font-normal max-w-3xl leading-relaxed">
              동일 고객 결제 동선을 추적하여 고객별 동시 이용 영업장 묶음 패턴([숙박+골프+식음], [숙박+레저] 등)을 클러스터링 분석합니다.
            </p>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
              <NavLink 
                to="/synergy" 
                end
                className={({ isActive }) => 
                  `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-lg' 
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                  }`
                }
              >
                <Sparkles size={14} /> 1. 객실 세그먼트/채널 시너지 분석
              </NavLink>

              <NavLink 
                to="/synergy/correlation" 
                className={({ isActive }) => 
                  `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-indigo-500 text-white shadow-lg' 
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                  }`
                }
              >
                <Zap size={14} /> 2. 앵커시설 순수 인과 & CAPA 분석
              </NavLink>
              
              <NavLink 
                to="/synergy/bundles" 
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 bg-cyan-500 text-white shadow-lg ring-2 ring-cyan-400/30"
              >
                <CreditCard size={14} /> 3. 고객 결제 묶음(Bundle) 분석
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] p-4 lg:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">조회 기간 설정 및 묶음 동기화</h2>
              <p className="text-xs text-slate-400">선택한 기간 동안의 카드 승인 전표를 전수 취합하여 클러스터를 산출합니다.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsRangeMode(false);
                  setEndDate(startDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isRangeMode ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                단일 1일
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRangeMode(true);
                  if (!endDate) setEndDate(startDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isRangeMode ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                기간 조회
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button type="button" onClick={() => applyPreset('TODAY')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 font-medium transition-all">오늘</button>
              <button type="button" onClick={() => applyPreset('WEEK')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 font-medium transition-all">최근 7일</button>
              <button type="button" onClick={() => applyPreset('MTD')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 font-medium transition-all">당월</button>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium px-2 py-1 focus:outline-hidden"
              />
              {isRangeMode && (
                <>
                  <span className="text-slate-400 text-xs">~</span>
                  <input
                    type="date"
                    value={endDate || startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 font-medium px-2 py-1 focus:outline-hidden"
                  />
                </>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              조회
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Users size={16} className="text-cyan-600" /> 결제 추적 고객수
              </span>
              <span className="text-xs font-bold text-cyan-800 bg-cyan-100 px-2.5 py-0.5 rounded-full">
                {totalDays}일간 집계
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 tabular-nums">
              {kpiStats.totalCustomers.toLocaleString()} <span className="text-sm font-normal text-slate-500">명</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            동일 카드 번호로 1회 이상 결제한 순(Unique) 고객수
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Layers size={16} className="text-indigo-600" /> 다중 시설 교차 이용률
              </span>
              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                시너지 핵심
              </span>
            </div>
            <div className="text-3xl font-black text-indigo-600 my-1 tabular-nums">
              {kpiStats.multiFacilityRatio}% <span className="text-sm font-normal text-slate-500">({kpiStats.multiFacilityCustomers.toLocaleString()}명)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            2개 이상의 서로 다른 영업장에서 결제한 복합 소비 고객 비중
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-600" /> 최고 매출 묶음 (Top 1)
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                매출 1위
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 my-1 line-clamp-1" title={kpiStats.topRevenueBundle?.bundleName || 'N/A'}>
              {kpiStats.topRevenueBundle ? formatBundleTitle(kpiStats.topRevenueBundle) : '집계 중'}
            </div>
            <div className="text-xs font-bold text-amber-600 mt-1 tabular-nums">
              총 {formatCurrency(kpiStats.topRevenueBundle?.totalSales || 0)}원 ({kpiStats.topRevenueBundle?.customerCount || 0}명)
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            가장 높은 총매출을 발생시킨 최우수 고객 이용 동선 패턴
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <CreditCard size={16} className="text-emerald-600" /> 교차 소비 객단가 승수
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                객단가 상승폭
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-600 my-1 tabular-nums">
              {kpiStats.arpuLiftMultiplier ? `+${kpiStats.arpuLiftMultiplier}x` : '-'} <span className="text-sm font-normal text-slate-500">지출 증대</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 tabular-nums">
            단일 이용객(₩{formatCurrency(kpiStats.singleFacilityArpu)}) 대비 교차 고객(₩{formatCurrency(kpiStats.multiFacilityArpu)})
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-cyan-950 p-6 lg:p-8 rounded-[32px] text-white mb-8 shadow-lg">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HelpCircle size={20} className="text-cyan-400" />
            고객 결제 동선 묶음(Bundle Cluster)이란?
          </h2>
          <span className="text-xs font-semibold px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
            교차 동선 클러스터링 엔진
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="text-cyan-600" size={24} /> 🛍️ 고객 교차 이용 묶음(Bundle Cluster) 카드 현황
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              카드 결제 동선 기반으로 묶인 주요 고객 조합별 인원수, 매출액 및 1인당 평균 객단가입니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFilter('MULTI_ONLY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFilter === 'MULTI_ONLY' 
                  ? 'bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-400' 
                  : 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              🎯 다중 시설 교차 묶음 (2개 이상) ({multiBundlesCount}개)
            </button>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 조합 ({bundleData.length}개)
            </button>
            <button
              onClick={() => setSelectedFilter('SINGLE_ONLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'SINGLE_ONLY' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👤 단일 시설만 이용 ({singleBundlesCount}개)
            </button>
            <button
              onClick={() => setSelectedFilter('ROOM_INCLUDED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === 'ROOM_INCLUDED' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏨 숙박 포함 묶음
            </button>
          </div>
        </div>

        {filteredBundles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredBundles.map((bundle, idx) => {
              const isMulti = bundle.storeList && bundle.storeList.length >= 2;
              return (
                <div key={idx} className={`p-6 rounded-2xl border ${bundle.badgeColor || (isMulti ? 'border-cyan-200 bg-gradient-to-br from-cyan-50/40 to-white' : 'border-slate-200 bg-white')} transition-all shadow-sm hover:shadow-md`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/90 border border-slate-200 text-slate-700">
                      {isMulti ? `🎯 교차 묶음 #${idx + 1}` : `단일 이용 #${idx + 1}`}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-600 text-white">
                      {bundle.ratioPct}% ({bundle.customerCount.toLocaleString()}명)
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mb-3 line-clamp-1" title={formatBundleTitle(bundle)}>
                    {formatBundleTitle(bundle)}
                  </h3>

                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {bundle.storeList?.map((store, sIdx) => (
                      <span key={sIdx} className="text-[11px] font-medium bg-white/80 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                        {cleanStoreName(store)}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-xl">
                      <span className="text-slate-500 font-medium">묶음 총 발생 매출</span>
                      <span className="font-bold text-slate-900 text-sm tabular-nums">{formatCurrency(bundle.totalSales)}원</span>
                    </div>

                    <div className="flex justify-between items-center bg-cyan-50/80 p-2.5 rounded-xl text-cyan-950 border border-cyan-100">
                      <span className="font-semibold text-cyan-900">1인당 평균 결제액 (객단가)</span>
                      <span className="font-bold text-cyan-700 text-sm tabular-nums">{formatCurrency(bundle.avgSpendPerCustomer)}원/인</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl mb-8">
            선택한 조건에 해당하는 고객 이용 묶음 데이터가 없습니다.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">순위</th>
                <th className="py-3.5 px-6">고객 이용 묶음명</th>
                <th className="py-3.5 px-6">포함 영업장 리스트</th>
                <th className="py-3.5 px-6 text-right">이용 고객수 (명)</th>
                <th className="py-3.5 px-6 text-right">전체 비중 (%)</th>
                <th className="py-3.5 px-6 text-right">묶음 총 매출액 (원)</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">1인당 평균 결제액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBundles.length > 0 ? (
                filteredBundles.map((item, idx) => (
                  <tr key={idx} className="hover:bg-cyan-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-500 tabular-nums">#{idx + 1}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{formatBundleTitle(item)}</td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.storeList?.map((s, sIdx) => (
                          <span key={sIdx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                            {cleanStoreName(s)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-800 tabular-nums">{item.customerCount.toLocaleString()}명</td>
                    <td className="py-4 px-6 text-right font-semibold text-cyan-700 tabular-nums">{item.ratioPct}%</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(item.totalSales)}원</td>
                    <td className="py-4 px-6 text-right font-bold text-indigo-700 tabular-nums">{formatCurrency(item.avgSpendPerCustomer)}원/인</td>
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
