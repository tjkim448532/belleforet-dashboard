import { useState, useEffect, Fragment } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { Store, TrendingUp, Calendar, AlertCircle, RefreshCw, Scale, TreePine } from 'lucide-react';
import { useDate } from '../contexts/DateContext';
import HolidayComparison from '../components/dashboard/HolidayComparison';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 영업장 목록 ('전체' 포함)
const FACILITIES = [
  '전체',
  'ROOM', 'ROOM OTHER', '그린피', '기타매출', '카트대여', '클럽-레스토랑',
  '클럽-스타트하우스', '프로샵', '벨포레 리조트', 'BHC(멕시카나)', 'CU편의점',
  '남도예담', '딜라이트', '밤밤테이블', '브리스킷346', '쿠치나', '투썸플레이스',
  '연회장', '놀이동산', '회전그네', '벨포레 목장', '벨포레 목장(체험)', '얼룩말카페',
  '미디어-기프트샵', '미디어-뮤지엄카페', '미디어아트센터', '마운틴카트', '사계절썰매장',
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
  const { startDate, endDate } = useDate();
  const [selectedFacility, setSelectedFacility] = useState<string>('전체');
  const [golfViewMode, setGolfViewMode] = useState<GolfViewMode>('COMPARE');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<{ facility: string; monthlyData: MonthlyDataPoint[] } | null>(null);

  const fetchFacilityTrend = async () => {
    setLoading(true);
    try {
      if (selectedFacility === '전체') {
        // 벨포레 전체 매출 (SSOT: /api/v6/report/monthly-trends 및 /api/v6/report/room-guests-yoy)
        const [res2024, res2025, res2026, guestsRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2024`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2025`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/monthly-trends?year=2026`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/room-guests-yoy`).catch(() => null),
        ]);

        const guestsMap: Record<string, number> = {};
        if (guestsRes && Array.isArray(guestsRes.matrix)) {
          guestsRes.matrix.forEach((row: any) => {
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
          if (res && Array.isArray(res.data)) {
            res.data.forEach((item: any) => {
              const rawM = String(item.month);
              const mKey = `${rawM.substring(0, 4)}-${rawM.substring(4, 6)}`;
              const totRev = Math.round(Number(item.totalRevenue ?? item.revenue ?? 0));
              const gRev = Math.round(Number(item.golfRevenue ?? 0));
              const exRev = item.exGolfRevenue !== undefined && item.exGolfRevenue !== null
                ? Math.round(Number(item.exGolfRevenue))
                : Math.max(0, totRev - gRev);

              monthlyDataMap.set(mKey, {
                revenue: totRev,
                totalRevenue: totRev,
                golfRevenue: gRev,
                exGolfRevenue: exRev,
                visitors: guestsMap[mKey] || 0
              });
            });
          }
        };

        appendYear(res2024);
        appendYear(res2025);
        appendYear(res2026);

        // 2024-01부터 데이터가 존재하는 최신 월까지 연속 월 배열 생성 (과거 날짜 캐시로 인한 잘림 방지)
        const allMonths = Array.from(monthlyDataMap.keys()).sort();
        const latestAvailableMonth = allMonths.length > 0 ? allMonths[allMonths.length - 1] : '2026-12';
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
          setData({
            facility: selectedFacility,
            monthlyData: mapped
          });
        } else {
          setData(null);
        }
      }
    } catch (err) {
      console.error('Facility Trend Fetch Error:', err);
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
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
            <th className="px-6 py-4 rounded-tl-xl text-center border-b border-slate-200">월 (Month)</th>
            {years.map((year: string, idx) => (
              <th 
                key={year} 
                colSpan={colSpanPerYear} 
                className={`px-6 py-4 text-center border-b border-slate-200 ${idx === years.length - 1 ? 'rounded-tr-xl' : 'border-r'}`}
              >
                {year}년
              </th>
            ))}
          </tr>
          <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-bold">
            <th className="px-6 py-2 text-center border-b border-slate-200 bg-slate-50/50"></th>
            {years.map((year: string, idx) => (
              <Fragment key={year}>
                {isCompare ? (
                  <>
                    <th className="px-4 py-2 text-right border-b border-slate-200 text-slate-900 bg-indigo-50/40">골프포함</th>
                    <th className="px-4 py-2 text-right border-b border-slate-200 text-sky-700 bg-sky-50/40">골프제외</th>
                    <th className={`px-4 py-2 text-right border-b border-slate-200 text-emerald-700 ${idx === years.length - 1 ? '' : 'border-r'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                ) : isExGolf ? (
                  <>
                    <th className="px-4 py-2 text-right border-b border-slate-200 text-sky-800">골프제외 순매출</th>
                    <th className={`px-4 py-2 text-right border-b border-slate-200 ${idx === years.length - 1 ? '' : 'border-r'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2 text-right border-b border-slate-200">매출액</th>
                    <th className={`px-4 py-2 text-right border-b border-slate-200 ${idx === years.length - 1 ? '' : 'border-r'}`}>
                      {selectedFacility === '전체' ? '객실 투숙객' : '방문객'}
                    </th>
                  </>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4 font-bold text-slate-800 text-center bg-slate-50/30">{row.month}</td>
              {row.data.map((col: any, cIdx) => (
                <Fragment key={col.year as string}>
                  {isCompare ? (
                    <>
                      <td className={`px-4 py-4 text-right font-black tabular-nums ${col.totalRevenue > 0 ? 'text-slate-900 bg-indigo-50/20' : 'text-slate-400'}`}>
                        {col.totalRevenue > 0 ? `${formatCurrency(col.totalRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-bold tabular-nums ${col.exGolfRevenue > 0 ? 'text-sky-700 bg-sky-50/20' : 'text-slate-400'}`}>
                        {col.exGolfRevenue > 0 ? `${formatCurrency(col.exGolfRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-emerald-600' : 'text-slate-400'} ${cIdx === years.length - 1 ? '' : 'border-r border-slate-100'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  ) : isExGolf ? (
                    <>
                      <td className={`px-4 py-4 text-right font-black tabular-nums ${col.exGolfRevenue > 0 ? 'text-sky-700' : 'text-slate-400'}`}>
                        {col.exGolfRevenue > 0 ? `${formatCurrency(col.exGolfRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-emerald-600' : 'text-slate-400'} ${cIdx === years.length - 1 ? '' : 'border-r border-slate-100'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-4 py-4 text-right font-black tabular-nums ${col.totalRevenue > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {col.totalRevenue > 0 ? `${formatCurrency(col.totalRevenue)}원` : '-'}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium tabular-nums ${col.visitors > 0 ? 'text-emerald-600' : 'text-slate-400'} ${cIdx === years.length - 1 ? '' : 'border-r border-slate-100'}`}>
                        {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                      </td>
                    </>
                  )}
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                Facility Monthly Trend
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                2024 ~ Present
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <TrendingUp className="text-[#00ae95] w-8 h-8" />
              영업장별 월별 실적 추이
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              선택한 영업장(또는 벨포레 전체)의 2024년부터 현재까지의 월별 매출 및 {selectedFacility === '전체' ? '객실 투숙객' : '방문객'} 추이를 비교합니다.<br/>
              <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg mt-1 inline-block border border-slate-200">
                💡 식음료(FNB) 및 연회 업장은 아이템 단위 판매이므로 진성 방문객수가 0명으로 집계됩니다. (전체 선택 시 리조트 객실 투숙객 기준)
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 전체 선택 시에만 3-Way 골프 분리 세그먼트 컨트롤 표출 */}
            {selectedFacility === '전체' && (
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold shadow-xs">
                <button
                  onClick={() => setGolfViewMode('COMPARE')}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    golfViewMode === 'COMPARE'
                      ? 'bg-white text-indigo-900 shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="차트와 테이블에서 골프포함과 골프제외를 나란히 대조합니다"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  포함 vs 제외 비교
                </button>
                <button
                  onClick={() => setGolfViewMode('TOTAL')}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    golfViewMode === 'TOTAL'
                      ? 'bg-white text-emerald-800 shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-white text-sky-800 shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="골프본부를 제외한 순수 리조트 실적 단일 뷰입니다"
                >
                  <TreePine className="w-3.5 h-3.5 text-sky-600" />
                  골프제외
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <Store className="text-slate-400 w-5 h-5 ml-1" />
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-52 p-2 outline-none cursor-pointer"
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
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                title="실적 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-[#00ae95]" />
          <p className="font-bold">데이터를 불러오는 중입니다...</p>
        </div>
      ) : data?.monthlyData && data.monthlyData.length > 0 ? (
        <div className="space-y-6">
          {/* Chart Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00ae95]" />
                <span>
                  {selectedFacility === '전체' ? '벨포레 전체' : selectedFacility} 월별 매출 추이
                </span>
                {selectedFacility === '전체' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {golfViewMode === 'COMPARE' ? '포함 vs 제외 듀얼 바 대조' : golfViewMode === 'TOTAL' ? '골프포함 전사 단일 뷰' : '골프제외 순수 리조트 뷰'}
                  </span>
                )}
              </h2>

              {selectedFacility === '전체' && golfViewMode === 'COMPARE' && (
                <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-slate-900 inline-block"></span> 골프포함 총매출
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-indigo-500 inline-block"></span> 골프제외 순매출
                  </span>
                </div>
              )}
            </div>

            <div className="h-[400px] w-full">
              <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-500" />
                <span>월별 상세 실적 {selectedFacility === '전체' ? '(벨포레 전체 종합)' : ''}</span>
              </h2>
              {selectedFacility === '전체' && (
                <span className="text-xs font-bold text-slate-500">
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
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-bold text-slate-600 text-lg mb-2">데이터가 존재하지 않습니다.</p>
          <p className="text-sm text-slate-400 text-center max-w-md">
            <b>{selectedFacility}</b>의 2024년 이후 집계된 매출 데이터가 없습니다.
          </p>
        </div>
      )}

      {/* 신규: 명절/연휴 비교 (API V6 연동) - 맨 아래 배치 */}
      <HolidayComparison />
    </div>
  );
}
