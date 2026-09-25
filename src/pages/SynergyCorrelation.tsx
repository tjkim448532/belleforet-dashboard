import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import type { SynergyStoreCorrelationV2Response } from '../types/reports-v2';
import { 
  TrendingUp, Calendar, RefreshCw, Grid, Zap,
  Sparkles, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function SynergyCorrelation() {
  const { startDate: globalStartDate, endDate: globalEndDate, isRange: globalIsRange, setDateRange } = useDate();
  
  const [isRangeMode, setIsRangeMode] = useState<boolean>(globalIsRange);
  const [startDate, setStartDate] = useState<string>(globalStartDate);
  const [endDate, setEndDate] = useState<string>(globalEndDate || globalStartDate);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<SynergyStoreCorrelationV2Response | null>(null);

  const fetchData = async (overrideStart?: string, overrideEnd?: string, overrideIsRange?: boolean) => {
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

    setLoading(true);
    setError(null);

    try {
      const queryDateParams = (rangeActive && eDate) 
        ? `startDate=${sDate}&endDate=${eDate}`
        : `startDate=${sDate}&endDate=${sDate}`; // ensure both are passed for exact mapping

      const res = await secureFetcher(`${API_BASE}/api/v6/report/synergy-store-correlation-v2?${queryDateParams}`);
      
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

  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setStartDate(res.startDate);
    setEndDate(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
    fetchData(res.startDate, res.endDate || res.startDate, res.isRange);
  };

  const getInteractionColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT':
      case 'HIGH_SYNERGY': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'GOOD':
      case 'MODERATE_SYNERGY': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'AVERAGE': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3 break-keep">
              <Grid className="text-indigo-400 shrink-0" size={32} />
              매장 시너지 분석 V2
            </h1>
            <p className="text-indigo-100 mt-2 text-sm lg:text-base font-normal max-w-2xl leading-relaxed">
              객실 투숙과 전사 영업장 매출 간의 실질적 상관관계 및 시너지 파급 효과를 분석합니다.
            </p>

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
                <Zap size={14} /> 2. 매장 시너지 분석 V2
              </NavLink>
            </div>
          </div>

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

            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => applyPreset('TODAY')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">오늘</button>
              <button onClick={() => applyPreset('WEEK')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">최근 7일</button>
              <button onClick={() => applyPreset('MTD')} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-indigo-200 font-medium">금월</button>
            </div>

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
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 mb-6 font-medium">
          {error}
        </div>
      )}

      {startDate === endDate && !loading && !error && (
        <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 mb-6 font-medium flex items-start gap-3">
          <Zap className="shrink-0 mt-0.5" size={18} />
          <div>
            <strong>Econometric Guard 작동 중:</strong>
            <p className="text-sm mt-1">
              단일 일자(1일) 조회 시 분산(Variance)이 존재하지 않아 시너지 상관계수(Correlation) 도출이 수학적으로 불가능합니다. (모든 값이 0.00 처리됨)<br/>
              의미 있는 인과 관계 및 시너지 지표를 확인하시려면 <strong>분석 기간을 최소 14일 이상(또는 최근 7일/1개월)</strong>으로 설정해 주십시오.
            </p>
          </div>
        </div>
      )}

      {data && data.meta && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" /> 전사 리조트 매출
            </h3>
            <p className="text-3xl font-extrabold text-slate-800">
              {data.meta.totalResortSalesFormatted}<span className="text-base font-medium text-slate-500">원</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> 객실 총 판매수 (Anchor)
            </h3>
            <p className="text-3xl font-extrabold text-slate-800">
              {data.meta.totalRoomsSold.toLocaleString()} <span className="text-base font-medium text-slate-500">실</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-500" /> 객실 총 매출
            </h3>
            <p className="text-3xl font-extrabold text-slate-800">
              {data.meta.totalRoomSales ? data.meta.totalRoomSales.toLocaleString() + '원' : '-'}
            </p>
          </div>
        </div>
      )}

      {data && data.stores && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="w-full xl:w-auto">
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                부대시설 매장별 시너지 지표
                <HelpCircle size={16} className="text-slate-400" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm w-full">
                <p><strong className="text-slate-800">시너지 등급:</strong> 상관계수 및 낙수율을 종합한 교차 판매 강도 (STRONG/MODERATE/WEAK/NONE)</p>
                <p><strong className="text-slate-800">RevPAS 기울기:</strong> 객실 1실 추가 판매 시 발생하는 해당 매장의 기대 추가 매출액(원)</p>
                <p><strong className="text-slate-800">상관계수:</strong> 객실 판매량과 해당 매장 매출 간의 동조화 지수 (1에 가까울수록 정비례)</p>
                <p><strong className="text-slate-800">낙수율:</strong> 객실 투숙객 중 해당 부대시설을 동시에 방문하여 결제한 비율</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shrink-0 xl:self-start">
              총 {data.stores.length}개 매장 분석
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">매장명</th>
                  <th className="px-4 py-3">카테고리</th>
                  <th className="px-4 py-3 text-right">매출액</th>
                  <th className="px-4 py-3 text-right">수량</th>
                  <th className="px-4 py-3 text-right">진성 방문객</th>
                  <th className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 group relative">
                      시너지 등급
                      <HelpCircle size={14} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-800 text-white text-[11px] font-normal p-2.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-10 pointer-events-none">
                        상관계수 및 낙수율을 종합하여 판정한 교차 판매 시너지 강도입니다. (STRONG, MODERATE, WEAK, NONE)
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 group relative">
                      RevPAS 기울기
                      <HelpCircle size={14} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-[11px] font-normal p-2.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-10 pointer-events-none text-left">
                        객실 1실이 추가로 판매될 때마다 발생하는 해당 매장의 기대 추가 매출액(원)을 의미합니다. (선형 회귀 기울기)
                        <div className="absolute top-full right-6 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 group relative">
                      상관계수
                      <HelpCircle size={14} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-52 bg-slate-800 text-white text-[11px] font-normal p-2.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-10 pointer-events-none text-left">
                        객실 판매량과 해당 매장 매출 간의 통계적 동조화 지수입니다. 1에 가까울수록 함께 움직이는 경향이 뚜렷합니다.
                        <div className="absolute top-full right-6 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 group relative">
                      낙수율
                      <HelpCircle size={14} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-800 text-white text-[11px] font-normal p-2.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-10 pointer-events-none text-left">
                        체류객의 내부 소비 전환율입니다. 객실 이용객 중 해당 부대시설을 동시에 방문하여 결제한 비율을 나타냅니다.
                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.stores.map((store, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{store.storeName}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {store.categoryCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{store.revenueFormatted}원</td>
                    <td className="px-4 py-3 text-right text-slate-600">{store.quantityFormatted}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{store.visitorCountFormatted}</td>
                    <td className="px-4 py-3 text-center">
                      {store.interactionGrade && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getInteractionColor(store.interactionGrade)}`}>
                          {store.interactionGrade}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-600 font-medium">
                      {store.revPasSlope ? `+${store.revPasSlope}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {store.correlationCoefficient != null ? store.correlationCoefficient.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">
                      {store.spilloverRate != null ? `${store.spilloverRate}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
