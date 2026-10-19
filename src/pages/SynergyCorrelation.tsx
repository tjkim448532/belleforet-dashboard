import { useState, useMemo, useEffect, useRef } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, getClosedBusinessDate, formatDate, type DatePresetType } from '../lib/dateUtils';
import { useMapping } from '../contexts/MappingContext';
import { secureFetcher } from '../lib/secureFetcher';
import SynergyNav from '../components/dashboard/SynergyNav';
import type { SynergyStoreCorrelationV2Response } from '../types/reports-v2';
import { 
  TrendingUp, Calendar, RefreshCw, Grid, Zap,
  Sparkles, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function SynergyCorrelation() {
  const { getCategoryForStore, categories: hqCategories } = useMapping();
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();
  
  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate || globalStartDate);
  const [sortBy, setSortBy] = useState<'elasticity' | 'totalSales'>('elasticity');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<SynergyStoreCorrelationV2Response | null>(null);

  const isInitialMount = useRef<boolean>(true);
  const [autoSwitchedNotice, setAutoSwitchedNotice] = useState<string | null>(null);

  const isSingleDay = !isRangeMode || !endDate || startDate === endDate;

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean, overrideSortBy?: 'elasticity' | 'totalSales') => {
    let sDate = overrideStart || startDate;
    let eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    const rangeActive = overrideIsRange !== undefined ? overrideIsRange : (isRangeMode && !!eDate && sDate !== eDate);
    const activeSortBy = overrideSortBy || sortBy;

    if (rangeActive && sDate && eDate && sDate > eDate) {
      const temp = sDate;
      sDate = eDate;
      eDate = temp;
      setStartDate(sDate);
      setEndDate(eDate);
    }

    setLoading(true);
    setError(null);

    try {
      const queryDateParams = (rangeActive && eDate) 
        ? `startDate=${sDate}&endDate=${eDate}`
        : `startDate=${sDate}&endDate=${sDate}`; 

      const res = await secureFetcher(`${API_BASE}/api/v6/report/synergy-store-correlation-v2?${queryDateParams}&sortBy=${activeSortBy}`);
      
      if (res && res.success) {
        setData(res as SynergyStoreCorrelationV2Response);
      } else {
        throw new Error('API request failed or returned success: false');
      }
    } catch (err: any) {
      console.error('Synergy Correlation API Error:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 만약 전역 설정이 단일 일자(1일)인 경우, 시계열 통계 유효성(N >= 7)을 위해
      // 금월 누적(MTD) 또는 최근 30일로 자동 전환하여 빈 수치/NONE 화면 방지
      const isSingleDayInitial = !globalIsRange || !globalEndDate || globalStartDate === globalEndDate;
      if (isSingleDayInitial) {
        const yesterday = getClosedBusinessDate(1);
        const dayOfMonth = yesterday.getDate();
        let targetStart: string;
        let targetEnd = formatDate(yesterday);
        let noticeText: string;

        if (dayOfMonth >= 7) {
          const mtd = getPresetDateRange('MTD');
          targetStart = mtd.startDate;
          targetEnd = mtd.endDate || targetEnd;
          noticeText = `💡 매장 시너지 상관분석은 시계열 상관관계 분석이므로, [금월 누적(${targetStart} ~ ${targetEnd})]으로 자동 설정되었습니다. (통계 표본 N=${dayOfMonth}일)`;
        } else {
          const thirtyDaysAgo = new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000);
          targetStart = formatDate(thirtyDaysAgo);
          noticeText = `💡 매장 시너지 상관분석을 위해 분석 기간이 [최근 30일(${targetStart} ~ ${targetEnd})]으로 자동 설정되었습니다. (통계 표본 N=30일)`;
        }

        setIsRangeMode(true);
        setStartDate(targetStart);
        setEndDate(targetEnd);
        setAutoSwitchedNotice(noticeText);
        fetchData(targetStart, targetEnd, true);
        return;
      }
    }

    setIsRangeMode(globalIsRange);
    setStartDate(globalStartDate);
    setEndDate(globalEndDate || globalStartDate);
    fetchData(globalStartDate, globalEndDate || globalStartDate, globalIsRange);
  }, [globalStartDate, globalEndDate, globalIsRange]);

  const categories = useMemo(() => {
    return ['ALL', ...hqCategories];
  }, [hqCategories]);

  const filteredStores = useMemo(() => {
    if (!data?.stores) return [];
    if (selectedCategory === 'ALL') return data.stores;
    return data.stores.filter(s => getCategoryForStore(s.storeName) === selectedCategory);
  }, [data, selectedCategory, getCategoryForStore]);

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

  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange);
  };

  const applyRecent30Days = () => {
    const yesterday = getClosedBusinessDate(1);
    const endStr = formatDate(yesterday);
    const startStr = formatDate(new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000));
    setIsRangeMode(true);
    setStartDate(startStr);
    setEndDate(endStr);
    setDateRange(startStr, endStr, true);
    fetchData(startStr, endStr, true);
  };

  const applyLastMonth = () => {
    const yesterday = getClosedBusinessDate(1);
    const yyyy = yesterday.getMonth() === 0 ? yesterday.getFullYear() - 1 : yesterday.getFullYear();
    const mm = yesterday.getMonth() === 0 ? 12 : yesterday.getMonth();
    const mmStr = String(mm).padStart(2, '0');
    const lastDay = new Date(yyyy, mm, 0).getDate();
    const startStr = `${yyyy}-${mmStr}-01`;
    const endStr = `${yyyy}-${mmStr}-${String(lastDay).padStart(2, '0')}`;
    setIsRangeMode(true);
    setStartDate(startStr);
    setEndDate(endStr);
    setDateRange(startStr, endStr, true);
    fetchData(startStr, endStr, true);
  };

  const getQuadrantBadge = (quadrant?: string) => {
    switch (quadrant) {
      case 'CORE_ANCHOR': return { text: '전사 앵커', color: 'bg-[#284F42] text-white border border-[#1B382E]' };
      case 'HIDDEN_GEM': return { text: '숨은 알짜 ★', color: 'bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/40' };
      case 'INDEPENDENT_CASHCOW': return { text: '독립 캐시카우', color: 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]' };
      case 'STANDALONE': return { text: '독립 매장', color: 'bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60' };
      default: return { text: '-', color: 'bg-[#F4F3EE] text-[#8C9E96] border border-[#D0C6BB]/40' };
    }
  };

  const getInteractionColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT':
      case 'HIGH_SYNERGY': return 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]';
      case 'GOOD':
      case 'MODERATE_SYNERGY': return 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/30';
      case 'AVERAGE': return 'bg-[#B59269]/15 text-[#B59269] border-[#B59269]/40';
      default: return 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 시너지 인텔리전스</span>
              <span className="text-white/60">|</span>
              <span className="text-white/90">실시간 연계 분석</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight flex items-center gap-3 break-keep">
              <div className="p-2.5 bg-[#284F42] text-white rounded-2xl shadow-xs">
                <Grid size={24} />
              </div>
              <span>매장 시너지 분석 V2</span>
            </h1>
            <p className="text-sm text-[#5A6B63] mt-2 max-w-2xl leading-relaxed">
              객실 투숙과 전사 영업장 매출 간의 실질적 상관관계 및 시너지 파급 효과를 분석합니다.
            </p>
          </div>

          <div className="bg-[#F4F3EE]/80 rounded-2xl p-4 border border-[#D0C6BB]/70 flex flex-col gap-3 w-full xl:w-auto xl:min-w-[380px]">
            <div className="flex items-center justify-between border-b border-[#D0C6BB]/50 pb-2">
              <span className="text-xs font-bold text-[#1B382E] flex items-center gap-1.5">
                <Calendar size={14} className="text-[#284F42]" /> 분석 기간 설정
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D0C6BB]/60 text-xs font-bold">
                <button
                  onClick={() => setIsRangeMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isRangeMode ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  단일 1일
                </button>
                <button
                  onClick={() => setIsRangeMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isRangeMode ? 'bg-[#284F42] text-white shadow-2xs font-bold' : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                >
                  기간 범위
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('MTD')} className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-semibold shadow-2xs cursor-pointer">금월 누적(추천)</button>
              <button onClick={applyRecent30Days} className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-medium shadow-2xs cursor-pointer">최근 30일</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-medium shadow-2xs cursor-pointer">최근 7일</button>
              <button onClick={applyLastMonth} className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#1B382E] border border-[#D0C6BB]/60 font-medium shadow-2xs cursor-pointer">전월</button>
              <button onClick={() => applyPreset('TODAY')} className="px-2.5 py-1 bg-white hover:bg-[#F4F3EE] rounded-lg text-xs text-[#8C9E96] border border-[#D0C6BB]/60 font-normal shadow-2xs cursor-pointer">단일 1일</button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-[#D0C6BB]/75 text-[#1B382E] text-xs rounded-xl px-3 py-1.5 outline-hidden focus:border-[#284F42] cursor-pointer shadow-2xs w-full"
              />
              {isRangeMode && (
                <>
                  <span className="text-[#8C9E96] text-xs">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-[#D0C6BB]/75 text-[#1B382E] text-xs rounded-xl px-3 py-1.5 outline-hidden focus:border-[#284F42] cursor-pointer shadow-2xs w-full"
                  />
                </>
              )}
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#B59269] hover:bg-[#a38058] active:scale-95 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ml-auto shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                조회
              </button>
            </div>
          </div>
        </div>

        {/* Synergy Navigation Sub-tabs */}
        <SynergyNav />

        {error && (
          <div className="bg-[#FDF0ED] text-[#8B2635] p-4 rounded-2xl border border-[#EAC5BD] font-medium shadow-2xs">
            {error}
          </div>
        )}

        {autoSwitchedNotice && (
          <div className="bg-white border border-[#D0C6BB]/75 text-[#1B382E] p-4 rounded-2xl font-medium flex items-center justify-between gap-3 text-xs lg:text-sm shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="shrink-0 text-[#284F42]" size={18} />
              <span>{autoSwitchedNotice}</span>
            </div>
            <button
              onClick={() => setAutoSwitchedNotice(null)}
              className="text-xs text-[#284F42] hover:text-[#1B382E] underline font-bold shrink-0 ml-2 cursor-pointer"
            >
              확인
            </button>
          </div>
        )}

        {isSingleDay && !loading && !error && (
          <div className="bg-white text-[#1B382E] p-5 rounded-3xl border border-[#B59269]/40 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Zap className="shrink-0 text-[#B59269] mt-1" size={20} />
              <div>
                <strong className="text-[#1B382E] font-bold text-sm lg:text-base">⚠️ 단일 일자(1일) 조회 중: 시계열 상관분석 지표 비활성화 안내</strong>
                <p className="text-xs lg:text-sm text-[#5A6B63] mt-1.5 leading-relaxed">
                  객실 투숙객 변화(X)와 매장 매출(Y) 간의 <strong>상관계수(r), 객실 탄력도, RevPAS 기울기, 낙수율</strong>은 일별 시계열 분산(Variance)을 기반으로 산출되는 계량경제 지표입니다.<br className="hidden md:inline"/>
                  단일 일자(1일)에는 분모(N-1)가 0이 되어 통계적 인과관계 도출이 불가능하므로, <strong>최소 7일 이상의 기간 조회(N ≥ 7)</strong>를 권장합니다. (현재 매출/수량/방문객만 표시됨)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              <button
                onClick={() => applyPreset('MTD')}
                className="bg-[#284F42] hover:bg-[#1B382E] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <TrendingUp size={14} /> 금월 누적 분석
              </button>
              <button
                onClick={applyRecent30Days}
                className="bg-white hover:bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/75 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar size={14} /> 최근 30일 분석
              </button>
            </div>
          </div>
        )}

        {data && data.meta && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all">
              <h3 className="text-xs font-bold text-[#5A6B63] mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#284F42]" /> 전사 리조트 매출
              </h3>
              <p className="text-3xl font-black text-[#1B382E] tracking-tight">
                {data.meta.totalResortSalesFormatted}<span className="text-base font-medium text-[#5A6B63] ml-1">원</span>
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all">
              <h3 className="text-xs font-bold text-[#5A6B63] mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#284F42]" /> 객실 총 판매수 (Anchor)
              </h3>
              <p className="text-3xl font-black text-[#1B382E] tracking-tight">
                {data.meta.totalRoomsSold.toLocaleString()} <span className="text-base font-medium text-[#5A6B63] ml-1">실</span>
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all">
              <h3 className="text-xs font-bold text-[#5A6B63] mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#B59269]" /> 객실 총 매출
              </h3>
              <p className="text-3xl font-black text-[#1B382E] tracking-tight">
                {data.meta.totalRoomSales ? data.meta.totalRoomSales.toLocaleString() + '원' : '-'}
              </p>
            </div>
          </div>
        )}

        {data && data.stores && (
          <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
            <div className="p-6 border-b border-[#D0C6BB]/60 bg-white flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div className="w-full xl:w-auto">
                <h2 className="text-lg font-extrabold text-[#1B382E] mb-3 flex items-center gap-2">
                  부대시설 매장별 시너지 지표
                  <HelpCircle size={16} className="text-[#8C9E96]" />
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-[#1B382E] bg-[#F4F3EE]/80 p-5 rounded-2xl border border-[#D0C6BB]/60 leading-relaxed mt-2">
                  <div>
                    <h4 className="font-bold text-[#1B382E] mb-2 flex items-center gap-1.5"><TrendingUp size={14} className="text-[#284F42]" /> 경제학적 지표 해석</h4>
                    <ul className="space-y-1.5 list-disc list-inside marker:text-[#8C9E96] ml-1 text-[#5A6B63]">
                      <li><strong className="text-[#1B382E]">RevPAS 기울기:</strong> 객실이 1개 더 찰 때마다 해당 매장 포스기(POS)에 추가로 찍히는 기대 매출액(원)입니다.</li>
                      <li><strong className="text-[#1B382E]">상관계수 (R²):</strong> 객실 투숙객 유입과 매장 매출 증가가 얼마나 일치하는지 보여주는 동조화 지수입니다.</li>
                      <li><strong className="text-[#1B382E]">주말 진폭:</strong> 평일 대비 주말과 공휴일에 매출이 얼마나 팽창하는지 보여주는 배수입니다.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1B382E] mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-[#284F42]" /> 데이터 과학 및 마케팅 연계</h4>
                    <ul className="space-y-1.5 list-disc list-inside marker:text-[#8C9E96] ml-1 text-[#5A6B63]">
                      <li><strong className="text-[#1B382E]">시차 보정 (Lag-1):</strong> 금요일 투숙객이 토요일 오전에 조식을 먹는 현상 등을 시스템이 수학적으로 자동 감지 및 보정하여 시너지 왜곡을 방지합니다.</li>
                      <li><strong className="text-[#1B382E]">재화 속성 분류:</strong> 객실 탄력도가 1.0을 초과하면 프로모션에 민감한 <span className="font-bold text-[#8B2635]">선택/사치재</span>, 1.0 미만이면 안정적인 <span className="font-bold text-[#1E523F]">필수재</span>로 분류하여 타겟 마케팅에 활용합니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0 xl:self-start">
                <span className="text-xs font-semibold text-[#5A6B63] bg-[#F4F3EE] border border-[#D0C6BB]/75 px-3 py-1 rounded-full">
                  총 {filteredStores.length}개 매장 분석
                </span>
                <div className="flex bg-[#F4F3EE] p-1 rounded-xl border border-[#D0C6BB]/60">
                  <button
                    onClick={() => { setSortBy('elasticity'); fetchData(undefined, undefined, undefined, 'elasticity'); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortBy === 'elasticity' ? 'bg-[#284F42] text-white shadow-2xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    ✨ 시너지 탄력도순 (추천)
                  </button>
                  <button
                    onClick={() => { setSortBy('totalSales'); fetchData(undefined, undefined, undefined, 'totalSales'); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortBy === 'totalSales' ? 'bg-[#284F42] text-white shadow-2xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    💰 매출액 규모순
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-[#F4F3EE]/50 border-b border-[#D0C6BB]/60 px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span className="text-xs font-bold text-[#5A6B63] mr-2 whitespace-nowrap">대분류 필터:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-[#284F42] text-white shadow-2xs' 
                      : 'bg-white text-[#5A6B63] border border-[#D0C6BB]/75 hover:bg-[#F4F3EE]'
                  }`}
                >
                  {cat === 'ALL' ? '전체 보기' : cat}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                  <tr>
                    <th className="px-4 py-3.5 text-left">매장명</th>
                    <th className="px-4 py-3.5 text-left">카테고리</th>
                    <th className="px-4 py-3.5 text-right">매출액</th>
                    <th className="px-4 py-3.5 text-right">수량</th>
                    <th className="px-4 py-3.5 text-right">진성 방문객</th>
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 group relative">
                        시너지 등급
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none">
                          상관계수 및 낙수율을 종합하여 판정한 교차 판매 시너지 강도입니다. (STRONG, MODERATE, WEAK, NONE)
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">시너지 분류</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 group relative">
                        객실 탄력도
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none text-left">
                          객실 판매량이 10% 증가할 때 기대되는 매장 매출 변동폭입니다.
                          <div className="absolute bottom-full right-4 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 group relative">
                        주말 진폭
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none text-left">
                          평일 대비 주말/공휴일 평균 매출의 팽창 배수입니다.
                          <div className="absolute bottom-full right-4 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 group relative">
                        RevPAS 기울기
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full right-0 mt-2 w-64 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none text-left">
                          객실 1실이 추가로 판매될 때마다 발생하는 해당 매장의 기대 추가 매출액(원)을 의미합니다. (선형 회귀 기울기)
                          <div className="absolute bottom-full right-6 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 group relative">
                        상관계수
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full right-0 mt-2 w-52 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none text-left">
                          객실 판매량과 해당 매장 매출 간의 통계적 동조화 지수입니다. 1에 가까울수록 함께 움직이는 경향이 뚜렷합니다.
                          <div className="absolute bottom-full right-6 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 group relative">
                        낙수율
                        <HelpCircle size={14} className="text-[#8C9E96] cursor-help" />
                        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1B382E] text-white text-[11px] font-normal p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-20 pointer-events-none text-left">
                          객실 판매 증가에 따른 매장의 통계적 추정 연동 매출 비율입니다. 결정계수(R²) 가중치가 결합되어 상관관계 신뢰도에 비례하여 산출됩니다.
                          <div className="absolute bottom-full right-4 border-4 border-transparent border-b-[#1B382E]"></div>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/40">
                  {filteredStores.map((store, idx) => (
                    <tr key={idx} className="hover:bg-[#F4F3EE]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1B382E]">{store.storeName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-[#F4F3EE] text-[#1B382E] px-2.5 py-1 rounded-lg border border-[#D0C6BB]/60">
                          {store.categoryCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1B382E]">{store.revenueFormatted}원</td>
                      <td className="px-4 py-3 text-right text-[#5A6B63]">{store.quantityFormatted}</td>
                      <td className="px-4 py-3 text-right text-[#5A6B63]">{store.visitorCountFormatted}</td>
                      <td className="px-4 py-3 text-center">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.interactionGrade ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getInteractionColor(store.interactionGrade)}`}>
                            {store.interactionGrade}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.synergyQuadrant ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getQuadrantBadge(store.synergyQuadrant).color}`}>
                            {getQuadrantBadge(store.synergyQuadrant).text}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.elasticity != null ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#1B382E] font-bold">{store.elasticity}배</span>
                              {store.elasticity > 1 ? (
                                <span className="text-[10px] bg-[#FDF0ED] text-[#8B2635] px-1.5 py-0.5 rounded border border-[#EAC5BD] font-bold">선택/사치재</span>
                              ) : store.elasticity > 0 ? (
                                <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] px-1.5 py-0.5 rounded border border-[#B4C6C1] font-bold">필수재</span>
                              ) : null}
                            </div>
                            {store.elasticityPercent != null && (
                              <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${store.elasticityPercent > 0 ? 'text-[#1E523F]' : 'text-[#8B2635]'}`}>
                                {store.elasticityPercent > 0 ? '+' : ''}{store.elasticityPercent}%
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#1B382E] whitespace-nowrap">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.swingMultiplier != null ? `${store.swingMultiplier}배` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#284F42] font-bold">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.revPasSlope ? `${store.revPasSlope > 0 ? '+' : ''}${Math.round(store.revPasSlope).toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#5A6B63] font-medium">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.correlationCoefficient != null ? store.correlationCoefficient.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#8B2635] font-bold">
                        {isSingleDay ? (
                          <span className="text-[#8C9E96] text-xs">-</span>
                        ) : store.spilloverRate != null ? `${store.spilloverRate}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
