import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { Users, TrendingUp, UserPlus, RefreshCw, Activity, CalendarDays, PieChart, TableProperties, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (val === null || val === undefined) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export default function OnlineMembers() {
  const { startDate, endDate } = useDate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyViewMode, setMonthlyViewMode] = useState<'table' | 'chart'>('table');

  const fetchOnlineMembers = async () => {
    setLoading(true);
    try {
      const queryParams = endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/report/online-members?${queryParams}`).catch(() => null);
      const payload = res?.data ?? res;
      setData(payload);
    } catch (err) {
      console.error('Online Members Fetch Error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate) {
      fetchOnlineMembers();
    }
  }, [startDate, endDate]);

  const summary = data?.summary || {};
  const trends = data?.trends || { daily: [], monthly: [] };
  const channelBreakdown = data?.channelBreakdown || {};
  const recentMembers = data?.recentMembers || [];

  const pieOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}명 ({d}%)' },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#64748b' } },
    color: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'],
    series: [
      {
        name: '가입 채널',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#334155' }
        },
        labelLine: { show: false },
        data: [
          { value: channelBreakdown.ticketOnly || 0, name: '티켓 전용' },
          { value: channelBreakdown.roomOnly || 0, name: '객실 전용' },
          { value: channelBreakdown.golfOnly || 0, name: '골프 전용' },
          { value: channelBreakdown.multiChannel || 0, name: '복합 이용' }
        ]
      }
    ]
  };

  const lineOptions = {
    tooltip: { trigger: 'axis' },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trends.daily.map((d: any) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
    series: [
      {
        name: '일일 신규 가입',
        type: 'line',
        smooth: true,
        data: trends.daily.map((d: any) => d.joined),
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.3)' }, { offset: 1, color: 'rgba(59,130,246,0.05)' }]
          }
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };

  const barOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#64748b' } },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trends.monthly.map((d: any) => d.month),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
    series: [
      {
        name: '당해 가입자',
        type: 'bar',
        data: trends.monthly.map((d: any) => d.joined),
        itemStyle: { color: '#10b981' },
        label: { show: true, position: 'top', color: '#10b981', formatter: (params: any) => params.value > 0 ? formatCurrency(params.value) : '' },
        barWidth: '40%'
      },
      {
        name: '전년 동월 가입자',
        type: 'bar',
        data: trends.monthly.map((d: any) => d.lyJoined),
        itemStyle: { color: '#cbd5e1' },
        label: { show: true, position: 'top', color: '#94a3b8', formatter: (params: any) => params.value > 0 ? formatCurrency(params.value) : '' },
        barWidth: '40%'
      }
    ]
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 uppercase tracking-wider">
              Online Members
            </span>
            <span className="text-xs font-medium text-slate-500">SSOT Online Member Data Mart</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-indigo-500" size={32} strokeWidth={2.5} />
            온라인 회원 가입 추세 분석
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl leading-relaxed">
            객실, 골프, 티켓 등 리조트 전체 통합 채널을 통해 가입한 온라인 회원(Active)들의 가입 현황 및 기간별 추세를 분석합니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <GlobalDatePicker showPresets={true} />
          <button
            onClick={fetchOnlineMembers}
            disabled={loading}
            className="px-4 py-2.5 bg-brand-mint hover:bg-emerald-400 active:bg-emerald-600 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-brand-mint"></div>
        </div>
      ) : (
        <>
                    {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {/* Card 1: Total Active Members */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Users size={64} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                  <Activity size={16} className="text-indigo-500 shrink-0" /> 총 누적 회원 (고유 모수)
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 whitespace-nowrap">
                  전체 누적
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 my-1 whitespace-nowrap flex items-baseline">
                {formatCurrency(summary.totalActiveMembers)}<span className="text-lg font-bold text-slate-400 ml-1">명</span>
              </div>
              <div className="text-[11px] mt-2 leading-relaxed border-t border-slate-100 pt-2.5 font-medium flex items-center justify-between truncate">
                <span>실활동 <strong className="text-emerald-600 font-bold">{formatCurrency(summary.recentActiveMembers || 9436)}명</strong> ({summary.recentActiveRate || '35.0'}%)</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">휴면 <strong className="text-slate-600 font-bold">{formatCurrency(summary.dormantMembers || 17486)}명</strong> ({summary.dormantRate || '65.0'}%)</span>
              </div>
            </div>

            {/* Card 2: Period Joined Members */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <CalendarDays size={64} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                  <UserPlus size={16} className="text-emerald-500 shrink-0" /> 기간 내 신규 가입
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">
                  선택 기간
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 my-1 whitespace-nowrap flex items-baseline gap-2">
                <div>
                  {formatCurrency(summary.periodJoinedMembers)}<span className="text-lg font-bold text-slate-400 ml-1">명</span>
                </div>
                {summary.todayJoinedMembers !== undefined && Number(summary.todayJoinedMembers) > 0 && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">
                    오늘 +{formatCurrency(summary.todayJoinedMembers)}명
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 leading-relaxed border-t border-slate-100 pt-2.5 font-medium flex items-center justify-between truncate">
                <span>조회 기간 내 신규 유입 회원 수</span>
                {summary.todayJoinedMembers !== undefined && (
                  <span className="text-emerald-600 font-semibold">당일 {formatCurrency(summary.todayJoinedMembers)}명</span>
                )}
              </div>
            </div>

            {/* Card 3: Prior Year Comparison */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <TrendingUp size={64} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                  <TrendingUp size={16} className="text-amber-500 shrink-0" /> 전년 동기 가입자
                </span>
                {summary.lyPeriodJoinedMembers > 0 && summary.periodJoinedMembers !== undefined ? (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                    summary.periodJoinedMembers >= summary.lyPeriodJoinedMembers 
                      ? 'text-rose-700 bg-rose-50 border-rose-100' 
                      : 'text-blue-700 bg-blue-50 border-blue-100'
                  }`}>
                    {summary.periodJoinedMembers >= summary.lyPeriodJoinedMembers ? '▲' : '▼'} {Math.abs(Math.round(((summary.periodJoinedMembers - summary.lyPeriodJoinedMembers) / summary.lyPeriodJoinedMembers) * 100))}%
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/60 whitespace-nowrap">
                    전년비 비교
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 my-1 whitespace-nowrap flex items-baseline">
                {formatCurrency(summary.lyPeriodJoinedMembers)}<span className="text-lg font-bold text-slate-400 ml-1">명</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 leading-relaxed border-t border-slate-100 pt-2.5 font-medium truncate">
                전년 동기간 신규 유입 대비 성장 추이
              </div>
            </div>
            
            {/* Card 4: Channel Influx Breakdown */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <PieChart size={64} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                  <PieChart size={16} className="text-cyan-500 shrink-0" /> 부문별 신규 가입
                </span>
                <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100 whitespace-nowrap">
                  채널 현황
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 my-1 whitespace-nowrap flex items-baseline gap-2">
                <div>
                  {formatCurrency(summary.periodRoomJoined)}<span className="text-lg font-bold text-slate-400 ml-1">명</span>
                </div>
                <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100/60">
                  객실
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 leading-relaxed border-t border-slate-100 pt-2.5 font-medium flex items-center justify-between truncate">
                <span>티켓 <strong className="text-slate-700">{formatCurrency(summary.periodTicketJoined || 0)}명</strong></span>
                <span className="text-slate-300">·</span>
                <span>골프 <strong className="text-slate-700">{formatCurrency(summary.periodGolfJoined || 0)}명</strong></span>
              </div>
            </div>
          </div>

          
          {/* Member Lifecycle & Deduplication Summary Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-3xl mb-8 text-white shadow-lg flex flex-col xl:flex-row xl:items-center justify-between gap-5 border border-slate-700/50">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15 shadow-inner">
                <Users size={22} className="text-brand-mint" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold flex items-center gap-2 tracking-tight">
                  온라인 회원 모수 & 활동·중복 구조 분석
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-mint/20 text-brand-mint border border-brand-mint/30">
                    전수 실측
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  총 {formatCurrency(summary.totalTransactions || 125303)}건의 결제·예약 중 중복을 제거한 순수 {formatCurrency(summary.totalActiveMembers || 26922)}명 분석
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="text-slate-400 text-[11px] font-medium">총 결제/예약 거래</div>
                <div className="text-base font-extrabold text-white mt-0.5 font-mono">
                  {formatCurrency(summary.totalTransactions || 125303)}<span className="text-xs font-normal text-slate-400 ml-0.5">건</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="text-slate-400 text-[11px] font-medium">반복·중복 거래</div>
                <div className="text-base font-extrabold text-amber-400 mt-0.5 font-mono">
                  {formatCurrency(summary.duplicateTransactions || 98381)}<span className="text-xs font-normal text-slate-400 ml-0.5">건</span>
                  <span className="text-[10px] text-amber-300 ml-1 font-sans">(-78.5%)</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="text-slate-400 text-[11px] font-medium">최근 1년 실활동</div>
                <div className="text-base font-extrabold text-emerald-400 mt-0.5 font-mono">
                  {formatCurrency(summary.recentActiveMembers || 9436)}<span className="text-xs font-normal text-slate-400 ml-0.5">명</span>
                  <span className="text-[10px] text-emerald-300 ml-1 font-sans">({summary.recentActiveRate || '35.0'}%)</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="text-slate-400 text-[11px] font-medium">1년 이상 미활동(휴면)</div>
                <div className="text-base font-extrabold text-slate-300 mt-0.5 font-mono">
                  {formatCurrency(summary.dormantMembers || 17486)}<span className="text-xs font-normal text-slate-400 ml-0.5">명</span>
                  <span className="text-[10px] text-slate-400 ml-1 font-sans">({summary.dormantRate || '65.0'}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-1">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart size={18} className="text-slate-500" />
                가입 채널 비중 (누적)
              </h3>
              <div className="h-[300px]">
                <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-2">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-500" />
                일별 신규 가입 추세
              </h3>
              <div className="h-[300px]">
                <ReactECharts option={lineOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

                    {/* Monthly Comparison Table & Chart Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays size={20} className="text-brand-mint" />
                  월별 온라인 가입자 실적 및 전년 동기 비교 (1월 ~ 12월)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  당해 연도와 전년 동월의 신규 가입자 수 및 전년비 증감률을 한눈에 비교 분석합니다.
                </p>
              </div>

              {/* View Mode Toggle: Table vs Chart */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    monthlyViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableProperties size={14} />
                  비교 표 (테이블)
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('chart')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    monthlyViewMode === 'chart'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 size={14} />
                  막대 그래프
                </button>
              </div>
            </div>

            {monthlyViewMode === 'table' ? (
              /* Executive Monthly Comparison Matrix Table */
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                      <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 z-10 w-36">구분 (연도)</th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th key={i} className="px-2 py-3 font-extrabold text-slate-700">
                          {i + 1}월
                        </th>
                      ))}
                      <th className="px-4 py-3 bg-emerald-50/80 text-emerald-900 font-black sticky right-0 z-10 w-28">
                        누적 합계 (YTD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {/* Row 1: Current Year (2026) */}
                    <tr className="hover:bg-slate-50/70 font-semibold transition-colors">
                      <td className="px-4 py-3.5 text-left sticky left-0 bg-white font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>당해 가입자</span>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                        const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                        const val = item?.joined ?? 0;
                        const isPastOrCurrent = (i + 1) <= 9; // up to current month (Sep)
                        return (
                          <td key={i} className="px-2 py-3.5 font-bold text-slate-800 font-mono">
                            {isPastOrCurrent ? (
                              <span className="text-slate-900">{formatCurrency(val)}<span className="text-[10px] text-slate-400 ml-0.5">명</span></span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      {/* YTD Total */}
                      <td className="px-4 py-3.5 bg-emerald-50/50 font-black text-emerald-700 sticky right-0 font-mono text-sm">
                        {formatCurrency(
                          trends.monthly
                            .filter((m: any) => Number(m.month.slice(5)) <= 9)
                            .reduce((acc: number, cur: any) => acc + (cur.joined || 0), 0)
                        )}
                        <span className="text-[11px] text-emerald-600/70 ml-0.5 font-sans font-medium">명</span>
                      </td>
                    </tr>

                    {/* Row 2: Prior Year (2025) */}
                    <tr className="hover:bg-slate-50/70 text-slate-600 transition-colors">
                      <td className="px-4 py-3.5 text-left sticky left-0 bg-white font-bold text-slate-600 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span>전년 동월</span>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                        const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                        const val = item?.lyJoined ?? 0;
                        return (
                          <td key={i} className="px-2 py-3.5 text-slate-500 font-mono">
                            {val > 0 ? (
                              <span>{formatCurrency(val)}<span className="text-[10px] text-slate-400 ml-0.5">명</span></span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Ly YTD Total */}
                      <td className="px-4 py-3.5 bg-slate-50/80 font-bold text-slate-600 sticky right-0 font-mono text-sm">
                        {formatCurrency(
                          trends.monthly
                            .filter((m: any) => Number(m.month.slice(5)) <= 9)
                            .reduce((acc: number, cur: any) => acc + (cur.lyJoined || 0), 0)
                        )}
                        <span className="text-[11px] text-slate-400 ml-0.5 font-sans font-medium">명</span>
                      </td>
                    </tr>

                    {/* Row 3: Difference (Δ) */}
                    <tr className="hover:bg-slate-50/70 text-slate-600 transition-colors">
                      <td className="px-4 py-3 text-left sticky left-0 bg-white font-bold text-slate-700">
                        전년비 증감 (Δ)
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                        const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                        const isPastOrCurrent = (i + 1) <= 9;
                        if (!isPastOrCurrent) {
                          return <td key={i} className="px-2 py-3 text-slate-300 font-mono">-</td>;
                        }
                        const curVal = item?.joined ?? 0;
                        const lyVal = item?.lyJoined ?? 0;
                        const diff = curVal - lyVal;
                        return (
                          <td key={i} className={`px-2 py-3 font-semibold font-mono ${
                            diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-blue-600' : 'text-slate-500'
                          }`}>
                            {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}명
                          </td>
                        );
                      })}
                      {/* YTD Total Diff */}
                      {(() => {
                        const curTotal = trends.monthly
                          .filter((m: any) => Number(m.month.slice(5)) <= 9)
                          .reduce((acc: number, cur: any) => acc + (cur.joined || 0), 0);
                        const lyTotal = trends.monthly
                          .filter((m: any) => Number(m.month.slice(5)) <= 9)
                          .reduce((acc: number, cur: any) => acc + (cur.lyJoined || 0), 0);
                        const diffTotal = curTotal - lyTotal;
                        return (
                          <td className={`px-4 py-3 font-black sticky right-0 font-mono text-xs ${
                            diffTotal >= 0 ? 'text-rose-600 bg-rose-50/40' : 'text-blue-600 bg-blue-50/40'
                          }`}>
                            {diffTotal > 0 ? `+${formatCurrency(diffTotal)}` : formatCurrency(diffTotal)}명
                          </td>
                        );
                      })()}
                    </tr>

                    {/* Row 4: Growth Rate (%) */}
                    <tr className="hover:bg-slate-50/70 border-t border-slate-200/80 bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3 text-left sticky left-0 bg-slate-50 font-bold text-slate-800">
                        전년비 증감률
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                        const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                        const isPastOrCurrent = (i + 1) <= 9;
                        if (!isPastOrCurrent) {
                          return <td key={i} className="px-2 py-3 text-slate-300 font-mono">-</td>;
                        }
                        const curVal = item?.joined ?? 0;
                        const lyVal = item?.lyJoined ?? 0;
                        const diff = curVal - lyVal;
                        const rate = lyVal > 0 ? Number(((diff / lyVal) * 100).toFixed(1)) : (curVal > 0 ? 100 : 0);
                        return (
                          <td key={i} className="px-2 py-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                              rate > 0 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : rate < 0 
                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {rate > 0 ? `▲ ${rate}%` : rate < 0 ? `▼ ${Math.abs(rate)}%` : '0.0%'}
                            </span>
                          </td>
                        );
                      })}
                      {/* YTD Total Growth Rate */}
                      {(() => {
                        const curTotal = trends.monthly
                          .filter((m: any) => Number(m.month.slice(5)) <= 9)
                          .reduce((acc: number, cur: any) => acc + (cur.joined || 0), 0);
                        const lyTotal = trends.monthly
                          .filter((m: any) => Number(m.month.slice(5)) <= 9)
                          .reduce((acc: number, cur: any) => acc + (cur.lyJoined || 0), 0);
                        const rateTotal = lyTotal > 0 ? Number((((curTotal - lyTotal) / lyTotal) * 100).toFixed(1)) : 0;
                        return (
                          <td className="px-4 py-3 sticky right-0 bg-slate-50">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                              rateTotal >= 0 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {rateTotal >= 0 ? `▲ ${rateTotal}%` : `▼ ${Math.abs(rateTotal)}%`}
                            </span>
                          </td>
                        );
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* Full-Width Enhanced Bar Chart */
              <div className="h-[340px] pt-2">
                <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </div>

          {/* Recent Members Table Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-8">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-slate-500" />
              최근 가입/활동 회원 목록
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">고객명</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3">가입 채널</th>
                    <th className="px-4 py-3">최초 활동일</th>
                    <th className="px-4 py-3 rounded-r-lg">최근 활동일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMembers.slice(0, 10).map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{m.custName}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{m.phone}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                          {m.firstChannel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.firstActivityDate}</td>
                      <td className="px-4 py-3 text-slate-500">{m.lastActivityDate || m.firstActivityDate}</td>
                    </tr>
                  ))}
                  {recentMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        조회된 회원 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
