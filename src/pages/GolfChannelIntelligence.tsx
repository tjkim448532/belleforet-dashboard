import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import {
  Flag,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Clock,
  Coins,
  Users
} from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// ----------------------------------------------------------------------
// Types & Interfaces (Bible v4.2 camelCase 준수)
// ----------------------------------------------------------------------
export interface ChannelSummaryItem {
  channelName: string;
  channelType: 'DIRECT' | 'OTA' | 'OFFLINE';
  teams: number;
  players: number;
  revenue: number;
  avgGreenFee: number;
  discountRate: number;
  sharePct: number;
}

export interface JoinChannelRankItem {
  channelName: string;
  teams: number;
  players: number;
  sharePct: number;
  avgGreenFee: number;
}

export interface MonthlyYoyTrendItem {
  month: number;
  monthName: string;
  y2024: { teams: number; avgGreenFee: number; revenue: number };
  y2025: { teams: number; avgGreenFee: number; revenue: number };
  y2026: { teams: number; avgGreenFee: number; revenue: number };
}

export interface GolfIntelligenceData {
  summary: {
    totalTeams: number;
    totalPlayers: number;
    totalGreenFeeRevenue: number;
    averageGreenFee: number;
    threePlayerTeamsCount: number;
    threePlayerLostRevenue: number;
    joinTeamsCount: number;
    memberAnchorRevenue: number;
  };
  channels: ChannelSummaryItem[];
  teamSize: {
    size1: { teams: number; ratio: number };
    size2: { teams: number; ratio: number };
    size3: { teams: number; ratio: number; lostRevenue: number };
    size4: { teams: number; ratio: number };
    joinRanking: JoinChannelRankItem[];
  };
  memberSynergy: {
    pureNonMember: { teams: number; ratio: number; revenue: number };
    member1Non3: { teams: number; ratio: number; nonMemberRevenue: number };
    member2Non2: { teams: number; ratio: number; nonMemberRevenue: number };
    member3to4: { teams: number; ratio: number; revenue: number };
    totalAnchorRevenue: number;
  };
  timeSlotYield: {
    dayOfWeek: string;
    timeSlot: string;
    timeSlotIndex: number;
    dayIndex: number;
    occupancy: number;
    avgGreenFee: number;
  }[];
  monthlyYoy: MonthlyYoyTrendItem[];
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// 실측 DB 기반 완성형 기본 데이터셋 (Zero-Variance SSOT Fallback)
// ----------------------------------------------------------------------
const EMPTY_INTELLIGENCE_DATA: GolfIntelligenceData = {
  summary: {
    totalTeams: 0,
    totalPlayers: 0,
    totalGreenFeeRevenue: 0,
    averageGreenFee: 0,
    threePlayerTeamsCount: 0,
    threePlayerLostRevenue: 0,
    joinTeamsCount: 0,
    memberAnchorRevenue: 0
  },
  channels: [],
  teamSize: {
    size1: { teams: 0, ratio: 0 },
    size2: { teams: 0, ratio: 0 },
    size3: { teams: 0, ratio: 0, lostRevenue: 0 },
    size4: { teams: 0, ratio: 0 },
    joinRanking: []
  },
  memberSynergy: {
    pureNonMember: { teams: 0, ratio: 0, revenue: 0 },
    member1Non3: { teams: 0, ratio: 0, nonMemberRevenue: 0 },
    member2Non2: { teams: 0, ratio: 0, nonMemberRevenue: 0 },
    member3to4: { teams: 0, ratio: 0, revenue: 0 },
    totalAnchorRevenue: 0
  },
  timeSlotYield: [],
  monthlyYoy: []
};

export default function GolfChannelIntelligence() {
  const { startDate, endDate, isRange } = useDate();
  const isRangeMode = Boolean(isRange && endDate && startDate !== endDate);
  const [viewScope, setViewScope] = useState<'SELECTED_DATE' | 'FULL_ASSET'>('SELECTED_DATE');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<GolfIntelligenceData>(EMPTY_INTELLIGENCE_DATA);
  const [selectedYoyYear, setSelectedYoyYear] = useState<string>('2026');
  const [channelSortBy, setChannelSortBy] = useState<'AVG_GREEN_FEE' | 'PLAYERS'>('AVG_GREEN_FEE');
  const [tableSortKey, setTableSortKey] = useState<'avgGreenFee' | 'revenue' | 'players' | 'teams'>('avgGreenFee');
  const [tableSortDesc, setTableSortDesc] = useState<boolean>(true);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (viewScope === 'FULL_ASSET') {
        queryParams.append('startDate', '2026-01-01');
        queryParams.append('endDate', endDate || startDate || '2026-09-26');
      } else {
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
      }

      // Parallel fetch: 1) Golf channel intelligence SSOT, 2) Facility monthly trend (그린피)
      const [res, trendRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/golf-channel-intelligence?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/facility-monthly-trend?facility=${encodeURIComponent('그린피')}&endDate=${startDate || '2026-09-26'}`).catch(() => null)
      ]);

      // Process Monthly YoY from real DB facility-monthly-trend
      const monthlyList = Array.isArray(trendRes?.data?.monthlyData) ? trendRes.data.monthlyData : [];
      const realMonthlyYoy = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const mStr = String(m).padStart(2, '0');
        const findYearData = (y: string) => {
          const item = monthlyList.find((d: any) => d.month === `${y}-${mStr}`);
          const rev = Number(item?.revenue || 0);
          const visitors = Number(item?.visitors || 0);
          const teams = visitors > 0 ? Math.round(visitors / 4) : 0;
          const avgGreenFee = visitors > 0 ? Math.round(rev / visitors) : 0;
          return { teams, avgGreenFee, revenue: rev };
        };
        return {
          month: m,
          monthName: `${m}월`,
          y2024: findYearData('2024'),
          y2025: findYearData('2025'),
          y2026: findYearData('2026')
        };
      });

      if (res && res.success && (res.channels || res.data?.channels)) {
        const payload = res.data || res;
        const liveSummary = payload.summary || {};
        const liveChannels = Array.isArray(payload.channels) ? payload.channels : [];
        const totalTeams = Number(liveSummary.totalTeams || 0);
        const totalPlayers = Number(liveSummary.totalPlayers || 0);
        const totalGreenFeeRevenue = Number(liveSummary.totalGreenFeeRevenue || liveSummary.revenue || 0);
        const averageGreenFee = Number(liveSummary.averageGreenFee || (totalPlayers > 0 ? Math.round(totalGreenFeeRevenue / totalPlayers) : 0));

        const threePlayerTeamsCount = Number(liveSummary.threePlayerTeamsCount || 0);
        const threePlayerLostRevenue = Number(liveSummary.threePlayerLostRevenue || 0);
        const joinTeamsCount = Number(liveSummary.joinTeamsCount || 0);
        const memberAnchorRevenue = Number(liveSummary.memberAnchorRevenue || 0);

        const joinRankingList = Array.isArray(payload.joinRanking) ? payload.joinRanking : [];
        const totalJoinPlayers = joinRankingList.reduce((sum: number, j: any) => sum + Number(j.players || 0), 0);
        const size2Teams = Math.max(0, Math.min(joinTeamsCount, totalJoinPlayers - joinTeamsCount));
        const size1Teams = Math.max(0, joinTeamsCount - size2Teams);
        const normalFourTeams = Math.max(0, totalTeams - threePlayerTeamsCount - joinTeamsCount);

        setData({
          summary: {
            totalTeams,
            totalPlayers,
            totalGreenFeeRevenue,
            averageGreenFee,
            threePlayerTeamsCount,
            threePlayerLostRevenue,
            joinTeamsCount,
            memberAnchorRevenue
          },
          channels: liveChannels,
          teamSize: payload.teamSize || {
            size1: { teams: size1Teams, ratio: totalTeams > 0 ? Number(((size1Teams / totalTeams) * 100).toFixed(1)) : 0 },
            size2: { teams: size2Teams, ratio: totalTeams > 0 ? Number(((size2Teams / totalTeams) * 100).toFixed(1)) : 0 },
            size3: { teams: threePlayerTeamsCount, ratio: totalTeams > 0 ? Number(((threePlayerTeamsCount / totalTeams) * 100).toFixed(1)) : 0, lostRevenue: threePlayerLostRevenue },
            size4: { teams: normalFourTeams, ratio: totalTeams > 0 ? Number(((normalFourTeams / totalTeams) * 100).toFixed(1)) : 0 },
            joinRanking: joinRankingList
          },
          memberSynergy: payload.memberSynergy || {
            pureNonMember: { teams: 0, ratio: 0, revenue: 0 },
            member1Non3: { teams: 0, ratio: 0, nonMemberRevenue: memberAnchorRevenue },
            member2Non2: { teams: 0, ratio: 0, nonMemberRevenue: 0 },
            member3to4: { teams: 0, ratio: 0, revenue: 0 },
            totalAnchorRevenue: memberAnchorRevenue
          },
          timeSlotYield: Array.isArray(payload.timeSlotYield) ? payload.timeSlotYield : [],
          monthlyYoy: realMonthlyYoy
        });
        setLoading(false);
        return;
      }

      setData({
        ...EMPTY_INTELLIGENCE_DATA,
        monthlyYoy: realMonthlyYoy
      });
    } catch (err) {
      console.error('Golf Channel Intelligence Fetch Error:', err);
      setData(EMPTY_INTELLIGENCE_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, [startDate, endDate, isRangeMode, viewScope]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));
  };

  // --------------------------------------------------------------------
  // Chart 1: [수익성 평가] 채널별 예약 기여도 vs 실현 평균 그린피 매트릭스
  // --------------------------------------------------------------------
  const getChannelProfitabilityOption = () => {
    const sorted = [...data.channels].sort((a, b) => {
      if (channelSortBy === 'AVG_GREEN_FEE') {
        return b.avgGreenFee - a.avgGreenFee;
      }
      return b.players - a.players;
    });
    const channelNames = sorted.map(c => c.channelName);
    const playersData = sorted.map(c => c.players);
    const greenFeeData = sorted.map(c => c.avgGreenFee);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const target = sorted[idx];
          return `
            <div style="font-weight:700;margin-bottom:6px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
              ${target.channelName} <span style="font-size:11px;font-weight:normal;color:#64748b;">(${target.channelType})</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;padding:2px 0;">
              <span style="color:#64748b;">내장객수:</span>
              <strong style="color:#0f172a;">${target.players.toLocaleString()}명 (${target.teams.toLocaleString()}팀)</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;padding:2px 0;">
              <span style="color:#64748b;">평균 그린피:</span>
              <strong style="color:#d97706;font-size:13px;">₩${formatCurrency(target.avgGreenFee)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;padding:2px 0;">
              <span style="color:#64748b;">할인율:</span>
              <strong style="color:${target.discountRate > 15 ? '#e11d48' : '#10b981'};">${target.discountRate}%</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;padding:2px 0;">
              <span style="color:#64748b;">총 그린피 매출:</span>
              <strong style="color:#2563eb;">₩${formatCurrency(target.revenue)}</strong>
            </div>
          `;
        }
      },
      legend: { data: ['내장객 수 (명)', '1인당 실현 평균 그린피 (원)'], top: 0 },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '70px', containLabel: true },
      xAxis: [{
        type: 'category',
        data: channelNames,
        axisLabel: { interval: 0, rotate: 32, fontSize: 11, color: '#475569', overflow: 'break' }
      }],
      yAxis: [
        { type: 'value', name: '내장객 수 (명)', axisLabel: { formatter: '{value}명' } },
        { 
          type: 'value', 
          name: '평균 그린피 (원)', 
          min: (val: any) => Math.max(0, Math.floor((val.min * 0.9) / 10000) * 10000),
          max: (val: any) => Math.ceil((val.max * 1.1) / 10000) * 10000,
          axisLabel: { formatter: (val: number) => `₩${(val / 10000).toFixed(0)}만` },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '내장객 수 (명)',
          type: 'bar',
          data: playersData,
          itemStyle: {
            color: (params: any) => {
              const ch = sorted[params.dataIndex];
              return ch.channelType === 'DIRECT' ? '#00ae95' : '#64748b';
            },
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => `${p.value.toLocaleString()}명`,
            fontSize: 10,
            color: '#64748b'
          }
        },
        {
          name: '1인당 실현 평균 그린피 (원)',
          type: 'line',
          yAxisIndex: 1,
          data: greenFeeData,
          symbolSize: 8,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3, color: '#f59e0b' },
          label: {
            show: true,
            position: 'top',
            distance: 8,
            formatter: (p: any) => `₩${(p.value / 10000).toFixed(1)}만`,
            fontSize: 10,
            fontWeight: 'bold',
            color: '#b45309',
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            borderWidth: 1,
            padding: [2, 5],
            borderRadius: 4
          }
        }
      ]
    };
  };

  // --------------------------------------------------------------------
  // Chart 2: 팀 구성 분포 도넛 차트
  // --------------------------------------------------------------------
  const getTeamSizeDonutOption = () => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `
          <strong>${params.name}</strong><br/>
          팀 수: <strong>${params.value.toLocaleString()}팀</strong> (${params.percent}%)
        `
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemGap: 14,
        textStyle: { fontSize: 11, color: '#475569' }
      },
      series: [
        {
          name: '팀 구성 인원',
          type: 'pie',
          radius: ['38%', '60%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: {
            show: true,
            position: 'outside',
            formatter: (params: any) => `${params.name}\n${params.percent}% (${params.value.toLocaleString()}팀)`,
            fontSize: 11,
            lineHeight: 15,
            color: '#1e293b'
          },
          labelLayout: {
            moveOverlap: 'shiftY'
          },
          labelLine: {
            length: 12,
            length2: 10,
            smooth: true
          },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' }
          },
          data: [
            { value: data.teamSize.size4.teams, name: '4인 정상 플레이', itemStyle: { color: '#00ae95' } },
            { value: data.teamSize.size3.teams, name: '3인 플레이 (공실)', itemStyle: { color: '#f43f5e' } },
            { value: data.teamSize.size1.teams, name: '1인 조인', itemStyle: { color: '#3b82f6' } },
            { value: data.teamSize.size2.teams, name: '2인 조인', itemStyle: { color: '#8b5cf6' } }
          ]
        }
      ]
    };
  };

  // --------------------------------------------------------------------
  // Chart 3: 🌟 조인(1~2인) 고객 주 이용 판매 채널 랭킹
  // --------------------------------------------------------------------
  const getJoinChannelOption = () => {
    const activeList = data.teamSize.joinRanking.filter(i => i.teams > 0);
    const list = [...(activeList.length > 0 ? activeList : data.teamSize.joinRanking.slice(0, 5))].reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = list[params[0].dataIndex];
          return `
            <strong>${item.channelName}</strong><br/>
            조인 예약 팀수: <strong>${item.teams.toLocaleString()}팀</strong> (${item.sharePct}%)<br/>
            조인 내장객수: <strong>${item.players.toLocaleString()}명</strong><br/>
            평균 결제 그린피: <strong>₩${formatCurrency(item.avgGreenFee)}</strong>
          `;
        }
      },
      grid: { left: '3%', right: '28%', top: '6%', bottom: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        max: (value: any) => Math.max(1, Math.ceil(value.max * 1.15)),
        axisLabel: { formatter: '{value}팀' }
      },
      yAxis: {
        type: 'category',
        data: list.map(i => i.channelName),
        axisLabel: { fontWeight: 'bold', color: '#334155' }
      },
      series: [
        {
          name: '조인 팀 수',
          type: 'bar',
          data: list.map(i => i.teams),
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const item = list[params.dataIndex];
              return `${item.teams.toLocaleString()}팀 (${item.sharePct}%) · ₩${(item.avgGreenFee / 10000).toFixed(1)}만`;
            },
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1e293b'
          }
        }
      ]
    };
  };

  // --------------------------------------------------------------------
  // Chart 4: 회원 앵커 효과 100% 누적 가로 막대
  // --------------------------------------------------------------------
  const getMemberSynergyOption = () => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `
          <strong>${params.name}</strong><br/>
          팀 수: <strong>${params.value.toLocaleString()}팀</strong> (${params.percent}%)
        `
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemGap: 12,
        textStyle: { fontSize: 11, color: '#475569' }
      },
      series: [
        {
          name: '회원 동반 팀 구조',
          type: 'pie',
          radius: ['38%', '58%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          data: [
            { value: data.memberSynergy.pureNonMember.teams, name: '순수 비회원 (4인)', itemStyle: { color: '#94a3b8' } },
            { value: data.memberSynergy.member1Non3.teams, name: '회원 1명 + 동반 3명', itemStyle: { color: '#00ae95' } },
            { value: data.memberSynergy.member2Non2.teams, name: '회원 2명 + 동반 2명', itemStyle: { color: '#0284c7' } },
            { value: data.memberSynergy.member3to4.teams, name: '회원 3~4인 팀', itemStyle: { color: '#6366f1' } }
          ],
          label: {
            show: true,
            position: 'outside',
            formatter: (params: any) => `${params.name}\n${params.percent}% (${params.value.toLocaleString()}팀)`,
            fontSize: 11,
            lineHeight: 15,
            color: '#1e293b'
          },
          labelLayout: {
            moveOverlap: 'shiftY'
          },
          labelLine: {
            length: 12,
            length2: 10,
            smooth: true
          },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' }
          }
        }
      ]
    };
  };

  // --------------------------------------------------------------------
  // Chart 5: 티업 시간대별 가동률 & 그린피 2D 히트맵
  // --------------------------------------------------------------------
  // Chart 4: 티업 시간대별 수율 관리 2D 히트맵 (시간대 × 요일)
  // --------------------------------------------------------------------
  const getTimeSlotHeatmapOption = () => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const timeSlots = ['06~08 (얼리)', '08~11 (1부)', '11~14 (2부)', '14~ (레이트)'];

    const heatmapData = data.timeSlotYield.map(item => {
      return [item.timeSlotIndex, item.dayIndex, item.occupancy, item.avgGreenFee, (item as any).teams || 0];
    });

    return {
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#ffffff' },
        formatter: (params: any) => {
          const val = params.value;
          return `
            <div style="font-weight:700;margin-bottom:6px;color:#ffffff;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px;font-size:13px;">
              ${days[val[1]]}요일 · ${timeSlots[val[0]]}
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:16px;color:#38bdf8;padding:2px 0;">
              <span>티타임 가동률:</span>
              <strong style="color:#ffffff;">${val[2]}%</strong>
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:16px;color:#fbbf24;padding:2px 0;">
              <span>평균 그린피:</span>
              <strong style="color:#ffffff;">₩${formatCurrency(val[3])}</strong>
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:16px;color:#94a3b8;padding:2px 0;">
              <span>완주 팀수:</span>
              <strong style="color:#ffffff;">${(val[4] || 0).toLocaleString()}팀</strong>
            </div>
          `;
        }
      },
      grid: { left: '3%', right: '4%', top: '4%', bottom: '50px', containLabel: true },
      xAxis: {
        type: 'category',
        data: timeSlots,
        splitArea: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontWeight: 'bold', color: '#1e293b', fontSize: 12, margin: 12 }
      },
      yAxis: {
        type: 'category',
        data: days,
        inverse: true, // 월요일이 맨 위, 일요일이 맨 아래 (자연스러운 캘린더 읽기 순서)
        splitArea: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          fontWeight: 'bold', 
          fontSize: 13,
          margin: 12,
          formatter: (value: string) => {
            if (value === '일') return '{sun|일}';
            if (value === '토') return '{sat|토}';
            return `{weekday|${value}}`;
          },
          rich: {
            sun: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
            sat: { color: '#2563eb', fontWeight: 'bold', fontSize: 13 },
            weekday: { color: '#334155', fontWeight: 'bold', fontSize: 13 }
          }
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 16,
        itemHeight: 180,
        text: ['100%', '0%'],
        textGap: 10,
        textStyle: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
        inRange: {
          color: ['#f0fdf4', '#bae6fd', '#38bdf8', '#0284c7', '#1e40af', '#0f172a']
        }
      },
      series: [
        {
          name: '가동률 (%)',
          type: 'heatmap',
          data: heatmapData,
          itemStyle: {
            borderWidth: 4,
            borderColor: '#ffffff',
            borderRadius: 8
          },
          label: {
            show: true,
            formatter: (p: any) => {
              const val = p.value[2];
              if (!val || val === 0) return '{empty|-}';
              return val >= 60 ? `{light|${val}%}` : `{dark|${val}%}`;
            },
            rich: {
              light: {
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: 13,
                textShadowColor: 'rgba(0, 0, 0, 0.45)',
                textShadowBlur: 3
              },
              dark: {
                color: '#0f172a',
                fontWeight: 'bold',
                fontSize: 13
              },
              empty: {
                color: '#94a3b8',
                fontSize: 12
              }
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: '#0284c7',
              borderWidth: 2
            }
          }
        }
      ]
    };
  };

  // --------------------------------------------------------------------
  // Chart 6: 🌟 2024, 2025, 2026~ 연도별 & 월별 그린피 및 이용 팀 수 추이 (YoY)
  // --------------------------------------------------------------------
  const getMonthlyYoyOption = () => {
    const months = data.monthlyYoy.map(m => m.monthName);
    const teams2024 = data.monthlyYoy.map(m => m.y2024.teams);
    const teams2025 = data.monthlyYoy.map(m => m.y2025.teams);
    const teams2026 = data.monthlyYoy.map(m => m.y2026.teams);

    const gf2024 = data.monthlyYoy.map(m => m.y2024.avgGreenFee);
    const gf2025 = data.monthlyYoy.map(m => m.y2025.avgGreenFee);
    const gf2026 = data.monthlyYoy.map(m => m.y2026.avgGreenFee);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const row = data.monthlyYoy[idx];
          return `
            <div style="font-weight:700;margin-bottom:6px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
              ${row.monthName} 실적 비교 (YoY)
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:12px;color:#64748b;">
              <span>2024년:</span>
              <strong style="color:#0f172a;">${row.y2024.teams > 0 ? `${row.y2024.teams.toLocaleString()}팀 (₩${formatCurrency(row.y2024.avgGreenFee)})` : '-'}</strong>
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:12px;color:#0284c7;">
              <span>2025년:</span>
              <strong>${row.y2025.teams.toLocaleString()}팀 (₩${formatCurrency(row.y2025.avgGreenFee)})</strong>
            </div>
            <div style="font-size:12px;display:flex;justify-content:space-between;gap:12px;color:#00ae95;">
              <span>2026년:</span>
              <strong>${row.y2026.teams > 0 ? `${row.y2026.teams.toLocaleString()}팀 (₩${formatCurrency(row.y2026.avgGreenFee)})` : '집계 대기'}</strong>
            </div>
          `;
        }
      },
      legend: {
        data: ['24년 팀수', '25년 팀수', '26년 팀수', '24년 평균 그린피', '25년 평균 그린피', '26년 평균 그린피'],
        bottom: 2,
        type: 'scroll'
      },
      grid: { left: '3%', right: '4%', top: '12%', bottom: '60px', containLabel: true },
      xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
      yAxis: [
        { type: 'value', name: '이용 팀 수', axisLabel: { formatter: '{value}팀' } },
        { 
          type: 'value', 
          name: '평균 그린피 (원)', 
          min: (val: any) => Math.max(0, Math.floor((val.min * 0.9) / 10000) * 10000),
          max: (val: any) => Math.ceil((val.max * 1.1) / 10000) * 10000,
          axisLabel: { formatter: (val: number) => `₩${(val / 10000).toFixed(0)}만` },
          splitLine: { show: false }
        }
      ],
      series: [
        { name: '24년 팀수', type: 'bar', data: teams2024, itemStyle: { color: '#94a3b8' } },
        { name: '25년 팀수', type: 'bar', data: teams2025, itemStyle: { color: '#0284c7' } },
        { name: '26년 팀수', type: 'bar', data: teams2026, itemStyle: { color: '#00ae95' } },
        { name: '24년 평균 그린피', type: 'line', yAxisIndex: 1, data: gf2024, lineStyle: { type: 'dashed', color: '#64748b' } },
        { name: '25년 평균 그린피', type: 'line', yAxisIndex: 1, data: gf2025, lineStyle: { type: 'dashed', color: '#0369a1' } },
        { name: '26년 평균 그린피', type: 'line', yAxisIndex: 1, data: gf2026, lineStyle: { width: 3, color: '#10b981' } }
      ]
    };
  };

  const directChannels = data.channels.filter(c => c.channelType === 'DIRECT');
  const otaChannels = data.channels.filter(c => c.channelType === 'OTA');
  const directPlayers = directChannels.reduce((sum, c) => sum + c.players, 0);
  const directRevenue = directChannels.reduce((sum, c) => sum + c.revenue, 0);
  const directAvg = directPlayers > 0 ? Math.round(directRevenue / directPlayers) : 0;

  const otaPlayers = otaChannels.reduce((sum, c) => sum + c.players, 0);
  const otaRevenue = otaChannels.reduce((sum, c) => sum + c.revenue, 0);
  const otaAvg = otaPlayers > 0 ? Math.round(otaRevenue / otaPlayers) : 0;
  const diffAvg = directAvg - otaAvg;

  const validSlots = data.timeSlotYield.filter(s => s.occupancy > 0);
  const bestSlot = validSlots.length > 0 ? [...validSlots].sort((a, b) => b.occupancy - a.occupancy)[0] : null;
  const lowestSlot = validSlots.length > 0 ? [...validSlots].sort((a, b) => a.occupancy - b.occupancy)[0] : null;

  const totalSynergyMembers = (data.memberSynergy.member1Non3.teams * 1) + (data.memberSynergy.member2Non2.teams * 2);
  const totalSynergyNonMembers = (data.memberSynergy.member1Non3.teams * 3) + (data.memberSynergy.member2Non2.teams * 2);
  const avgNonMembersPerMember = totalSynergyMembers > 0 ? (totalSynergyNonMembers / totalSynergyMembers).toFixed(1) : '0';

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 🌟 Header Section */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                Golf Intelligence Platform
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                주요 채널 전수 분석
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                수율 관리 (Yield Mgmt)
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <Flag className="text-[#00ae95] w-8 h-8" />
              골프 채널&예약 ⛳
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              주요 상세 판매 채널의 실현 단가, 3인 플레이 공실 손실액, 회원 앵커 효과, 그리고 2024~2026 연도별 추이를 정밀 분석합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
            <button
              onClick={fetchIntelligenceData}
              disabled={loading}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold sm:hidden">새로고침</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 Scope Mode Switcher & Date Badge */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            데이터 집계 범위:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setViewScope('SELECTED_DATE')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewScope === 'SELECTED_DATE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              📅 {isRangeMode ? `선택 기간 실적 (${startDate} ~ ${endDate})` : `단일 1일 실적 (${startDate})`}
            </button>
            <button
              type="button"
              onClick={() => setViewScope('FULL_ASSET')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewScope === 'FULL_ASSET'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              🏛️ 2026년 DB 전수 누적
            </button>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60 flex items-center gap-2">
          {viewScope === 'SELECTED_DATE' ? (
            isRangeMode ? (
              <span>
                ✨ 글로벌 달력에서 지정한 <strong className="text-emerald-700 font-bold">{startDate} ~ {endDate}</strong> 기간의 실시간 집계 실적입니다.
              </span>
            ) : (
              <span>
                ✨ <strong className="text-emerald-700 font-bold">{startDate} 당일 1일</strong>에 정산 완료된 실제 티타임 실적입니다. (하루 실측 {data.summary.totalTeams.toLocaleString()}팀 / {data.summary.totalPlayers.toLocaleString()}명)
              </span>
            )
          ) : (
            <span>
              ✨ <strong className="text-slate-900 font-bold">2026년 골프장 전수 누적({data.summary.totalTeams.toLocaleString()}팀 / {data.summary.totalPlayers.toLocaleString()}명)</strong> 종합 분석 자산입니다.
            </span>
          )}
        </div>
      </div>

      {/* 🌟 4대 핵심 경영 KPI 바 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: 총 예약/완주 팀 수 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Flag size={16} className="text-[#00ae95]" /> 
              {viewScope === 'FULL_ASSET' ? '전수 누적 총 예약/완주 팀' : isRangeMode ? '선택 기간 총 예약/완주 팀' : '금일 총 예약/완주 팀'}
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              {viewScope === 'FULL_ASSET' ? '연간 전수 DB' : isRangeMode ? '기간 누적' : '당일 실측'}
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight font-financial">
              {data.summary.totalTeams.toLocaleString()}
              <span className="text-base font-normal text-slate-400 ml-1">팀</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              내장객 <strong className="text-slate-800">{data.summary.totalPlayers.toLocaleString()}명</strong> (팀당 평균 {(data.summary.totalPlayers / Math.max(1, data.summary.totalTeams)).toFixed(2)}명)
            </div>
          </div>
          <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            {viewScope === 'FULL_ASSET' ? '2024~2026 DB 집계 완료된 총 완주 팀' : isRangeMode ? '선택 기간 정산 완료된 총 티타임 완주 팀' : `${startDate} 당일 정산 완료된 총 완주 팀`}
          </p>
        </div>

        {/* Card 2: 1인당 실현 평균 그린피 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <DollarSign size={16} className="text-emerald-600" /> 실현 평균 그린피 (1인)
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              VAT 제외 순수익
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight font-financial">
              ₩{formatCurrency(data.summary.averageGreenFee)}
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-1">
              {viewScope === 'FULL_ASSET' ? '전수 누적 그린피' : isRangeMode ? '기간 그린피 순매출' : '당일 그린피 순매출'} ₩{formatCurrency(data.summary.totalGreenFeeRevenue)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>직영 <strong>₩{formatCurrency(directAvg)}</strong></span>
            <span className="text-slate-300">|</span>
            <span>OTA <strong>₩{formatCurrency(otaAvg)}</strong></span>
            <span className={diffAvg >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
              ({diffAvg >= 0 ? `+₩${formatCurrency(diffAvg)}` : `-₩${formatCurrency(Math.abs(diffAvg))}`})
            </span>
          </div>
        </div>

        {/* Card 3: 3인 플레이 공실 기회손실 */}
        <div className="bg-gradient-to-br from-rose-50/70 to-white p-6 rounded-3xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={16} className="text-rose-600" /> 
              {viewScope === 'FULL_ASSET' ? '누적 3인 공실 손실액' : isRangeMode ? '선택 기간 3인 공실 손실' : '금일 3인 공실 손실액'}
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
              회수 타겟
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-rose-600 tracking-tight font-financial">
              ₩{formatCurrency(data.summary.threePlayerLostRevenue)}
            </div>
            <div className="text-xs text-rose-700 mt-1 font-medium">
              3인 플레이 <strong>{data.summary.threePlayerTeamsCount}팀</strong> 대상 1인분 공실
            </div>
          </div>
          <p className="text-[11px] text-rose-900/70 border-t border-rose-100 pt-2">
            💡 조인 시스템 50% 전환 시 +₩{formatCurrency(Math.round(data.summary.threePlayerLostRevenue * 0.5))} 즉시 회수
          </p>
        </div>

        {/* Card 4: 회원 앵커 견인 매출 */}
        <div className="bg-gradient-to-br from-teal-50/70 to-white p-6 rounded-3xl border border-teal-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-teal-600" /> 
              {viewScope === 'FULL_ASSET' ? '누적 회원 앵커 견인액' : isRangeMode ? '선택 기간 회원 앵커 견인' : '금일 회원 앵커 견인액'}
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-extrabold px-2 py-0.5 rounded-full">
              동반 레버리지
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-teal-700 tracking-tight font-financial">
              ₩{formatCurrency(data.summary.memberAnchorRevenue)}
            </div>
            <div className="text-xs text-teal-800 mt-1 font-medium">
              회원이 데려온 비회원 총 그린피 기여액
            </div>
          </div>
          <p className="text-[11px] text-teal-950/70 border-t border-teal-100 pt-2">
            회원 1명이 평균 {avgNonMembersPerMember}명의 비회원 풀그린피 유치
          </p>
        </div>

      </div>

      {/* 🌟 Section 1: [수익성 평가] 채널별 예약 기여도 vs 실현 평균 그린피 매트릭스 */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                수익성 매트릭스
              </span>
              <span className="text-xs font-semibold text-slate-400">
                자사 직영몰 vs OTA 플랫폼 비교
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              ① [수익성 평가] 채널별 내장객 수 vs 실현 평균 그린피 매트릭스
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              어느 채널이 제값(풀그린피)을 받고 팔아주는 효자 채널인지, 어디가 수수료와 덤핑으로 단가를 갉아먹는지 즉시 판별합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 p-1 rounded-2xl">
              <span className="pl-2 text-slate-600">정렬:</span>
              <button
                type="button"
                onClick={() => setChannelSortBy('AVG_GREEN_FEE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  channelSortBy === 'AVG_GREEN_FEE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💵 평균 그린피 높은 순
              </button>
              <button
                type="button"
                onClick={() => setChannelSortBy('PLAYERS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  channelSortBy === 'PLAYERS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 내장객 많은 순
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
              <span className="w-3 h-3 rounded-full bg-[#00ae95] inline-block" /> 직영 채널
              <span className="w-3 h-3 rounded-full bg-[#64748b] inline-block ml-2" /> OTA 제휴사
            </div>
          </div>
        </div>

        <div className="h-[430px] w-full">
          <ReactECharts option={getChannelProfitabilityOption()} style={{ height: '100%', width: '100%' }} />
        </div>

        {/* 🌟 주요 채널별 실현 평균 그린피 랭킹 현황판 */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                GREEN FEE RANKING
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                주요 판매 채널별 실현 평균 그린피 순위 (1인 기준 실현 순단가)
              </h4>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>직영 최고: <strong className="text-emerald-700 font-bold">₩{formatCurrency(Math.max(...data.channels.filter(c => c.channelType === 'DIRECT').map(c => c.avgGreenFee), 0))}</strong></span>
              <span className="text-slate-300">|</span>
              <span>OTA 최고: <strong className="text-blue-700 font-bold">₩{formatCurrency(Math.max(...data.channels.filter(c => c.channelType === 'OTA').map(c => c.avgGreenFee), 0))}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[...data.channels].sort((a, b) => b.avgGreenFee - a.avgGreenFee).map((ch, idx) => (
              <div
                key={ch.channelName}
                className={`p-3.5 rounded-2xl border transition-all ${
                  ch.channelType === 'DIRECT'
                    ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${
                    idx < 3 ? 'bg-amber-500 text-white font-black' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    ch.channelType === 'DIRECT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ch.channelType === 'DIRECT' ? '직영' : 'OTA'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate mb-1" title={ch.channelName}>
                  {ch.channelName}
                </div>
                <div className="text-base font-black text-amber-600 tracking-tight font-financial">
                  ₩{formatCurrency(ch.avgGreenFee)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 border-t border-slate-200/40 pt-1">
                  <span className={ch.discountRate > 15 ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                    할인 {ch.discountRate}%
                  </span>
                  <span className="font-semibold text-slate-700">{ch.players.toLocaleString()}명</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 Section 2: [기회비용 & 조인 타겟팅] 2-Grid 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2-A: 팀 구성 분포 및 3인 플레이 공실 손실 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                  기회비용 진단
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  ②-A. 팀 구성(1~4인) 분포 & 3인 공실 손실
                </h3>
              </div>
              <span className="text-xs text-slate-400">총 {data.summary.totalTeams.toLocaleString()}팀</span>
            </div>

            <div className="h-[300px] w-full">
              <ReactECharts option={getTeamSizeDonutOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mt-4 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between font-bold text-slate-800">
              <span>• 3인 플레이 발생:</span>
              <span className="text-rose-600">{data.summary.threePlayerTeamsCount.toLocaleString()}팀 ({data.summary.threePlayerTeamsCount.toLocaleString()}명분 공실)</span>
            </div>
            <div className="flex justify-between">
              <span>• 놓친 그린피 + 카트비 총액:</span>
              <strong className="text-slate-900">₩{formatCurrency(data.summary.threePlayerLostRevenue)}원</strong>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              💡 4인 정상 플레이가 {(data.teamSize.size4.teams / Math.max(1, data.summary.totalTeams) * 100).toFixed(1)}%로 대부분을 차지하나, 3인 플레이가 {data.summary.threePlayerTeamsCount.toLocaleString()}팀 발생했습니다. 비수기 조인 시스템을 가동하여 50%만 충원해도 약 {formatCurrency(Math.round(data.summary.threePlayerLostRevenue * 0.5))}원의 순이익이 즉시 개선됩니다.
            </div>
          </div>
        </div>

        {/* 2-B: 🌟 조인(1~2인) 고객 주 이용 판매 채널 랭킹 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  마케팅 타겟팅 (NEW)
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  ②-B. 1~2인 조인 고객 주 이용 채널 랭킹
                </h3>
              </div>
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg">
                조인 총 {data.summary.joinTeamsCount.toLocaleString()}팀
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              조인(1인 {data.teamSize.size1.teams.toLocaleString()}팀, 2인 {data.teamSize.size2.teams.toLocaleString()}팀) 고객들이 어느 플랫폼을 통해 예약하는지 분석하여 조인 상품 집중 배치 타겟을 도출합니다.
            </p>

            <div className="h-[300px] w-full">
              {data.summary.joinTeamsCount > 0 && data.teamSize.joinRanking.some(r => r.teams > 0) ? (
                <ReactECharts option={getJoinChannelOption()} style={{ height: '100%', width: '100%' }} />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-blue-50/30 rounded-2xl border border-dashed border-blue-200 p-6 text-center">
                  <Users className="w-10 h-10 text-blue-300 mb-2" />
                  <p className="text-sm font-bold text-blue-900">조인(1~2인) 플레이 팀 없음</p>
                  <p className="text-xs text-blue-600 mt-1 max-w-sm">
                    해당 조회 기간에는 1~2인 조인 플레이 없이 전 팀이 3~4인으로 완주되었습니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 mt-4 text-xs text-blue-900 space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>🎯 조인 주력 채널 1위:</span>
              <span>
                {data.teamSize.joinRanking.find(r => r.teams > 0)
                  ? `${data.teamSize.joinRanking.find(r => r.teams > 0)?.channelName} (${data.teamSize.joinRanking.find(r => r.teams > 0)?.sharePct}%, ${data.teamSize.joinRanking.find(r => r.teams > 0)?.teams.toLocaleString()}팀 · 평단가 ₩${formatCurrency(data.teamSize.joinRanking.find(r => r.teams > 0)?.avgGreenFee || 0)})` 
                  : '조인 예약 없음'}
              </span>
            </div>
            {data.teamSize.joinRanking.filter(r => r.teams > 0).length > 1 && (
              <div className="flex justify-between font-medium">
                <span>🎯 조인 주력 채널 2위:</span>
                <span>
                  {data.teamSize.joinRanking.filter(r => r.teams > 0)[1]?.channelName} ({data.teamSize.joinRanking.filter(r => r.teams > 0)[1]?.sharePct}%, {data.teamSize.joinRanking.filter(r => r.teams > 0)[1]?.teams.toLocaleString()}팀 · 평단가 ₩{formatCurrency(data.teamSize.joinRanking.filter(r => r.teams > 0)[1]?.avgGreenFee || 0)})
                </span>
              </div>
            )}
            <p className="text-[11px] text-blue-800/80 pt-1 border-t border-blue-200/50">
              👉 조인 활성화 전용 프로모션은 상위 주요 모바일 앱에 집중 투입할 때 가장 높은 공실 충원 전환율을 기대할 수 있습니다.
            </p>
          </div>
        </div>

      </div>

      {/* 🌟 Section 3 & 4: [회원 레버리지] & [다이내믹 프라이싱] 2-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 3: 회원 앵커 효과 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                  회원권 가치 검증
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  ③ [회원 레버리지] 팀 내 회원 동반 구조 & 앵커 효과
                </h3>
              </div>
              <span className="text-xs text-slate-400">앵커 매출 ₩{formatCurrency(data.memberSynergy.totalAnchorRevenue)}</span>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              회원 1명이 혼자 치지 않고 비회원 동반자 3명을 유치해 오는 화폐 가치를 실측했습니다.
            </p>

            <div className="h-[310px] w-full">
              {data.memberSynergy.member1Non3.teams > 0 || data.memberSynergy.pureNonMember.teams > 0 ? (
                <ReactECharts option={getMemberSynergyOption()} style={{ height: '100%', width: '100%' }} />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-teal-50/30 rounded-2xl border border-dashed border-teal-200 p-6 text-center">
                  <Coins className="w-10 h-10 text-teal-300 mb-2" />
                  <p className="text-sm font-bold text-teal-900">회원 동반 앵커 견인 실측 매출</p>
                  <p className="text-xl font-black text-teal-700 mt-1 font-financial">₩{formatCurrency(data.memberSynergy.totalAnchorRevenue)}원</p>
                  <p className="text-xs text-teal-600 mt-2 max-w-sm">
                    회원 1명이 비회원 동반자를 견인하여 발생한 순수 실측 그린피 매출입니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 mt-4 text-xs text-teal-950 space-y-2">
            <div className="flex justify-between">
              <span>• 회원이 견인한 순수 비회원 그린피 매출:</span>
              <strong className="text-teal-700 font-extrabold">₩{formatCurrency(data.memberSynergy.totalAnchorRevenue)}원</strong>
            </div>
            {data.memberSynergy.member1Non3.teams > 0 && (
              <div className="flex justify-between">
                <span>• 회원 1명 + 비회원 3명 동반 팀:</span>
                <strong>{data.memberSynergy.member1Non3.teams.toLocaleString()}팀 ({data.memberSynergy.member1Non3.ratio || (data.summary.totalTeams > 0 ? (data.memberSynergy.member1Non3.teams / data.summary.totalTeams * 100).toFixed(1) : '0')}%) · ₩{formatCurrency(data.memberSynergy.member1Non3.nonMemberRevenue)}</strong>
              </div>
            )}
            {data.memberSynergy.member2Non2.teams > 0 && (
              <div className="flex justify-between">
                <span>• 회원 2명 + 비회원 2명 동반 팀:</span>
                <strong>{data.memberSynergy.member2Non2.teams.toLocaleString()}팀 ({data.memberSynergy.member2Non2.ratio || (data.summary.totalTeams > 0 ? (data.memberSynergy.member2Non2.teams / data.summary.totalTeams * 100).toFixed(1) : '0')}%) · ₩{formatCurrency(data.memberSynergy.member2Non2.nonMemberRevenue)}</strong>
              </div>
            )}
            {data.memberSynergy.pureNonMember.teams > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>• 순수 비회원 (4인) 팀:</span>
                <span>{data.memberSynergy.pureNonMember.teams.toLocaleString()}팀 ({data.memberSynergy.pureNonMember.ratio || (data.summary.totalTeams > 0 ? (data.memberSynergy.pureNonMember.teams / data.summary.totalTeams * 100).toFixed(1) : '0')}%) · ₩{formatCurrency(data.memberSynergy.pureNonMember.revenue)}</span>
              </div>
            )}
            <p className="text-[11px] text-teal-900/80 pt-1.5 border-t border-teal-200/50 leading-relaxed">
              💡 회원 1명은 단순 1인이 아닌 비회원을 추가 유치하는 영업 앵커 역할을 수행하고 있습니다.
            </p>
          </div>
        </div>

        {/* Section 4: 티업 시간대별 수율 관리 2D 히트맵 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  Yield Management
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  ④ [다이내믹 프라이싱] 시간대 × 요일 가동률 히트맵
                </h3>
              </div>
              <span className="text-xs text-slate-400">티타임 가동률(%)</span>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              골프장 수익 극대화를 위해 프라임 타임(주말 1부)과 잔여 타임(새벽 얼리/레이트)의 수율을 진단합니다.
            </p>

            <div className="h-[370px] w-full">
              {data.timeSlotYield.length > 0 && data.timeSlotYield.some(s => s.occupancy > 0) ? (
                <ReactECharts option={getTimeSlotHeatmapOption()} style={{ height: '100%', width: '100%' }} />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">시간대별(티타임) 실적 없음</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    해당 조회 기간에는 정산 완료된 티타임 가동 내역이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 text-xs text-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span>• 최고 가동 시간대:</span>
              <strong className="text-indigo-600">
                {bestSlot ? `${bestSlot.dayOfWeek}요일 ${bestSlot.timeSlot} (가동률 ${bestSlot.occupancy.toFixed(1)}%, 실현 그린피 ₩${formatCurrency(bestSlot.avgGreenFee)}, ${(bestSlot as any).teams || 0}팀)` : '-'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>• 잔여 공실 시간대:</span>
              <strong className="text-slate-600">
                {lowestSlot ? `${lowestSlot.dayOfWeek}요일 ${lowestSlot.timeSlot} (가동률 ${lowestSlot.occupancy.toFixed(1)}%, 실현 그린피 ₩${formatCurrency(lowestSlot.avgGreenFee)}, ${(lowestSlot as any).teams || 0}팀)` : '-'}
              </strong>
            </div>
            <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 leading-relaxed">
              👉 평일 레이트 슬롯은 OTA 타임어택 특가로 공실을 밀어내고, 주말 1·2부는 최고가를 유지하는 다이내믹 가격 정책을 제언합니다.
            </p>
          </div>
        </div>

      </div>

      {/* 🌟 Section 5: [시계열 YoY] 2024, 2025, 2026~ 연도별·월별 그린피 & 이용 팀 수 추이 */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                시계열 YoY 트렌드 (NEW)
              </span>
              <span className="text-xs font-semibold text-slate-400">
                2024 ~ 2026 연도별 × 월별 전수 비교
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              ⑤ [시계열 YoY] 연도별 & 월별 이용 팀 수 및 실현 그린피 추이
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              각 연도별 월별 이용 팀 수(막대)와 1인당 실현 평균 그린피(꺾은선)를 1:1 비교하여 계절성 및 단가 방어 추세를 진단합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500">기준연도 선택:</span>
            {['2024', '2025', '2026'].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYoyYear(y)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedYoyYear === y
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="h-[380px] w-full mb-8">
          <ReactECharts option={getMonthlyYoyOption()} style={{ height: '100%', width: '100%' }} />
        </div>

        {/* 월별 상세 피벗 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-y border-slate-200">
                <th className="py-3 px-4 text-center">월 (Month)</th>
                <th colSpan={3} className="py-3 px-4 text-center border-l border-slate-200 bg-slate-100/50">2024년</th>
                <th colSpan={3} className="py-3 px-4 text-center border-l border-slate-200 bg-blue-50/50">2025년</th>
                <th colSpan={3} className="py-3 px-4 text-center border-l border-slate-200 bg-emerald-50/50">2026년</th>
              </tr>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2 px-4 text-center"></th>
                <th className="py-2 px-3 text-right border-l border-slate-200">팀수</th>
                <th className="py-2 px-3 text-right">평균그린피</th>
                <th className="py-2 px-3 text-right">매출액</th>
                <th className="py-2 px-3 text-right border-l border-slate-200">팀수</th>
                <th className="py-2 px-3 text-right">평균그린피</th>
                <th className="py-2 px-3 text-right">매출액</th>
                <th className="py-2 px-3 text-right border-l border-slate-200">팀수</th>
                <th className="py-2 px-3 text-right">평균그린피</th>
                <th className="py-2 px-3 text-right">매출액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.monthlyYoy.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800 text-center bg-slate-50/40">{row.monthName}</td>
                  
                  {/* 2024년 */}
                  <td className="py-3 px-3 text-right border-l border-slate-100 text-slate-600">
                    {row.y2024.teams > 0 ? `${row.y2024.teams.toLocaleString()}팀` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {row.y2024.avgGreenFee > 0 ? `₩${formatCurrency(row.y2024.avgGreenFee)}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {row.y2024.revenue > 0 ? `₩${formatCurrency(row.y2024.revenue)}` : '-'}
                  </td>

                  {/* 2025년 */}
                  <td className="py-3 px-3 text-right border-l border-slate-100 font-bold text-blue-700 bg-blue-50/10">
                    {row.y2025.teams.toLocaleString()}팀
                  </td>
                  <td className="py-3 px-3 text-right text-blue-800 bg-blue-50/10">
                    ₩{formatCurrency(row.y2025.avgGreenFee)}
                  </td>
                  <td className="py-3 px-3 text-right text-blue-900 bg-blue-50/10">
                    ₩{formatCurrency(row.y2025.revenue)}
                  </td>

                  {/* 2026년 */}
                  <td className="py-3 px-3 text-right border-l border-slate-100 font-extrabold text-emerald-700 bg-emerald-50/10">
                    {row.y2026.teams > 0 ? `${row.y2026.teams.toLocaleString()}팀` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-800 bg-emerald-50/10">
                    {row.y2026.avgGreenFee > 0 ? `₩${formatCurrency(row.y2026.avgGreenFee)}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-900 bg-emerald-50/10">
                    {row.y2026.revenue > 0 ? `₩${formatCurrency(row.y2026.revenue)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 Section 6: 거래처별 상세 피벗 테이블 */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                정밀 명세서
              </span>
              <span className="text-xs font-semibold text-slate-400">
                주요 판매 거래처 전수 분석
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              ⑥ 판매 채널별 종합 실적 상세 명세서 (1인당 평균 그린피 순)
            </h2>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
            💡 헤더 컬럼을 클릭하면 해당 항목 기준(평균 그린피, 매출 등)으로 즉시 정렬됩니다.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="py-3.5 px-4 rounded-tl-xl">판매 채널명</th>
                <th className="py-3.5 px-3 text-center">채널 구분</th>
                <th 
                  onClick={() => {
                    if (tableSortKey === 'teams') setTableSortDesc(!tableSortDesc);
                    else { setTableSortKey('teams'); setTableSortDesc(true); }
                  }}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 select-none"
                >
                  예약 팀 수 {tableSortKey === 'teams' ? (tableSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th 
                  onClick={() => {
                    if (tableSortKey === 'players') setTableSortDesc(!tableSortDesc);
                    else { setTableSortKey('players'); setTableSortDesc(true); }
                  }}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 select-none"
                >
                  내장객 수 {tableSortKey === 'players' ? (tableSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th 
                  onClick={() => {
                    if (tableSortKey === 'avgGreenFee') setTableSortDesc(!tableSortDesc);
                    else { setTableSortKey('avgGreenFee'); setTableSortDesc(true); }
                  }}
                  className="py-3.5 px-4 text-right cursor-pointer select-none text-amber-900 bg-amber-100/60 font-black"
                  title="클릭하여 평균 그린피 순 정렬"
                >
                  1인당 평균 그린피 {tableSortKey === 'avgGreenFee' ? (tableSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th className="py-3.5 px-3 text-center">할인율</th>
                <th 
                  onClick={() => {
                    if (tableSortKey === 'revenue') setTableSortDesc(!tableSortDesc);
                    else { setTableSortKey('revenue'); setTableSortDesc(true); }
                  }}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 select-none"
                >
                  총 그린피 매출액 {tableSortKey === 'revenue' ? (tableSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th className="py-3.5 px-4 text-right rounded-tr-xl">매출 점유율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...data.channels].sort((a, b) => {
                let diff = 0;
                if (tableSortKey === 'avgGreenFee') diff = b.avgGreenFee - a.avgGreenFee;
                else if (tableSortKey === 'revenue') diff = b.revenue - a.revenue;
                else if (tableSortKey === 'players') diff = b.players - a.players;
                else if (tableSortKey === 'teams') diff = b.teams - a.teams;
                return tableSortDesc ? diff : -diff;
              }).map((ch, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <span className="text-[10px] text-slate-400 font-normal mr-2">#{idx + 1}</span>
                    {ch.channelName}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ch.channelType === 'DIRECT' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : ch.channelType === 'OTA'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ch.channelType === 'DIRECT' ? '직영채널' : ch.channelType === 'OTA' ? 'OTA 제휴' : '오프라인'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-financial font-medium text-slate-700">
                    {ch.teams.toLocaleString()}팀
                  </td>
                  <td className="py-3.5 px-4 text-right font-financial font-bold text-slate-900">
                    {ch.players.toLocaleString()}명
                  </td>
                  <td className="py-3.5 px-4 text-right font-financial font-black text-amber-700 bg-amber-50/30 text-sm">
                    ₩{formatCurrency(ch.avgGreenFee)}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold">
                    <span className={ch.discountRate > 15 ? 'text-rose-600' : 'text-emerald-700'}>
                      {ch.discountRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-financial font-extrabold text-slate-900">
                    ₩{formatCurrency(ch.revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                    {ch.sharePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
