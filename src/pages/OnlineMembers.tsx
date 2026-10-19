import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { getLatestClosedDateStr } from '../lib/dateUtils';
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
  const { startDate, endDate, isRange } = useDate();
  const [data, setData] = useState<any>(null);
  const [dormancyIntel, setDormancyIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyViewMode, setMonthlyViewMode] = useState<'table' | 'chart'>('table');

  const isRangeMode = Boolean(endDate && startDate !== endDate);

  const fetchOnlineMembers = async () => {
    setLoading(true);
    try {
      const queryParams = isRangeMode
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const [res, dormancyRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/online-members?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/online-member-dormancy?${queryParams}`).catch(() => null)
      ]);
      const payload = res?.data ?? res;
      setData(payload);
      if (dormancyRes && (dormancyRes.summary || dormancyRes.data)) {
        setDormancyIntel(dormancyRes.data || dormancyRes);
      } else {
        setDormancyIntel(null);
      }
    } catch (err) {
      console.error('Online Members Fetch Error:', err);
      setData(null);
      setDormancyIntel(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate) {
      fetchOnlineMembers();
    }
  }, [startDate, endDate, isRange]);

  const summary = data?.summary || {};
  const trends = data?.trends || { daily: [], monthly: [] };
  const channelBreakdown = data?.channelBreakdown || {};
  const recentMembers = data?.recentMembers || [];
  const effectiveRefDate = (isRangeMode && endDate ? endDate : startDate) || getLatestClosedDateStr();
  const currentMonthNum = parseInt(effectiveRefDate.slice(5, 7), 10);

  const pieOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}명 ({d}%)' },
    color: ['#D0C6BB', '#8A9E96', '#3D6C5C', '#284F42'], // Linen, Sage, Forest, Deep Forest
    series: [
      {
        name: '가입 채널',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { 
          show: true, 
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontWeight: 'bold',
          color: '#1B382E'
        },
        labelLine: { show: true, length: 10, length2: 15 },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(40, 79, 66, 0.3)' }
        },
        data: [
          { value: channelBreakdown.ticketOnly || 0, name: '티켓 전용' },
          { value: channelBreakdown.roomOnly || 0, name: '객실 전용' },
          { value: channelBreakdown.golfOnly || 0, name: '골프 전용' },
          { 
            value: channelBreakdown.multiChannel || 0, 
            name: '👑 VIP (복합 이용)', 
            label: { color: '#284F42', fontSize: 13, fontWeight: '900' }
          }
        ]
      }
    ]
  };

  const funnelOptions = {
    tooltip: { trigger: 'item', formatter: '{b} : {c}명' },
    color: ['#1B382E', '#284F42', '#3D6C5C', '#5F8D7B', '#B59269'],
    series: [
      {
        name: '고객 충성도 퍼널',
        type: 'funnel',
        left: '10%',
        width: '60%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}\n{c}명',
          fontSize: 13,
          color: '#1B382E',
          fontWeight: 'bold',
          lineHeight: 18
        },
        labelLine: {
          length: 20,
          lineStyle: {
            width: 1,
            type: 'solid',
            color: '#8A9E96'
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
          borderRadius: 6
        },
        data: [
          { value: summary.totalActiveMembers || 0, name: '전체 고유 회원' },
          { value: summary.repeatBuyers || 0, name: '2회 이상 재구매' },
          { value: summary.recentActiveMembers || 0, name: '최근 1년 실활동' },
          { value: summary.trueRepeatBuyers || 0, name: '찐 재방문 (5일+ 간격)' },
          { value: channelBreakdown.multiChannel || 0, name: '2개 채널 복합 이용' }
        ]
      }
    ]
  };

  const dualAxisDailyOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { top: 0, textStyle: { color: '#5A6B63' } },
    grid: { top: '15%', left: '3%', right: '3%', bottom: '5%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trends.daily.map((d: any) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#D0C6BB' } },
      axisLabel: { color: '#5A6B63' }
    },
    yAxis: [
      { 
        type: 'value', 
        name: '채널별 유입 (명)',
        position: 'left',
        splitLine: { lineStyle: { type: 'dashed', color: '#D0C6BB/40' } }, 
        axisLabel: { color: '#5A6B63' },
        nameTextStyle: { color: '#5A6B63', fontSize: 10, padding: [0, 0, 0, 20] }
      },
      { 
        type: 'value', 
        name: '실활동 고객 (명)',
        position: 'right',
        splitLine: { show: false }, 
        axisLabel: { color: '#284F42', fontWeight: 'bold' },
        nameTextStyle: { color: '#284F42', fontSize: 10 }
      }
    ],
    series: [
      {
        name: '티켓 가입',
        type: 'bar',
        stack: 'Total',
        itemStyle: { color: '#B59269' },
        data: trends.daily.map((d: any) => d.ticketJoined || 0)
      },
      {
        name: '객실 가입',
        type: 'bar',
        stack: 'Total',
        itemStyle: { color: '#5F8D7B' },
        data: trends.daily.map((d: any) => d.roomJoined || 0)
      },
      {
        name: '골프 가입',
        type: 'bar',
        stack: 'Total',
        itemStyle: { color: '#284F42', borderRadius: [4, 4, 0, 0] },
        data: trends.daily.map((d: any) => d.golfJoined || 0)
      },
      {
        name: '일일 실활동(DAU)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: trends.daily.map((d: any) => d.active || 0),
        itemStyle: { color: '#1B382E' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  };

  const barOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#5A6B63' } },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trends.monthly.map((d: any) => d.month),
      axisLine: { lineStyle: { color: '#D0C6BB' } },
      axisLabel: { color: '#5A6B63' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#D0C6BB/40' } }, axisLabel: { color: '#5A6B63' } },
    series: [
      {
        name: '당해 가입자',
        type: 'bar',
        data: trends.monthly.map((d: any) => d.joined),
        itemStyle: { color: '#284F42', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#284F42', fontWeight: 'bold', formatter: (params: any) => params.value > 0 ? formatCurrency(params.value) : '' },
        barWidth: '40%'
      },
      {
        name: '전년 동월 가입자',
        type: 'bar',
        data: trends.monthly.map((d: any) => d.lyJoined),
        itemStyle: { color: '#D0C6BB', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#8A9E96', formatter: (params: any) => params.value > 0 ? formatCurrency(params.value) : '' },
        barWidth: '40%'
      }
    ]
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
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] relative overflow-hidden">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · ONLINE MEMBERS INTELLIGENCE</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-[#1B382E] tracking-tight flex items-center gap-3">
                <Users className="text-[#284F42] shrink-0" size={32} strokeWidth={2.5} />
                <span>온라인 회원 가입 추세 분석</span>
              </h1>
              <p className="text-[#5A6B63] mt-2 text-sm max-w-2xl leading-relaxed">
                객실, 골프, 티켓 등 리조트 전체 통합 채널을 통해 가입한 온라인 회원(Active)들의 가입 현황 및 기간별 추세를 분석합니다.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <GlobalDatePicker showPresets={true} />
              <button
                onClick={fetchOnlineMembers}
                disabled={loading}
                className="px-4 py-2.5 bg-[#B59269] hover:bg-[#a38058] active:scale-95 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-[#D0C6BB]/75">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D0C6BB] border-t-[#284F42]"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Card 1: Total Active Members */}
              <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                    <Activity size={16} className="text-[#284F42] shrink-0" /> 총 누적 회원 (고유 모수)
                  </span>
                  <span className="text-[11px] font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70 whitespace-nowrap">
                    전체 누적
                  </span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] my-1 whitespace-nowrap flex items-baseline">
                  {formatCurrency(summary.totalActiveMembers)}<span className="text-lg font-bold text-[#5A6B63] ml-1">명</span>
                </div>
                <div className="text-[11px] mt-2 leading-relaxed border-t border-[#D0C6BB]/40 pt-2.5 font-medium flex items-center justify-between flex-wrap gap-1 text-[#5A6B63]">
                  <span>실활동 <strong className="text-[#1E523F] font-bold">{formatCurrency(summary.recentActiveMembers || 0)}명</strong> ({summary.recentActiveRate !== undefined && summary.recentActiveRate !== null ? `${summary.recentActiveRate}%` : '-'})</span>
                  <span className="text-[#D0C6BB]">·</span>
                  <span>휴면 <strong className="text-[#1B382E] font-bold">{formatCurrency(summary.dormantMembers || 0)}명</strong> ({summary.dormantRate !== undefined && summary.dormantRate !== null ? `${summary.dormantRate}%` : '-'})</span>
                </div>
              </div>

              {/* Card 2: Period Joined Members */}
              <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                    <UserPlus size={16} className="text-[#284F42] shrink-0" /> 기간 내 신규 가입
                  </span>
                  <span className="text-[11px] font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70 whitespace-nowrap">
                    선택 기간
                  </span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] my-1 whitespace-nowrap flex items-baseline gap-2">
                  <div>
                    {formatCurrency(summary.periodJoinedMembers)}<span className="text-lg font-bold text-[#5A6B63] ml-1">명</span>
                  </div>
                  {summary.todayJoinedMembers !== undefined && Number(summary.todayJoinedMembers) > 0 && (
                    <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-md border border-[#B4C6C1]/60">
                      오늘 +{formatCurrency(summary.todayJoinedMembers)}명
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-2 leading-relaxed border-t border-[#D0C6BB]/40 pt-2.5 font-medium flex items-center justify-between flex-wrap gap-1">
                  <span>조회 기간 내 신규 유입 회원 수</span>
                  {summary.todayJoinedMembers !== undefined && (
                    <span className="text-[#284F42] font-bold">당일 {formatCurrency(summary.todayJoinedMembers)}명</span>
                  )}
                </div>
              </div>

              {/* Card 3: Prior Year Comparison */}
              <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                    <TrendingUp size={16} className="text-[#B59269] shrink-0" /> 전년 동기 가입자
                  </span>
                  {summary.joinedGrowthRate !== undefined ? (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      summary.joinedGrowthRate >= 0 
                        ? 'text-[#1E523F] bg-[#E8F2EE] border-[#B4C6C1]/70' 
                        : 'text-[#8B2635] bg-[#FDF0ED] border-[#EAC5BD]'
                    }`}>
                      {summary.joinedGrowthRate >= 0 ? '▲' : '▼'} {Math.abs(summary.joinedGrowthRate)}%
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#5A6B63] bg-[#F4F3EE] px-2.5 py-0.5 rounded-full border border-[#D0C6BB]/60 whitespace-nowrap">
                      전년비 비교
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-[#1B382E] my-1 whitespace-nowrap flex items-baseline">
                  {formatCurrency(summary.lyPeriodJoinedMembers)}<span className="text-lg font-bold text-[#5A6B63] ml-1">명</span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-2 leading-relaxed border-t border-[#D0C6BB]/40 pt-2.5 font-medium" title="전년 동기간 신규 유입 대비 성장 추이">
                  전년 동기간 신규 유입 대비 성장 추이
                </div>
              </div>
              
              {/* Card 4: Channel Influx Breakdown */}
              <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all flex flex-col justify-between relative overflow-hidden min-h-[168px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#5A6B63] flex items-center gap-1.5 whitespace-nowrap">
                    <PieChart size={16} className="text-[#284F42] shrink-0" /> 부문별 신규 가입
                  </span>
                  <span className="text-[11px] font-bold text-[#1B382E] bg-[#F4F3EE] px-2.5 py-0.5 rounded-full border border-[#D0C6BB]/70 whitespace-nowrap">
                    채널 현황
                  </span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] my-1 whitespace-nowrap flex items-baseline gap-2">
                  <div>
                    {formatCurrency(summary.periodRoomJoined)}<span className="text-lg font-bold text-[#5A6B63] ml-1">명</span>
                  </div>
                  <span className="text-xs font-bold text-[#284F42] bg-[#E8F2EE] px-2 py-0.5 rounded-md border border-[#B4C6C1]/60">
                    객실
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6B63] mt-2 leading-relaxed border-t border-[#D0C6BB]/40 pt-2.5 font-medium flex items-center justify-between flex-wrap gap-1">
                  <span>티켓 <strong className="text-[#1B382E]">{formatCurrency(summary.periodTicketJoined || 0)}명</strong></span>
                  <span className="text-[#D0C6BB]">·</span>
                  <span>골프 <strong className="text-[#1B382E]">{formatCurrency(summary.periodGolfJoined || 0)}명</strong></span>
                </div>
              </div>
            </div>

            {/* Member Lifecycle & Deduplication Summary Banner */}
            <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
              <div className="bg-[#F4F3EE]/80 p-5 rounded-2xl border border-[#D0C6BB]/60">
                <div className="flex items-center gap-3.5 pb-4 border-b border-[#D0C6BB]/60">
                  <div className="w-11 h-11 rounded-2xl bg-[#E8F2EE] flex items-center justify-center shrink-0 border border-[#B4C6C1] shadow-2xs">
                    <Users size={22} className="text-[#1E523F]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold flex items-center gap-2 tracking-tight text-[#1B382E]">
                      온라인 회원 모수 & 활동·중복 구조 분석
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                        전수 실측
                      </span>
                    </h4>
                    <p className="text-xs text-[#5A6B63] mt-0.5">
                      총 {formatCurrency(summary.totalTransactions || 0)}건의 결제·예약 중 중복을 제거한 순수 {formatCurrency(summary.totalActiveMembers || 0)}명 분석
                      <span className="ml-1 text-[#5A6B63]/80 font-medium">(기준일: {isRangeMode && endDate ? `${startDate} ~ ${endDate}` : (startDate || '오늘')})</span>
                    </p>
                    <p className="text-[11px] text-[#5A6B63] mt-1 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-[#5A6B63]"></span>
                      기준일자 안내: 우측 상단 달력에서 설정한 {isRangeMode && endDate ? `조회 기간(${startDate} ~ ${endDate})` : `조회일(${startDate || '오늘'})`} 시점까지 누적된 전체 실적 및 회원 스냅샷입니다.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">총 결제/예약 거래</div>
                    <div className="text-base font-black text-[#1B382E] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.totalTransactions || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">건</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">반복·중복 거래</div>
                    <div className="text-base font-black text-[#B59269] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.duplicateTransactions || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">건</span>
                      {summary.duplicateRate !== undefined && (
                        <span className="text-[10px] text-[#B59269] ml-1 font-sans">(-{summary.duplicateRate}%)</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">최근 1년 실활동</div>
                    <div className="text-base font-black text-[#1E523F] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.recentActiveMembers || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">명</span>
                      <span className="text-[10px] text-[#1E523F] ml-1 font-sans">({summary.recentActiveRate || 0}%)</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">1년 이상 휴면</div>
                    <div className="text-base font-black text-[#5A6B63] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.dormantMembers || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">명</span>
                      <span className="text-[10px] text-[#5A6B63] ml-1 font-sans">({summary.dormantRate || 0}%)</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">2회 이상 재구매</div>
                    <div className="text-base font-black text-[#284F42] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.repeatBuyers || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">명</span>
                      {summary.repeatBuyerRate !== undefined && (
                        <span className="text-[10px] text-[#284F42] ml-1 font-sans">({summary.repeatBuyerRate}%)</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border-2 border-[#B59269] rounded-xl p-3 shadow-2xs">
                    <div className="text-[#B59269] text-[11px] font-bold">찐 재방문(5일+)</div>
                    <div className="text-base font-black text-[#B59269] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.trueRepeatBuyers || 0)}<span className="text-xs font-normal text-[#B59269] ml-0.5">명</span>
                      <span className="text-[10px] text-[#B59269] ml-1 font-sans">({summary.trueRepeatRate || 0}%)</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#D0C6BB]/60 rounded-xl p-3 shadow-2xs">
                    <div className="text-[#5A6B63] text-[11px] font-medium">단발성 1회 이용</div>
                    <div className="text-base font-black text-[#8B2635] mt-0.5 font-mono tabular-nums">
                      {formatCurrency(summary.oneTimeBuyers || 0)}<span className="text-xs font-normal text-[#5A6B63] ml-0.5">명</span>
                      {summary.oneTimeRate !== undefined && (
                        <span className="text-[10px] text-[#8B2635] ml-1 font-sans">({summary.oneTimeRate}%)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Royalty Funnel & Cross-Selling Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel Chart */}
              <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
                <h3 className="text-base font-bold text-[#1B382E] mb-2 flex items-center gap-2">
                  <Users size={18} className="text-[#284F42]" />
                  벨포레 고객 로열티 퍼널 분석
                </h3>
                <p className="text-xs text-[#5A6B63] mb-4">
                  단발성 결제에서 핵심 VIP(복합 이용) 충성 고객으로 전환되는 과정을 분석합니다.
                </p>
                <div className="h-[300px]">
                  <ReactECharts option={funnelOptions} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Cross Selling Analysis */}
              <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col">
                <h3 className="text-base font-bold text-[#1B382E] mb-2 flex items-center gap-2">
                  <RefreshCw size={18} className="text-[#284F42]" />
                  크로스셀링(Cross-selling) 전환 성과
                </h3>
                <p className="text-xs text-[#5A6B63] mb-4">
                  단일 시설만 이용하던 고객이 리조트의 여러 시설을 함께 즐기게 된 복합 전환율입니다.
                </p>
                <div className="flex-1 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-1/2 h-[220px]">
                    <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
                    <div className="p-4 bg-[#E8F2EE] rounded-2xl border border-[#B4C6C1]/70">
                      <div className="text-xs font-bold text-[#1E523F] mb-1">VIP 복합 이용 고객 비율</div>
                      <div className="text-2xl font-black text-[#284F42] flex items-baseline gap-1">
                        {channelBreakdown.multiChannelRatio || 0}<span className="text-sm">%</span>
                      </div>
                      <p className="text-[11px] text-[#1E523F]/80 mt-1">
                        객실, 골프, 티켓 중 2개 이상을 함께 구매한 충성 고객군입니다. ({formatCurrency(channelBreakdown.multiChannel || 0)}명)
                      </p>
                    </div>
                    <div className="p-4 bg-[#F4F3EE] rounded-2xl border border-[#D0C6BB]/70">
                      <div className="text-xs font-bold text-[#1B382E] mb-1">단일 채널 의존도 (이탈 위험군)</div>
                      <div className="text-xl font-bold text-[#5A6B63] flex items-baseline gap-1">
                        {channelBreakdown.singleChannelRatio != null ? (
                          <>{channelBreakdown.singleChannelRatio}<span className="text-sm">%</span></>
                        ) : (
                          '-'
                        )}
                      </div>
                      <p className="text-[11px] text-[#5A6B63] mt-1">
                        리조트에 방문하여 1가지 시설(예: 콘도만)만 이용하고 떠나는 고객 비중입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Stacked Area & Dual Axis Chart */}
            <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1B382E] flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#284F42]" />
                    일별 채널별 유입 기여도 vs 실활동(DAU) 트렌드
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-1">
                    어떤 채널(객실/티켓/골프)이 가입 폭증을 견인했는지 파악하고, 신규 가입과 실제 방문/결제 활동 간의 상관관계를 분석합니다.
                  </p>
                </div>
              </div>
              <div className="h-[350px]">
                <ReactECharts option={dualAxisDailyOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Monthly Comparison Table & Chart Section */}
            <div className="bg-white p-6 lg:p-8 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D0C6BB]/60">
                <div>
                  <h3 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
                    <CalendarDays size={20} className="text-[#284F42]" />
                    월별 온라인 가입자 실적 및 전년 동기 비교 (1월 ~ 12월)
                  </h3>
                  <p className="text-xs text-[#5A6B63] mt-1">
                    당해 연도와 전년 동월의 신규 가입자 수 및 전년비 증감률을 한눈에 비교 분석합니다.
                  </p>
                </div>

                {/* View Mode Toggle: Table vs Chart */}
                <div className="flex items-center gap-1 bg-[#F4F3EE] p-1 rounded-xl shrink-0 self-start sm:self-auto border border-[#D0C6BB]/60">
                  <button
                    type="button"
                    onClick={() => setMonthlyViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthlyViewMode === 'table'
                        ? 'bg-[#284F42] text-white shadow-2xs'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
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
                        ? 'bg-[#284F42] text-white shadow-2xs'
                        : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    <BarChart3 size={14} />
                    막대 그래프
                  </button>
                </div>
              </div>

              {monthlyViewMode === 'table' ? (
                /* Executive Monthly Comparison Matrix Table */
                <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                  <table className="w-full text-center text-sm border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75 text-xs">
                        <th className="px-4 py-3 text-left sticky left-0 bg-[#F4F3EE] z-10 w-36">구분 (연도)</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="px-2 py-3 font-extrabold text-[#1B382E] text-center">
                            {i + 1}월
                          </th>
                        ))}
                        <th className="px-4 py-3 bg-[#E8F2EE] text-[#1E523F] font-black sticky right-0 z-10 w-28 text-center">
                          {startDate && startDate.endsWith('-01-01') ? '누적 합계 (YTD)' : '조회 기간 합계'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/30 text-xs">
                      {/* Row 1: Current Year */}
                      <tr className="hover:bg-[#F4F3EE]/50 font-semibold transition-colors">
                        <td className="px-4 py-3.5 text-left sticky left-0 bg-white font-bold text-[#1B382E] flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#284F42] shrink-0"></span>
                          <span>당해 가입자</span>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                          const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                          const val = item?.joined ?? 0;
                          const isPastOrCurrent = (i + 1) <= currentMonthNum;
                          return (
                            <td key={i} className="px-2 py-3.5 font-bold text-[#1B382E] font-mono text-center">
                              {isPastOrCurrent ? (
                                <span className="text-[#1B382E]">{formatCurrency(val)}<span className="text-[10px] text-[#5A6B63] ml-0.5">명</span></span>
                              ) : (
                                <span className="text-[#5A6B63]/40">-</span>
                              )}
                            </td>
                          );
                        })}
                        {/* Cur YTD Total */}
                        <td className="px-4 py-3.5 bg-[#E8F2EE]/50 font-black text-[#1E523F] sticky right-0 font-mono text-sm text-center">
                          {summary.periodJoinedMembers !== undefined ? (
                            <>
                              {formatCurrency(summary.periodJoinedMembers)}
                              <span className="text-[11px] text-[#1E523F]/70 ml-0.5 font-sans font-medium">명</span>
                            </>
                          ) : (
                            <span className="text-[#5A6B63]/40">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Row 2: Prior Year */}
                      <tr className="hover:bg-[#F4F3EE]/50 text-[#5A6B63] transition-colors">
                        <td className="px-4 py-3.5 text-left sticky left-0 bg-white font-bold text-[#5A6B63] flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D0C6BB] shrink-0"></span>
                          <span>전년 동월</span>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                          const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                          const val = item?.lyJoined ?? 0;
                          return (
                            <td key={i} className="px-2 py-3.5 text-[#5A6B63] font-mono">
                              {val > 0 ? (
                                <span>{formatCurrency(val)}<span className="text-[10px] text-[#5A6B63]/60 ml-0.5">명</span></span>
                              ) : (
                                <span className="text-[#5A6B63]/40">-</span>
                              )}
                            </td>
                          );
                        })}
                        {/* Ly YTD Total */}
                        <td className="px-4 py-3.5 bg-[#F4F3EE] font-bold text-[#5A6B63] sticky right-0 font-mono text-sm">
                          {summary.lyPeriodJoinedMembers !== undefined ? (
                            <>
                              {formatCurrency(summary.lyPeriodJoinedMembers)}
                              <span className="text-[11px] text-[#5A6B63]/60 ml-0.5 font-sans font-medium">명</span>
                            </>
                          ) : (
                            <span className="text-[#5A6B63]/40">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Row 3: Difference (Δ) */}
                      <tr className="hover:bg-[#F4F3EE]/50 text-[#5A6B63] transition-colors">
                        <td className="px-4 py-3 text-left sticky left-0 bg-white font-bold text-[#1B382E]">
                          전년비 증감 (Δ)
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                          const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                          const isPastOrCurrent = (i + 1) <= currentMonthNum;
                          if (!isPastOrCurrent) {
                            return <td key={i} className="px-2 py-3 text-[#5A6B63]/40 font-mono">-</td>;
                          }
                          const curVal = item?.joined ?? 0;
                          const lyVal = item?.lyJoined ?? 0;
                          const diff = curVal - lyVal;
                          return (
                            <td key={i} className={`px-2 py-3 font-semibold font-mono ${
                              diff > 0 ? 'text-[#1E523F]' : diff < 0 ? 'text-[#8B2635]' : 'text-[#5A6B63]'
                            }`}>
                              {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}명
                            </td>
                          );
                        })}
                        {/* YTD Total Diff */}
                        {(() => {
                          if (summary.periodJoinedMembers === undefined || summary.lyPeriodJoinedMembers === undefined) {
                            return <td className="px-4 py-3 font-black sticky right-0 font-mono text-xs text-[#5A6B63]/40">-</td>;
                          }
                          const diffTotal = Number(summary.periodJoinedMembers) - Number(summary.lyPeriodJoinedMembers);
                          return (
                            <td className={`px-4 py-3 font-black sticky right-0 font-mono text-xs ${
                              diffTotal >= 0 ? 'text-[#1E523F] bg-[#E8F2EE]/60' : 'text-[#8B2635] bg-[#FDF0ED]/60'
                            }`}>
                              {diffTotal > 0 ? `+${formatCurrency(diffTotal)}` : formatCurrency(diffTotal)}명
                            </td>
                          );
                        })()}
                      </tr>

                      {/* Row 4: Growth Rate (%) */}
                      <tr className="hover:bg-[#F4F3EE]/50 border-t border-[#D0C6BB]/60 bg-[#F4F3EE]/30 transition-colors">
                        <td className="px-4 py-3 text-left sticky left-0 bg-[#F4F3EE] font-bold text-[#1B382E]">
                          전년비 증감률
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const moStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                          const item = trends.monthly.find((m: any) => m.month.endsWith(moStr));
                          const isPastOrCurrent = (i + 1) <= currentMonthNum;
                          if (!isPastOrCurrent) {
                            return <td key={i} className="px-2 py-3 text-[#5A6B63]/40 font-mono">-</td>;
                          }
                          const rate = item?.growthRate ?? item?.growth_rate ?? null;
                          return (
                            <td key={i} className="px-2 py-3">
                              {rate !== null ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                                  rate > 0 
                                    ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70' 
                                    : rate < 0 
                                    ? 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]/70' 
                                    : 'bg-[#F4F3EE] text-[#5A6B63]'
                                }`}>
                                  {rate > 0 ? `▲ ${rate}%` : rate < 0 ? `▼ ${Math.abs(rate)}%` : '0.0%'}
                                </span>
                              ) : (
                                <span className="text-[#5A6B63]/40 font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                        {/* YTD Total Growth Rate */}
                        {(() => {
                          const rateTotal = summary.joinedGrowthRate ?? summary.growthRate ?? null;
                          return (
                            <td className="px-4 py-3 sticky right-0 bg-[#F4F3EE]">
                              {rateTotal !== null ? (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                  rateTotal >= 0 
                                    ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]' 
                                    : 'bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]'
                                }`}>
                                  {rateTotal >= 0 ? `▲ ${rateTotal}%` : `▼ ${Math.abs(rateTotal)}%`}
                                </span>
                              ) : (
                                <span className="text-[#5A6B63]/40 font-mono">-</span>
                              )}
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
            <div className="bg-white p-6 lg:p-8 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <h3 className="text-base font-bold text-[#1B382E] mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#284F42]" />
                최근 가입/활동 회원 목록
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                    <tr>
                      <th className="px-4 py-3 text-left">고객명</th>
                      <th className="px-4 py-3 text-left">연락처</th>
                      <th className="px-4 py-3 text-left">가입 채널</th>
                      <th className="px-4 py-3 text-left">최초 활동일</th>
                      <th className="px-4 py-3 text-left">최근 활동일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {recentMembers.slice(0, 10).map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F4F3EE]/50 text-[#1B382E] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1B382E]">{m.custName}</td>
                        <td className="px-4 py-3 text-[#5A6B63] font-mono text-xs">{m.phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/60 rounded-md text-xs font-bold">
                            {m.firstChannel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5A6B63]">{m.firstActivityDate}</td>
                        <td className="px-4 py-3 text-[#5A6B63]">{m.lastActivityDate || m.firstActivityDate}</td>
                      </tr>
                    ))}
                    {recentMembers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#5A6B63]">
                          조회된 회원 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* [Ticket 35] 온라인 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back 타겟) 리텐션 분석 */}
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="p-6 border-b border-[#D0C6BB]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#E8F2EE] via-white to-[#F4F3EE]">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#284F42] text-white shadow-2xs shrink-0 mt-0.5">
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-[#1B382E]">
                        온라인 회원 이용횟수 등급별 분포 및 6개월 미방문 휴면 단골(Win-back) 리텐션 분석
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                        온라인 회원 분석
                      </span>
                    </div>
                    <p className="text-xs text-[#5A6B63] mt-1">
                      통합 온라인 회원 데이터베이스의 누적 활동 횟수 등급(단발 · 재방문 · 단골 · 충성고객)과 최종 활동일 기준 6개월 이상 미방문 휴면 전환 단골을 핀셋 추출합니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dormancyIntel ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                      정규 마트 연동 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FDF0ED] text-[#8B2635] border border-[#EAC5BD]">
                      Fail-Stop · 조회 구간 데이터 없음 (/api/v6/report/online-member-dormancy)
                    </span>
                  )}
                </div>
              </div>

              {!dormancyIntel ? (
                <div className="p-8 bg-[#F4F3EE]/50">
                  <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-[#D0C6BB] p-6 text-center space-y-3">
                    <h4 className="text-sm font-extrabold text-[#1B382E]">
                      [Zero-Fake / Fail-Stop] 온라인 단골 휴면(Churn Risk) 및 Win-back 타겟 조회 데이터 없음
                    </h4>
                    <p className="text-xs text-[#5A6B63] leading-relaxed">
                      백엔드 <code className="px-1.5 py-0.5 bg-[#F4F3EE] rounded text-[#1B382E] font-mono border border-[#D0C6BB]/60">GET /api/v6/report/online-member-dormancy</code> 응답 데이터가 없거나 비어 있을 경우 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                      <div className="p-3.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                        <div className="text-[11px] font-bold text-[#5A6B63]">단골 등급 회원 (4~9회)</div>
                        <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                        <div className="text-[10px] text-[#5A6B63] mt-0.5">6개월 미방문 휴면 비율 집계 대기</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                        <div className="text-[11px] font-bold text-[#5A6B63]">충성 등급 회원 (10회+)</div>
                        <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                        <div className="text-[10px] text-[#5A6B63] mt-0.5">최상위 VIP 이탈 감지 대기</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                        <div className="text-[11px] font-bold text-[#5A6B63]">핀셋 Win-back 타겟 모수</div>
                        <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                        <div className="text-[10px] text-[#5A6B63] mt-0.5">4회 이상 방문 후 6개월 휴면 단골</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                        <div className="text-[11px] font-bold text-[#5A6B63]">복합 채널(2+) 이용 VIP</div>
                        <div className="text-base font-black text-[#5A6B63] mt-1">-</div>
                        <div className="text-[10px] text-[#5A6B63] mt-0.5">객실·골프·티켓 교차 회원 집계 대기</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                      <div className="text-xs font-bold text-[#5A6B63]">전체 온라인 통합 회원</div>
                      <div className="text-xl font-black text-[#1B382E] mt-1">
                        {(dormancyIntel.summary?.totalOnlineMembers ?? dormancyIntel.summary?.totalMembers) != null ? `${Number(dormancyIntel.summary?.totalOnlineMembers ?? dormancyIntel.summary?.totalMembers).toLocaleString()}명` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        최근 6개월 활성: {(dormancyIntel.summary?.activeMembers ?? dormancyIntel.summary?.activeWithin6m) != null ? `${Number(dormancyIntel.summary?.activeMembers ?? dormancyIntel.summary?.activeWithin6m).toLocaleString()}명` : '-'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                      <div className="text-xs font-bold text-[#5A6B63]">단골 회원 (4~9회 방문) 휴면율</div>
                      <div className="text-xl font-black text-[#8B2635] mt-1">
                        {(dormancyIntel.summary?.regularDormantRatePct ?? dormancyIntel.tiers?.[2]?.dormancyRate ?? dormancyIntel.tiers?.[2]?.dormantRatePct) != null ? `${dormancyIntel.summary?.regularDormantRatePct ?? dormancyIntel.tiers?.[2]?.dormancyRate ?? dormancyIntel.tiers?.[2]?.dormantRatePct}%` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        휴면 단골: {dormancyIntel.summary?.regularDormantCount != null ? `${Number(dormancyIntel.summary.regularDormantCount).toLocaleString()}명` : '-'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                      <div className="text-xs font-bold text-[#5A6B63]">충성 고객 (10회+ 방문) 휴면율</div>
                      <div className="text-xl font-black text-[#B59269] mt-1">
                        {(dormancyIntel.summary?.loyalDormantRatePct ?? dormancyIntel.tiers?.[3]?.dormancyRate ?? dormancyIntel.tiers?.[3]?.dormantRatePct) != null ? `${dormancyIntel.summary?.loyalDormantRatePct ?? dormancyIntel.tiers?.[3]?.dormancyRate ?? dormancyIntel.tiers?.[3]?.dormantRatePct}%` : '-'}
                      </div>
                      <div className="text-[11px] text-[#5A6B63] mt-1">
                        휴면 충성고객: {dormancyIntel.summary?.loyalDormantCount != null ? `${Number(dormancyIntel.summary.loyalDormantCount).toLocaleString()}명` : '-'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#E8F2EE] border border-[#B4C6C1]">
                      <div className="text-xs font-bold text-[#1E523F]">핵심 단골 Win-back 핀셋 타겟</div>
                      <div className="text-xl font-black text-[#284F42] mt-1">
                        {(dormancyIntel.summary?.winbackTargetsTotal ?? dormancyIntel.summary?.winbackTargetCount) != null ? `${Number(dormancyIntel.summary?.winbackTargetsTotal ?? dormancyIntel.summary?.winbackTargetCount).toLocaleString()}명` : '-'}
                      </div>
                      <div className="text-[11px] text-[#1E523F] mt-1">
                        4회 이상 방문 이력 보유 · 6개월 미방문
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D0C6BB]/75 overflow-hidden">
                    <div className="px-4 py-3 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1B382E]">이용 횟수 등급별 회원 분포 및 6개월 미방문 휴면 전환율</span>
                      <span className="text-[11px] text-[#5A6B63]">dim_online_members_v6 기준</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F4F3EE]/80 text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                          <tr>
                            <th className="py-2.5 px-4 text-left font-bold">이용 횟수 등급</th>
                            <th className="py-2.5 px-4 text-right font-bold">전체 회원수</th>
                            <th className="py-2.5 px-4 text-right font-bold">회원 비중</th>
                            <th className="py-2.5 px-4 text-right font-bold">최근 6개월 활성</th>
                            <th className="py-2.5 px-4 text-right font-bold">6개월+ 미방문 휴면</th>
                            <th className="py-2.5 px-4 text-right font-bold">휴면 전환율</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D0C6BB]/30">
                          {(dormancyIntel.tiers || []).map((tier: any, idx: number) => (
                            <tr key={tier.tierName || idx} className="hover:bg-[#F4F3EE]/50 text-[#1B382E]">
                              <td className="py-3 px-4 font-bold text-[#1B382E]">{tier.tierName ?? '-'}</td>
                              <td className="py-3 px-4 text-right font-semibold text-[#1B382E]">
                                {(tier.totalMembers ?? tier.memberCount) != null ? `${Number(tier.totalMembers ?? tier.memberCount).toLocaleString()}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#5A6B63]">
                                {(tier.memberShare ?? tier.avgActivities) != null ? `${tier.memberShare ?? tier.avgActivities}%` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#1E523F] font-semibold">
                                {(tier.activeMembers ?? tier.active6mCount) != null ? `${Number(tier.activeMembers ?? tier.active6mCount).toLocaleString()}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#8B2635] font-bold">
                                {(tier.dormantMembers ?? tier.dormant6mCount) != null ? `${Number(tier.dormantMembers ?? tier.dormant6mCount).toLocaleString()}명` : '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-[#8B2635]">
                                {(tier.dormancyRate ?? tier.dormantRatePct) != null ? `${tier.dormancyRate ?? tier.dormantRatePct}%` : '-'}
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
          </>
        )}
      </div>
    </div>
  );
}
