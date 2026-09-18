import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { Users, TrendingUp, UserPlus, RefreshCw, Activity, CalendarDays, PieChart } from 'lucide-react';
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
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Users size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mb-3">
                <Activity size={18} className="text-indigo-500" /> 총 활성 회원 수 (누적)
              </div>
              <div className="text-3xl font-extrabold text-slate-800">
                {formatCurrency(summary.totalActiveMembers)}<span className="text-lg font-bold text-slate-500 ml-1">명</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-3 font-medium">
                휴대폰 번호 기준 중복 제거된 고유 활동(가입/예약) 고객 수
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <CalendarDays size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mb-3">
                <UserPlus size={18} className="text-emerald-500" /> 기간 내 신규 가입
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-extrabold text-slate-800">
                  {formatCurrency(summary.periodJoinedMembers)}<span className="text-lg font-bold text-slate-500 ml-1">명</span>
                </div>
                <div className="text-sm font-semibold text-emerald-600 mb-1">
                  (오늘 {formatCurrency(summary.todayJoinedMembers)}명)
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingUp size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mb-3">
                <TrendingUp size={18} className="text-amber-500" /> 전년 동기 가입자
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-extrabold text-slate-800">
                  {formatCurrency(summary.lyPeriodJoinedMembers)}<span className="text-lg font-bold text-slate-500 ml-1">명</span>
                </div>
                {summary.lyPeriodJoinedMembers > 0 && summary.periodJoinedMembers !== undefined && (
                  <div className={`text-sm font-semibold mb-1 ${summary.periodJoinedMembers > summary.lyPeriodJoinedMembers ? 'text-rose-500' : 'text-blue-500'}`}>
                    {summary.periodJoinedMembers > summary.lyPeriodJoinedMembers ? '▲' : '▼'} {Math.abs(Math.round(((summary.periodJoinedMembers - summary.lyPeriodJoinedMembers) / summary.lyPeriodJoinedMembers) * 100))}%
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-3 font-medium">
                통합 데이터 수집 시점(25년 12월 16일) 이전은 0명으로 표기
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <PieChart size={64} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mb-3">
                <Users size={18} className="text-cyan-500" /> 객실가입자 (기간내)
              </div>
              <div className="text-3xl font-extrabold text-slate-800">
                {formatCurrency(summary.periodRoomJoined)}<span className="text-lg font-bold text-slate-500 ml-1">명</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bar Chart (Monthly) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarDays size={18} className="text-slate-500" />
                월별 가입자 연간 비교
              </h3>
              <div className="h-[300px]">
                <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Recent Members Table */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2 shrink-0">
                <Users size={18} className="text-slate-500" />
                최근 가입/활동 회원 목록
              </h3>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">고객명</th>
                      <th className="px-4 py-3">연락처</th>
                      <th className="px-4 py-3">채널</th>
                      <th className="px-4 py-3 rounded-r-lg">최초 활동일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMembers.slice(0, 7).map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{m.custName}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{m.phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                            {m.firstChannel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{m.firstActivityDate}</td>
                      </tr>
                    ))}
                    {recentMembers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          조회된 회원 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
