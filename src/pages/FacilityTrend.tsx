import { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { Store, TrendingUp, Calendar, AlertCircle, RefreshCw, Scale, TreePine, Sparkles, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDate } from '../contexts/DateContext';
import { getLatestClosedMonthStr } from '../lib/dateUtils';
import HolidayComparison from '../components/dashboard/HolidayComparison';
import type { MonthlySeasonalityMatrixResponse, MonthlySeasonalityMonthRow } from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 영업장 목록 ('전체' 포함)
const FACILITIES = [
  '전체',
  'ROOM', 'ROOM OTHER', '그린피', '기타매출', '카트대여', '클럽-레스토랑',
  '클럽-스타트하우스', '프로샵', '벨포레 리조트', 'BHC(멕시카나)', 'CU편의점',
  '남도예담', '딜라이트', '밤밤테이블', '브리스킷346', '쿠치나', '투썸플레이스',
  '연회장', '놀이동산', '회전그네', '벨포레 목장', '벨포레 목장(체험)', '얼룩말카페',
  '미디어-기프트샵', '미디어-뮤지엄카페', '미디어아트센터', '마운틴카트', '마운틴카트(그랜드포렛)', '마운틴카트(미니포렛)', '사계절썰매장',
  '썸머랜드', '원더풀', '모토아레나', '핏스탑'
];

type GolfViewMode = 'COMPARE' | 'TOTAL' | 'EX_GOLF';

interface MonthlyDataPoint {
  month: string;
  revenue: number;
  totalRevenue: number;
  golfRevenue: number;
  exGolfRevenue: number;
  visitors: number;
}

export default function FacilityTrend() {
  const [searchParams] = useSearchParams();
  const queryFacility = searchParams.get('facility');
  const validInitialFacility = queryFacility && FACILITIES.includes(queryFacility) ? queryFacility : '전체';
  const initialTab = searchParams.get('tab') === 'seasonality' ? 'SEASONALITY' : 'TREND';

  const { startDate, endDate } = useDate();
  const [selectedFacility, setSelectedFacility] = useState<string>(validInitialFacility);
  const [golfViewMode, setGolfViewMode] = useState<GolfViewMode>('COMPARE');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<{ facility: string; monthlyData: MonthlyDataPoint[] } | null>(null);
  const [annualTotals, setAnnualTotals] = useState<Record<string, {
    totalRevenue?: number;
    exGolfRevenue?: number;
    golfRevenue?: number;
    visitors?: number;
  }>>({});

  // 🌟 V6 2026 vs 2025 월별 시즌성 매트릭스 (monthly-seasonality-matrix 완제품 바인딩)
  const [activeTab, setActiveTab] = useState<'TREND' | 'SEASONALITY'>(initialTab);
  const [seasonalityData, setSeasonalityData] = useState<MonthlySeasonalityMatrixResponse | null>(null);
  const [loadingSeasonality, setLoadingSeasonality] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSeasonality = async () => {
      setLoadingSeasonality(true);
      try {
        const res: MonthlySeasonalityMatrixResponse = await secureFetcher(`${API_BASE}/api/v6/report/monthly-seasonality-matrix`);
        if (isMounted) {
          setSeasonalityData((res as any)?.data ?? res);
        }
      } catch (e) {
        console.warn('Failed to fetch monthly seasonality matrix:', e);
      } finally {
        if (isMounted) setLoadingSeasonality(false);
      }
    };
    fetchSeasonality();
    return () => { isMounted = false; };
  }, []);

  const fetchFacilityTrend = async () => {
    setLoading(true);
    try {
      if (selectedFacility === '전체') {
        // 벨포레 전체 매출 (SSOT: /api/v6/report/monthly-trends 연도별 VM 및 Ticket 17 totalVisitors 완제품)
        const [res2024, res2025, res2026, guestsRes, leisureRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2024`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2025`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2026`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/room-guests-yoy`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/leisure-yoy-matrix?startYear=2024&endYear=2026`).catch(() => null),
        ]);

        const guestsPayload = guestsRes?.data ?? guestsRes;
        const guestsMap: Record<string, number> = {};
        if (guestsPayload && Array.isArray(guestsPayload.matrix)) {
          guestsPayload.matrix.forEach((row: any) => {
            const m = String(row.month).padStart(2, '0');
            ['2024', '2025', '2026'].forEach(y => {
              if (row[y] !== undefined) {
                guestsMap[`${y}-${m}`] = Math.round(Number(row[y]) || 0);
              }
            });
          });
        }

        const monthlyDataMap = new Map<string, {
          revenue: number;
          totalRevenue: number;
          golfRevenue: number;
          exGolfRevenue: number;
          visitors: number;
        }>();

        const appendYear = (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          if (list.length > 0) {
            list.forEach((item: any) => {
              const rawM = String(item.month);
              const mKey = rawM.includes('-') ? rawM : `${rawM.substring(0, 4)}-${rawM.substring(4, 6)}`;
              const totRev = Math.round(Number(item.totalRevenue ?? item.revenue ?? 0));
              const gRev = Math.round(Number(item.golfRevenue ?? 0));
              const exRev = item.exGolfRevenue !== undefined && item.exGolfRevenue !== null
                ? Math.round(Number(item.exGolfRevenue))
                : 0;
              const totVisitors = guestsMap[mKey]
                || (item.roomGuests !== undefined && item.roomGuests !== null ? Math.round(Number(item.roomGuests)) : 0)
                || (item.totalVisitors !== undefined && item.totalVisitors !== null ? Math.round(Number(item.totalVisitors)) : 0);

              monthlyDataMap.set(mKey, {
                revenue: totRev,
                totalRevenue: totRev,
                golfRevenue: gRev,
                exGolfRevenue: exRev,
                visitors: totVisitors
              });
            });
          }
        };

        appendYear(res2024);
        appendYear(res2025);
        appendYear(res2026);

        // 2024-01부터 데이터가 존재하는 최신 월까지 연속 월 배열 생성 (과거 날짜 캐시로 인한 잘림 방지)
        const allMonths = Array.from(monthlyDataMap.keys()).sort();
        const latestAvailableMonth = allMonths.length > 0 ? allMonths[allMonths.length - 1] : getLatestClosedMonthStr();
        const [endYear, endMonth] = latestAvailableMonth.split('-').map(Number);
        
        let curYear = 2024;
        let curMonth = 1;
        const monthlyData: MonthlyDataPoint[] = [];

        while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
          const monthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
          const found = monthlyDataMap.get(monthKey) || {
            revenue: 0,
            totalRevenue: 0,
            golfRevenue: 0,
            exGolfRevenue: 0,
            visitors: guestsMap[monthKey] || 0
          };
          monthlyData.push({
            month: monthKey,
            revenue: found.revenue,
            totalRevenue: found.totalRevenue,
            golfRevenue: found.golfRevenue,
            exGolfRevenue: found.exGolfRevenue,
            visitors: found.visitors
          });

          curMonth++;
          if (curMonth > 12) {
            curMonth = 1;
            curYear++;
          }
        }

        // 백엔드 ValidationMaster 및 room-guests-yoy totals 연동 (NO SLICE SUMMATION SSOT)
        const parseVM = (res: any) => {
          const vm = res?.ValidationMaster;
          if (!vm) return null;
          return {
            totalRevenue: Math.round(Number(vm.grandTotalRevenue ?? vm.totalRevenue ?? 0)),
            exGolfRevenue: Math.round(Number(vm.grandExGolfRevenue ?? 0)),
            golfRevenue: Math.round(Number(vm.grandGolfRevenue ?? 0))
          };
        };

        const totalsByYear: Record<string, {
          totalRevenue?: number;
          exGolfRevenue?: number;
          golfRevenue?: number;
          visitors?: number;
        }> = {};

        const resolveVisitors = (yr: string) => {
          // 1순위: room-guests-yoy totals 객체 (백엔드 공식 totals 필드 SSOT)
          if (guestsPayload?.totals?.[yr] !== undefined && guestsPayload.totals[yr] !== null) {
            return Math.round(Number(guestsPayload.totals[yr]));
          }
          // 2순위: leisure-yoy-matrix periodCumulative 완제품 (DB 마트 집계 연간 누적 객실투숙객)
          const periodData = leisureRes?.data?.periodCumulative ?? leisureRes?.periodCumulative;
          if (periodData?.[yr]?.roomGuests !== undefined && periodData[yr].roomGuests !== null) {
            return Math.round(Number(periodData[yr].roomGuests));
          }
          return undefined;
        };

        const vm2024 = parseVM(res2024);
        if (vm2024) {
          totalsByYear['2024'] = {
            ...vm2024,
            visitors: resolveVisitors('2024')
          };
        }

        const vm2025 = parseVM(res2025);
        if (vm2025) {
          totalsByYear['2025'] = {
            ...vm2025,
            visitors: resolveVisitors('2025')
          };
        }

        const vm2026 = parseVM(res2026);
        if (vm2026) {
          totalsByYear['2026'] = {
            ...vm2026,
            visitors: resolveVisitors('2026')
          };
        }

        setAnnualTotals(totalsByYear);

        setData({
          facility: '전체',
          monthlyData
        });
      } else {
        // 개별 영업장 조회 (2024년부터 최신 월까지 전수 데이터 조회)
        const res = await secureFetcher(`${API_BASE}/api/v6/report/facility-monthly-trend?facility=${encodeURIComponent(selectedFacility)}`).catch(() => null);
        const payload = res?.data ?? res;
        
        if (payload && Array.isArray(payload.monthlyData)) {
          const mapped: MonthlyDataPoint[] = payload.monthlyData.map((d: any) => {
            const rev = Math.round(Number(d.revenue || 0));
            return {
              month: d.month,
              revenue: rev,
              totalRevenue: rev,
              golfRevenue: 0,
              exGolfRevenue: rev,
              visitors: Math.round(Number(d.visitors || 0))
            };
          });

          const sourceTotals = payload?.yearlyTotals || (payload?.totals && typeof payload.totals['2024'] === 'object' ? payload.totals : null);
          if (sourceTotals) {
            const facTotals: Record<string, { totalRevenue?: number; exGolfRevenue?: number; golfRevenue?: number; visitors?: number }> = {};
            Object.keys(sourceTotals).forEach(yr => {
              const item = sourceTotals[yr];
              if (item && typeof item === 'object') {
                facTotals[yr] = {
                  totalRevenue: item.revenue !== undefined ? Math.round(Number(item.revenue)) : undefined,
                  exGolfRevenue: item.revenue !== undefined ? Math.round(Number(item.revenue)) : undefined,
                  golfRevenue: 0,
                  visitors: item.visitors !== undefined ? Math.round(Number(item.visitors)) : undefined
                };
              }
            });
            setAnnualTotals(facTotals);
          } else {
            setAnnualTotals({});
          }

          setData({
            facility: selectedFacility,
            monthlyData: mapped
          });
        } else {
          setAnnualTotals({});
          setData(null);
        }
      }
    } catch (err) {
      console.error('Facility Trend Fetch Error:', err);
      setAnnualTotals({});
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilityTrend();
  }, [selectedFacility, startDate, endDate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));
  };

  // ECharts 옵션 구성 (YoY 비교 + 골프 분리 멀티뷰 지원)
  const getChartOptions = () => {
    if (!data || !data.monthlyData || data.monthlyData.length === 0) return {};

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const years = Array.from(new Set(data.monthlyData.map((d: MonthlyDataPoint) => d.month.substring(0, 4)))).sort();
    
    const seriesData: any[] = [];
    const legendData: string[] = [];
    const visitorLabel = selectedFacility === '전체' ? '객실 투숙객' : '방문객';
    const isCompare = selectedFacility === '전체' && golfViewMode === 'COMPARE';
    const isExGolf = selectedFacility === '전체' && golfViewMode === 'EX_GOLF';

    // Year-specific color themes
    const YEAR_THEMES: Record<string, { total: string; exGolf: string; line: string }> = {
      '2024': { total: '#94a3b8', exGolf: '#cbd5e1', line: '#94a3b8' },
      '2025': { total: '#00ae95', exGolf: '#5eead4', line: '#00ae95' },
      '2026': { total: '#0f172a', exGolf: '#6366f1', line: '#0f172a' }
    };
    const defaultTheme = { total: '#475569', exGolf: '#94a3b8', line: '#475569' };

    years.forEach((year: string) => {
      const theme = YEAR_THEMES[year] || defaultTheme;

      const yearTotalRevenue: (number | null)[] = Array(12).fill(null);
      const yearExGolfRevenue: (number | null)[] = Array(12).fill(null);
      const yearVisitors: (number | null)[] = Array(12).fill(null);
      
      data.monthlyData.forEach((d: MonthlyDataPoint) => {
        if (d.month.startsWith(year)) {
          const monthIdx = parseInt(d.month.substring(5, 7), 10) - 1;
          const tot = d.totalRevenue > 0 ? d.totalRevenue : null;
          const exG = d.exGolfRevenue > 0 ? d.exGolfRevenue : null;
          const vis = d.visitors > 0 ? d.visitors : null;

          yearTotalRevenue[monthIdx] = tot;
          yearExGolfRevenue[monthIdx] = exG;
          yearVisitors[monthIdx] = vis;
        }
      });

      if (isCompare) {
        // [비교 모드]: 각 연도별 골프포함(진한 막대)과 골프제외(연한 막대) 쌍으로 표출
        const totalLegend = `${year}년 골프포함`;
        const exLegend = `${year}년 골프제외`;
        legendData.push(totalLegend, exLegend);

        seriesData.push({
          name: totalLegend,
          type: 'bar',
          data: yearTotalRevenue,
          itemStyle: { color: theme.total, borderRadius: [4, 4, 0, 0] }
        });

        seriesData.push({
          name: exLegend,
          type: 'bar',
          data: yearExGolfRevenue,
          itemStyle: { color: theme.exGolf, borderRadius: [4, 4, 0, 0] }
        });
      } else if (isExGolf) {
        // [골프제외 모드]: 골프제외 단일 막대 표출
        const legendName = `${year}년 골프제외`;
        legendData.push(legendName);

        seriesData.push({
          name: legendName,
          type: 'bar',
          data: yearExGolfRevenue,
          itemStyle: { color: theme.exGolf, borderRadius: [4, 4, 0, 0] }
        });
      } else {
        // [골프포함 / 단일 업장 모드]: 기존과 100% 동일한 단일 막대 표출
        const legendName = `${year}년 매출`;
        legendData.push(legendName);

        seriesData.push({
          name: legendName,
          type: 'bar',
          data: yearTotalRevenue,
          itemStyle: { color: theme.total, borderRadius: [4, 4, 0, 0] }
        });
      }

      // 공통 투숙객/방문객 라인 차트
      const lineLegend = `${year}년 ${visitorLabel}`;
      legendData.push(lineLegend);
      seriesData.push({
        name: lineLegend,
        type: 'line',
        yAxisIndex: 1,
        data: yearVisitors,
        itemStyle: { color: theme.line },
        lineStyle: { width: 2, type: 'dashed' }
      });
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let result = `<div style="font-weight:700;margin-bottom:6px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${params[0].axisValue} 실적</div>`;
          params.forEach((item: any) => {
            if (item.value !== undefined && item.value !== null) {
              const isRev = item.seriesName.includes('매출') || item.seriesName.includes('골프');
              const formattedVal = isRev 
                ? `${new Intl.NumberFormat('ko-KR').format(Math.round(item.value))}원`
                : `${new Intl.NumberFormat('ko-KR').format(Math.round(item.value))}명`;
              result += `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;padding:3px 0;">
                  <span style="display:flex;align-items:center;gap:6px;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color};"></span>
                    <span style="color:#64748b;">${item.seriesName}</span>
                  </span>
                  <span style="font-weight:700;color:#0f172a;">${formattedVal}</span>
                </div>
              `;
            }
          });
          return result;
        }
      },
      legend: { data: legendData, bottom: 0, type: 'scroll' },
      grid: { left: '3%', right: '3%', bottom: '15%', containLabel: true },
      xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
      yAxis: [
        { type: 'value', name: '매출액', axisLabel: { formatter: '{value}' } },
        { 
          type: 'value', 
          name: selectedFacility === '전체' ? '객실 투숙객(명)' : '방문객수(명)', 
          axisLabel: { formatter: '{value}' } 
        }
      ],
      series: seriesData
    };
  };

  // 피벗 테이블 렌더링 (비교 모드 시 3단 분할 [골프포함 | 골프제외 | 투숙객])
  const renderPivotTable = () => {
    if (!data || !data.monthlyData || data.monthlyData.length === 0) return null;
    
    const years = Array.from(new Set(data.monthlyData.map((d: MonthlyDataPoint) => d.month.substring(0, 4)))).sort();
    const isCompare = selectedFacility === '전체' && golfViewMode === 'COMPARE';
    const isExGolf = selectedFacility === '전체' && golfViewMode === 'EX_GOLF';
    const colSpanPerYear = isCompare ? 3 : 2;

    const rows = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      const rowCols = years.map(year => {
        const target = `${year}-${monthStr}`;
        const match = data.monthlyData.find((d: MonthlyDataPoint) => d.month === target);
        return {
          year,
          totalRevenue: match?.totalRevenue || 0,
          exGolfRevenue: match?.exGolfRevenue || 0,
          golfRevenue: match?.golfRevenue || 0,
          revenue: match?.revenue || 0,
          visitors: match?.visitors || 0
        };
      });
      rows.push({ month: `${i}월`, data: rowCols });
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-[#F4F3EE] text-[#1B382E] text-xs font-bold uppercase">
            <th className="px-6 py-4 rounded-tl-xl text-center border-b border-[#D0C6BB]/75">월 (Month)</th>
            {years.map((year: string, idx) => (
              <th 
                key={year} 
                colSpan={colSpanPerYear} 
                className={`px-6 py-4 text-center border-b border-[#D0C6BB]/75 ${idx === years.length - 1 ? 'rounded-tr-xl' : 'border-r border-[#D0C6BB]/75'}`}
              >
                {year}년
              </th>
            ))}
          </tr>
          <tr className="bg-[#F4F3EE]/80 text-[#5A6B63] text-[11px] font-bold">
            <th className="px-6 py-2 text-center border-b border-[#D0C6BB]/75 bg-[#F4F3EE]/80"></th>
            {years.map((year: string, idx) => (
              <Fragment key={year}>
                {isCompare ? (
                  <>
                    <th className="px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#1B382E] bg-[#E8F2EE]/50">골프포함</th>
                    <th className="px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#284F42] bg-[#E8F2EE]/30">골프제외</th>
                    <th className={`px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#1E523F] ${idx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                ) : isExGolf ? (
                  <>
                    <th className="px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#284F42]">골프제외 순매출</th>
                    <th className={`px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#1E523F] ${idx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#1B382E]">매출액</th>
                    <th className={`px-4 py-2 text-right border-b border-[#D0C6BB]/75 text-[#1E523F] ${idx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D0C6BB]/30 font-financial">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[#F4F3EE]/50 transition-colors">
              <td className="px-6 py-4 font-bold text-[#1B382E] text-center bg-[#F4F3EE]/30">{row.month}</td>
              {row.data.map((col: any, cIdx) => (
                <Fragment key={col.year as string}>
                  {isCompare ? (
                    <>
                      <td className={`px-4 py-4 text-right font-extrabold tabular-nums ${col.totalRevenue > 0 ? 'text-[#1B382E] bg-[#E8F2EE]/20' : 'text-[#8F9E96]'}`}>
                        {col.totalRevenue > 0 ? `${formatCurrency(col.totalRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-bold tabular-nums ${col.exGolfRevenue > 0 ? 'text-[#284F42] bg-[#E8F2EE]/10' : 'text-[#8F9E96]'}`}>
                        {col.exGolfRevenue > 0 ? `${formatCurrency(col.exGolfRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-[#1E523F]' : 'text-[#8F9E96]'} ${cIdx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/40'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  ) : isExGolf ? (
                    <>
                      <td className={`px-4 py-4 text-right font-extrabold tabular-nums ${col.exGolfRevenue > 0 ? 'text-[#284F42]' : 'text-[#8F9E96]'}`}>
                        {col.exGolfRevenue > 0 ? `${formatCurrency(col.exGolfRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-[#1E523F]' : 'text-[#8F9E96]'} ${cIdx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/40'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-4 py-4 text-right font-extrabold tabular-nums ${col.totalRevenue > 0 ? 'text-[#1B382E]' : 'text-[#8F9E96]'}`}>
                        {col.totalRevenue > 0 ? `${formatCurrency(col.totalRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-[#1E523F]' : 'text-[#8F9E96]'} ${cIdx === years.length - 1 ? '' : 'border-r border-[#D0C6BB]/40'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  )}
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
        {Object.keys(annualTotals).length > 0 && (
          <tfoot className="bg-[#F4F3EE] font-black border-t-2 border-[#D0C6BB]/75 text-[#1B382E] shadow-xs font-financial">
            <tr>
              <td className="px-6 py-4 font-black text-[#1B382E] text-center bg-[#F4F3EE] sticky left-0 z-10 border-r border-[#D0C6BB]/75">
                연간 합계
              </td>
              {years.map((year: string, idx) => {
                const yearTotal = annualTotals[year];
                const isLastYear = idx === years.length - 1;
                return (
                  <Fragment key={`foot_${year}`}>
                    {isCompare ? (
                      <>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-[#1B382E] bg-[#E8F2EE]/50">
                          {yearTotal?.totalRevenue !== undefined && yearTotal.totalRevenue > 0
                            ? `${formatCurrency(yearTotal.totalRevenue)}원`
                            : '-'}
                        </td>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-[#284F42] bg-[#E8F2EE]/30">
                          {yearTotal?.exGolfRevenue !== undefined && yearTotal.exGolfRevenue > 0
                            ? `${formatCurrency(yearTotal.exGolfRevenue)}원`
                            : '-'}
                        </td>
                        <td className={`px-4 py-4 text-right font-black tabular-nums text-[#1E523F] ${isLastYear ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                          {yearTotal?.visitors !== undefined && yearTotal.visitors > 0
                            ? `${formatCurrency(yearTotal.visitors)}명`
                            : '-'}
                        </td>
                      </>
                    ) : isExGolf ? (
                      <>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-[#284F42] bg-[#E8F2EE]/30">
                          {yearTotal?.exGolfRevenue !== undefined && yearTotal.exGolfRevenue > 0
                            ? `${formatCurrency(yearTotal.exGolfRevenue)}원`
                            : '-'}
                        </td>
                        <td className={`px-4 py-4 text-right font-black tabular-nums text-[#1E523F] ${isLastYear ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                          {yearTotal?.visitors !== undefined && yearTotal.visitors > 0
                            ? `${formatCurrency(yearTotal.visitors)}명`
                            : '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-[#1B382E] bg-[#E8F2EE]/50">
                          {yearTotal?.totalRevenue !== undefined && yearTotal.totalRevenue > 0
                            ? `${formatCurrency(yearTotal.totalRevenue)}원`
                            : '-'}
                        </td>
                        <td className={`px-4 py-4 text-right font-black tabular-nums text-[#1E523F] ${isLastYear ? '' : 'border-r border-[#D0C6BB]/75'}`}>
                          {yearTotal?.visitors !== undefined && yearTotal.visitors > 0
                            ? `${formatCurrency(yearTotal.visitors)}명`
                            : '-'}
                        </td>
                      </>
                    )}
                  </Fragment>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    );
  };

  // 🌟 V6 2026 vs 2025 월별 시즌성 매트릭스 렌더링 함수
  const renderSeasonalityView = () => {
    if (loadingSeasonality) {
      return (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="font-bold text-slate-700">2026 vs 2025 시즌성 매트릭스 데이터를 불러오는 중입니다...</p>
        </div>
      );
    }

    if (!seasonalityData || (!seasonalityData.months && !seasonalityData.monthly)) {
      return (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-bold text-slate-600 text-lg mb-2">시즌성 데이터가 존재하지 않습니다.</p>
        </div>
      );
    }

    const facility = selectedFacility;
    const isAll = facility === '전체';
    const monthsList: MonthlySeasonalityMonthRow[] = seasonalityData.months || seasonalityData.monthly || [];

    // 선택된 영업장 연간 요약 매핑
    const selectedFacilityAnnual = !isAll
      ? (seasonalityData.facilities || seasonalityData.data?.facilities || []).find(
          (f: any) => f.venueName === facility || f.facilityName === facility || f.displayName === facility || f.categoryName === facility
        )
      : null;

    const annual = isAll ? (seasonalityData.annual || seasonalityData.totals || {}) : (selectedFacilityAnnual || {});

    // 월별 영업장 데이터 추출 헬퍼 (개별 영업장 누락 시 전사 총계로 오염되지 않도록 0값 보장)
    const getFacilityMonth = (m: MonthlySeasonalityMonthRow) => {
      if (isAll) return m;
      const f = (m.facilities || []).find(
        (x: any) => x.venueName === facility || x.facilityName === facility || x.displayName === facility || x.categoryName === facility
      );
      return f || {
        month: m.month,
        monthName: m.monthName,
        revenue2026: 0,
        revenue2025: 0,
        visitors2026: 0,
        visitors2025: 0,
        yoyRevenueDiff: 0,
        yoyRevenuePct: 0,
        yoyVisitorsDiff: 0,
        yoyVisitorsPct: 0
      };
    };

    const rev2026 = annual.revenue2026 ?? annual.tyRevenue ?? 0;
    const rev2025 = annual.revenue2025 ?? annual.lyRevenue ?? 0;
    const revDiff = annual.yoyRevenueDiff ?? annual.yoyRevDiff ?? annual.revenueDiff ?? null;
    const revPct = annual.yoyRevenuePct ?? annual.yoyRevPct ?? annual.revenueYoyPct ?? annual.revenueGrowthRate ?? 0;

    const vis2026 = annual.visitors2026 ?? annual.tyVisitors ?? 0;
    const vis2025 = annual.visitors2025 ?? annual.lyVisitors ?? 0;
    const visDiff = annual.yoyVisitorsDiff ?? annual.visitorsDiff ?? null;
    const visPct = annual.yoyVisitorsPct ?? annual.visitorsYoyPct ?? annual.visitorsGrowthRate ?? 0;

    const trev2026 = annual.trevpar2026 ?? 0;
    const trev2025 = annual.trevpar2025 ?? 0;
    const trevDiff = annual.yoyTrevparDiff ?? null;
    const trevPct = annual.yoyTrevparPct ?? 0;

    // ECharts Seasonality Option (선택 영업장 연동)
    const monthLabels = monthsList.map(m => m.monthName || `${m.month}월`);
    const chartRev2025 = monthsList.map(m => getFacilityMonth(m).revenue2025 ?? getFacilityMonth(m).lyRevenue ?? 0);
    const chartRev2026 = monthsList.map(m => getFacilityMonth(m).revenue2026 ?? getFacilityMonth(m).tyRevenue ?? 0);
    const chartTrev2025 = monthsList.map(m => m.trevpar2025 ?? 0);
    const chartTrev2026 = monthsList.map(m => m.trevpar2026 ?? 0);
    const chartVis2025 = monthsList.map(m => getFacilityMonth(m).visitors2025 ?? getFacilityMonth(m).lyVisitors ?? 0);
    const chartVis2026 = monthsList.map(m => getFacilityMonth(m).visitors2026 ?? getFacilityMonth(m).tyVisitors ?? 0);

    const seasonalityChartOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: isAll
          ? ['2025년 매출', '2026년 매출', '2025 TRevPAR', '2026 TRevPAR']
          : ['2025년 매출', '2026년 매출', '2025년 이용객', '2026년 이용객'],
        bottom: 0
      },
      grid: { left: '3%', right: '3%', bottom: '15%', containLabel: true },
      xAxis: [{ type: 'category', data: monthLabels, axisPointer: { type: 'shadow' } }],
      yAxis: [
        {
          type: 'value',
          name: '매출액 (원)',
          axisLabel: {
            formatter: (v: number) => {
              if (Math.abs(v) >= 100000000) return `${Math.round(v / 100000000)}억`;
              if (Math.abs(v) >= 10000) return `${Math.round(v / 10000)}만`;
              return `${v}`;
            }
          }
        },
        {
          type: 'value',
          name: isAll ? 'TRevPAR (원)' : '이용객 (명)',
          axisLabel: {
            formatter: (v: number) => isAll ? `${Math.round(v / 10000)}만` : `${Math.round(v).toLocaleString()}명`
          }
        }
      ],
      series: [
        {
          name: '2025년 매출',
          type: 'bar',
          data: chartRev2025,
          itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18
        },
        {
          name: '2026년 매출',
          type: 'bar',
          data: chartRev2026,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18
        },
        ...(isAll ? [
          {
            name: '2025 TRevPAR',
            type: 'line',
            yAxisIndex: 1,
            data: chartTrev2025,
            itemStyle: { color: '#f59e0b' },
            lineStyle: { width: 2, type: 'dashed' }
          },
          {
            name: '2026 TRevPAR',
            type: 'line',
            yAxisIndex: 1,
            data: chartTrev2026,
            itemStyle: { color: '#10b981' },
            lineStyle: { width: 2.5 }
          }
        ] : [
          {
            name: '2025년 이용객',
            type: 'line',
            yAxisIndex: 1,
            data: chartVis2025,
            itemStyle: { color: '#f59e0b' },
            lineStyle: { width: 2, type: 'dashed' }
          },
          {
            name: '2026년 이용객',
            type: 'line',
            yAxisIndex: 1,
            data: chartVis2026,
            itemStyle: { color: '#10b981' },
            lineStyle: { width: 2.5 }
          }
        ])
      ]
    };

    return (
      <div className="space-y-8">
        {/* Top Annual Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Revenue YoY */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#D0C6BB]/75 shadow-[0_4px_20px_rgba(40,79,66,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63] uppercase tracking-wider">
                {isAll ? '연간 누적 매출 (전사 전체)' : `연간 누적 매출 (${facility})`}
              </span>
              <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 px-2 py-0.5 rounded-full font-bold">2026 vs 2025</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold font-financial text-[#1B382E]">
                {rev2026 > 0 ? `${formatCurrency(rev2026)}원` : '-'}
              </span>
              <span className={`text-xs font-extrabold font-financial inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                revPct >= 0 ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-rose-50 text-rose-700'
              }`}>
                {revPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {revPct >= 0 ? '+' : ''}{revPct}%
              </span>
            </div>
            <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
              <span>2025년: {rev2025 > 0 ? `${formatCurrency(rev2025)}원` : '-'}</span>
              <span className={revDiff !== null && revDiff >= 0 ? 'text-[#1E523F] font-bold' : 'text-rose-700 font-bold'}>
                증감 {revDiff !== null ? `${revDiff >= 0 ? '+' : ''}${formatCurrency(revDiff)}원` : '-'}
              </span>
            </div>
          </div>

          {/* Card 2: Visitors YoY */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#D0C6BB]/75 shadow-[0_4px_20px_rgba(40,79,66,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B63] uppercase tracking-wider">
                {isAll ? '연간 총이용객 (전사 전체)' : `연간 총이용객 (${facility})`}
              </span>
              <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 px-2 py-0.5 rounded-full font-bold">2026 vs 2025</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold font-financial text-[#1B382E]">
                {vis2026 > 0 ? `${formatCurrency(vis2026)}명` : '-'}
              </span>
              <span className={`text-xs font-extrabold font-financial inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                visPct >= 0 ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-rose-50 text-rose-700'
              }`}>
                {visPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {visPct >= 0 ? '+' : ''}{visPct}%
              </span>
            </div>
            <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
              <span>2025년: {vis2025 > 0 ? `${formatCurrency(vis2025)}명` : '-'}</span>
              <span className={visDiff !== null && visDiff >= 0 ? 'text-[#1E523F] font-bold' : 'text-rose-700 font-bold'}>
                증감 {visDiff !== null ? `${visDiff >= 0 ? '+' : ''}${formatCurrency(visDiff)}명` : '-'}
              </span>
            </div>
          </div>

          {/* Card 3: TRevPAR YoY (전체 선택 시) 또는 전사 기여 비중 (영업장 선택 시) */}
          {isAll ? (
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#D0C6BB]/75 shadow-[0_4px_20px_rgba(40,79,66,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5A6B63] uppercase tracking-wider">연간 TRevPAR (YoY)</span>
                <span className="text-[10px] bg-[#B59269]/15 text-[#B59269] px-2 py-0.5 rounded-full font-bold">총체류매출</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-extrabold font-financial text-[#1B382E]">
                  {trev2026 > 0 ? `${formatCurrency(trev2026)}원` : '-'}
                </span>
                <span className={`text-xs font-extrabold font-financial inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                  trevPct >= 0 ? 'bg-[#E8F2EE] text-[#1E523F]' : 'bg-rose-50 text-rose-700'
                }`}>
                  {trevPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {trevPct >= 0 ? '+' : ''}{trevPct}%
                </span>
              </div>
              <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
                <span>2025년: {trev2025 > 0 ? `${formatCurrency(trev2025)}원` : '-'}</span>
                <span className={trevDiff !== null && trevDiff >= 0 ? 'text-[#1E523F] font-bold' : 'text-rose-700 font-bold'}>
                  증감 {trevDiff !== null ? `${trevDiff >= 0 ? '+' : ''}${formatCurrency(trevDiff)}원` : '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#D0C6BB]/75 shadow-[0_4px_20px_rgba(40,79,66,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5A6B63] uppercase tracking-wider">전사 매출 기여도</span>
                <span className="text-[10px] bg-[#B59269]/15 text-[#B59269] px-2 py-0.5 rounded-full font-bold">매출 비중</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-extrabold font-financial text-[#1B382E]">
                  {(annual as any).sharePct !== undefined && (annual as any).sharePct !== null
                    ? `${Number((annual as any).sharePct).toFixed(1)}%`
                    : '-'}
                </span>
                <span className="text-xs font-bold text-[#B59269] bg-[#B59269]/15 px-2 py-0.5 rounded-lg">
                  {annual.categoryName || '지정 영업장'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D0C6BB]/40 flex items-center justify-between text-xs text-[#5A6B63] font-financial">
                <span>영업장 명칭:</span>
                <span className="text-[#1B382E] font-bold">{facility}</span>
              </div>
            </div>
          )}
        </div>

        {/* 12-Month YoY EChart */}
        <div className="bg-white rounded-3xl p-3.5 sm:p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#284F42]" />
                <span>
                  {isAll
                    ? '2026 vs 2025 전사 월별 매출 & TRevPAR 시즌성 대조 차트'
                    : `2026 vs 2025 [${facility}] 월별 매출 및 이용객 시즌성 대조 차트`}
                </span>
              </h2>
              <p className="text-xs text-[#5A6B63] mt-0.5">
                {isAll
                  ? '전사 월별 매출 실적과 TRevPAR(가용 객실당 총체류매출)의 시즌성 변화 추이를 전년 동월과 대조합니다.'
                  : `${facility}의 2026년과 2025년 월별 매출 및 이용객 수 변화 추이를 전년 동월과 대조합니다.`}
              </p>
            </div>
          </div>
          <ReactECharts
            key={`seasonality-chart-${facility}`}
            option={seasonalityChartOption}
            notMerge={true}
            lazyUpdate={true}
            style={{ height: '360px', width: '100%' }}
          />
        </div>

        {/* 12-Month Seasonality Grid Table */}
        <div className="bg-white rounded-3xl p-3.5 sm:p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#284F42]" />
              <span>
                {isAll
                  ? '2026 vs 2025 전사 월별 시즌성 종합 매트릭스'
                  : `2026 vs 2025 [${facility}] 월별 시즌성 매트릭스`}
              </span>
            </h2>
            <p className="text-xs text-[#5A6B63] mt-0.5">
              {isAll
                ? '전사 월별 매출, 이용객 수 및 TRevPAR 지표의 전년 대비 증감 실적을 종합 분석합니다.'
                : `${facility}의 월별 매출 및 이용객 수 전년 대비 증감 실적을 종합 분석합니다.`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F4F3EE] text-[#1B382E] text-xs font-bold uppercase border-b border-[#D0C6BB]/75">
                  <th className="px-4 py-3 text-center">월</th>
                  <th className="px-4 py-3 text-right">2026년 매출</th>
                  <th className="px-4 py-3 text-right">2025년 매출</th>
                  <th className="px-4 py-3 text-right">매출 증감액</th>
                  <th className="px-4 py-3 text-right">매출 증감률</th>
                  <th className="px-4 py-3 text-right">2026년 이용객</th>
                  <th className="px-4 py-3 text-right">2025년 이용객</th>
                  <th className="px-4 py-3 text-right">인원 증감</th>
                  <th className="px-4 py-3 text-right">인원 증감률</th>
                  {isAll && (
                    <>
                      <th className="px-4 py-3 text-right">2026 TRevPAR</th>
                      <th className="px-4 py-3 text-right">2025 TRevPAR</th>
                      <th className="px-4 py-3 text-right">TRevPAR 증감률</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30 font-financial">
                {monthsList.map((m) => {
                  const fm = getFacilityMonth(m);
                  const mRev2026 = fm.revenue2026 ?? fm.tyRevenue ?? 0;
                  const mRev2025 = fm.revenue2025 ?? fm.lyRevenue ?? 0;
                  const mRevDiff = fm.yoyRevenueDiff ?? fm.yoyRevDiff ?? fm.revenueDiff ?? null;
                  const mRevPct = fm.yoyRevenuePct ?? fm.yoyRevPct ?? fm.revenueYoyPct ?? fm.revenueGrowthRate ?? 0;

                  const mVis2026 = fm.visitors2026 ?? fm.tyVisitors ?? 0;
                  const mVis2025 = fm.visitors2025 ?? fm.lyVisitors ?? 0;
                  const mVisDiff = fm.yoyVisitorsDiff ?? fm.visitorsDiff ?? null;
                  const mVisPct = fm.yoyVisitorsPct ?? fm.visitorsYoyPct ?? fm.visitorsGrowthRate ?? 0;

                  const mTrev2026 = m.trevpar2026 ?? 0;
                  const mTrev2025 = m.trevpar2025 ?? 0;
                  const mTrevPct = m.yoyTrevparPct ?? 0;

                  return (
                    <tr key={m.month} className="hover:bg-[#F4F3EE]/50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-[#1B382E] bg-[#F4F3EE]/30">
                        {m.monthName || `${m.month}월`}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#1B382E]">
                        {mRev2026 > 0 ? `${formatCurrency(mRev2026)}원` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#5A6B63]">
                        {mRev2025 > 0 ? `${formatCurrency(mRev2025)}원` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${mRevDiff !== null && mRevDiff >= 0 ? 'text-[#1E523F]' : 'text-rose-600'}`}>
                        {mRevDiff !== null && mRevDiff !== 0 ? `${mRevDiff > 0 ? '+' : ''}${formatCurrency(mRevDiff)}원` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold ${mRevPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                        {mRevPct !== 0 ? `${mRevPct > 0 ? '+' : ''}${mRevPct}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1B382E]">
                        {mVis2026 > 0 ? `${formatCurrency(mVis2026)}명` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#5A6B63]">
                        {mVis2025 > 0 ? `${formatCurrency(mVis2025)}명` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${mVisDiff !== null && mVisDiff >= 0 ? 'text-[#1E523F]' : 'text-rose-600'}`}>
                        {mVisDiff !== null && mVisDiff !== 0 ? `${mVisDiff > 0 ? '+' : ''}${formatCurrency(mVisDiff)}명` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold ${mVisPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                        {mVisPct !== 0 ? `${mVisPct > 0 ? '+' : ''}${mVisPct}%` : '-'}
                      </td>
                      {isAll && (
                        <>
                          <td className="px-4 py-3 text-right font-bold text-[#284F42]">
                            {mTrev2026 > 0 ? `${formatCurrency(mTrev2026)}원` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-[#5A6B63]">
                            {mTrev2025 > 0 ? `${formatCurrency(mTrev2025)}원` : '-'}
                          </td>
                          <td className={`px-4 py-3 text-right font-extrabold ${mTrevPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                            {mTrevPct !== 0 ? `${mTrevPct > 0 ? '+' : ''}${mTrevPct}%` : '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#F4F3EE] font-black border-t-2 border-[#D0C6BB]/75 text-[#1B382E]">
                <tr>
                  <td className="px-4 py-3 text-center">연간 총계</td>
                  <td className="px-4 py-3 text-right font-black text-[#1B382E]">
                    {rev2026 > 0 ? `${formatCurrency(rev2026)}원` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-[#5A6B63]">
                    {rev2025 > 0 ? `${formatCurrency(rev2025)}원` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right font-black ${revDiff !== null && revDiff >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                    {revDiff !== null && revDiff !== 0 ? `${revDiff > 0 ? '+' : ''}${formatCurrency(revDiff)}원` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right font-black ${revPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                    {revPct !== 0 ? `${revPct > 0 ? '+' : ''}${revPct}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-[#1B382E]">
                    {vis2026 > 0 ? `${formatCurrency(vis2026)}명` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-[#5A6B63]">
                    {vis2025 > 0 ? `${formatCurrency(vis2025)}명` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right font-black ${visDiff !== null && visDiff >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                    {visDiff !== null && visDiff !== 0 ? `${visDiff > 0 ? '+' : ''}${formatCurrency(visDiff)}명` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right font-black ${visPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                    {visPct !== 0 ? `${visPct > 0 ? '+' : ''}${visPct}%` : '-'}
                  </td>
                  {isAll && (
                    <>
                      <td className="px-4 py-3 text-right font-black text-[#284F42]">
                        {trev2026 > 0 ? `${formatCurrency(trev2026)}원` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#5A6B63]">
                        {trev2025 > 0 ? `${formatCurrency(trev2025)}원` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${trevPct >= 0 ? 'text-[#1E523F]' : 'text-rose-700'}`}>
                        {trevPct !== 0 ? `${trevPct > 0 ? '+' : ''}${trevPct}%` : '-'}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      {/* Decorative Ambient Header Background */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-3 sm:p-4 md:p-8 relative z-10 pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-[11px] sm:text-xs font-semibold backdrop-blur-xs shadow-xs mb-2 sm:mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 영업장별 월별 실적 추이</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight break-keep">영업장별 월별 실적 추이</h1>
            <p className="text-sm text-white/80 mt-1 break-keep">
              선택한 영업장(또는 벨포레 전체)의 2024년부터 현재까지의 월별 매출 및 {selectedFacility === '전체' ? '객실 투숙객' : '방문객'} 추이 비교
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 전체 선택 시에만 3-Way 골프 분리 세그먼트 컨트롤 표출 */}
            {selectedFacility === '전체' && (
              <div className="flex items-center bg-white p-1 rounded-2xl border border-[#D0C6BB]/75 text-xs font-bold shadow-xs overflow-x-auto max-w-full">
                <button
                  onClick={() => setGolfViewMode('COMPARE')}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    golfViewMode === 'COMPARE'
                      ? 'bg-[#284F42] text-white shadow-xs font-bold'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                  title="차트와 테이블에서 골프포함과 골프제외를 나란히 대조합니다"
                >
                  <Scale className="w-3.5 h-3.5 text-[#B59269]" />
                  포함 vs 제외 비교
                </button>
                <button
                  onClick={() => setGolfViewMode('TOTAL')}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    golfViewMode === 'TOTAL'
                      ? 'bg-[#284F42] text-white shadow-xs font-bold'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                  title="골프본부를 포함한 전사 총매출 단일 뷰입니다 (기존과 동일)"
                >
                  <span>🏌️</span>
                  골프포함
                </button>
                <button
                  onClick={() => setGolfViewMode('EX_GOLF')}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    golfViewMode === 'EX_GOLF'
                      ? 'bg-[#284F42] text-white shadow-xs font-bold'
                      : 'text-[#5A6B63] hover:text-[#1B382E]'
                  }`}
                  title="골프본부를 제외한 순수 리조트 실적 단일 뷰입니다"
                >
                  <TreePine className="w-3.5 h-3.5 text-[#B59269]" />
                  골프제외
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#D0C6BB]/75 shadow-xs w-full sm:w-auto justify-between sm:justify-start">
              <Store className="text-[#5A6B63] w-5 h-5 ml-1" />
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="bg-transparent border-0 text-[#1B382E] text-xs sm:text-sm font-bold block flex-1 sm:w-52 p-2 outline-none cursor-pointer"
              >
                {FACILITIES.map(fac => (
                  <option key={fac} value={fac}>
                    {fac === '전체' ? '🏢 전체 (벨포레 전체매출)' : fac}
                  </option>
                ))}
              </select>
              <button 
                onClick={fetchFacilityTrend}
                disabled={loading}
                className="p-2.5 bg-[#284F42] hover:bg-[#1B382E] text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                title="실적 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 V6 탭 전환기: 영업장별 월별 추이 vs 2026 vs 2025 월별 시즌성 매트릭스 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#D0C6BB]/75 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('TREND')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'TREND'
                ? 'bg-[#284F42] text-white shadow-xs'
                : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
            }`}
          >
            <TrendingUp size={17} />
            <span>📈 영업장별 월별 실적 추이 (2024~현재)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SEASONALITY')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'SEASONALITY'
                ? 'bg-[#284F42] text-white shadow-xs'
                : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
            }`}
          >
            <Sparkles size={17} className="text-[#B59269]" />
            <span>📅 2026 vs 2025 월별 시즌성 매트릭스{selectedFacility === '전체' ? ' & TRevPAR' : ` (${selectedFacility})`}</span>
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'SEASONALITY' ? (
          renderSeasonalityView()
        ) : (
          <>
            {loading ? (
              <div className="bg-white rounded-3xl p-16 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 flex flex-col items-center justify-center text-[#5A6B63]">
                <RefreshCw className="w-10 h-10 animate-spin mb-4 text-[#284F42]" />
                <p className="font-bold text-[#1B382E]">데이터를 불러오는 중입니다...</p>
              </div>
            ) : data?.monthlyData && data.monthlyData.length > 0 ? (
              <div className="space-y-6">
                {/* Chart Card */}
                <div className="bg-white rounded-3xl p-3.5 sm:p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#D0C6BB]/40 gap-3">
                    <h2 className="text-lg lg:text-xl font-bold text-[#1B382E] flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#284F42]" />
                      <span>
                        {selectedFacility === '전체' ? '벨포레 전체' : selectedFacility} 월별 매출 추이
                      </span>
                      {selectedFacility === '전체' && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">
                          {golfViewMode === 'COMPARE' ? '포함 vs 제외 듀얼 바 대조' : golfViewMode === 'TOTAL' ? '골프포함 전사 단일 뷰' : '골프제외 순수 리조트 뷰'}
                        </span>
                      )}
                    </h2>

                    {selectedFacility === '전체' && golfViewMode === 'COMPARE' && (
                      <div className="text-xs text-[#5A6B63] font-medium flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-[#1B382E] inline-block"></span> 골프포함 총매출
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-[#B59269] inline-block"></span> 골프제외 순매출
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="h-[400px] w-full">
                    <ReactECharts
                      key={`trend-chart-${selectedFacility}-${golfViewMode}`}
                      option={getChartOptions()}
                      notMerge={true}
                      lazyUpdate={true}
                      style={{ height: '100%', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Data Table Card */}
                <div className="bg-white rounded-3xl p-3.5 sm:p-6 lg:p-8 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#D0C6BB]/40 gap-3">
                    <h2 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
                      <Store className="w-5 h-5 text-[#284F42]" />
                      <span>월별 상세 실적 {selectedFacility === '전체' ? '(벨포레 전체 종합)' : ''}</span>
                    </h2>
                    {selectedFacility === '전체' && (
                      <span className="text-xs font-bold text-[#5A6B63]">
                        {golfViewMode === 'COMPARE' ? '3단 비교: [골프포함 | 골프제외 | 객실투숙객]' : '2단 표출: [매출액 | 객실투숙객]'}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    {renderPivotTable()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-16 shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 flex flex-col items-center justify-center text-[#5A6B63]">
                <AlertCircle className="w-12 h-12 mb-4 text-[#8F9E96]" />
                <p className="font-bold text-[#1B382E] text-lg mb-2">데이터가 존재하지 않습니다.</p>
                <p className="text-sm text-[#5A6B63] text-center max-w-md">
                  <b>{selectedFacility}</b>의 2024년 이후 집계된 매출 데이터가 없습니다.
                </p>
              </div>
            )}

            {/* 신규: 명절/연휴 비교 (API V6 연동) - 맨 아래 배치 */}
            <HolidayComparison />
          </>
        )}
      </div>
    </div>
  );
}
