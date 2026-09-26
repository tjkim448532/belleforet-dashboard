import { useState, useEffect, Fragment } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { Store, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
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

export default function FacilityTrend() {
  const { startDate } = useDate();
  const [selectedFacility, setSelectedFacility] = useState<string>('브리스킷346');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchFacilityTrend();
  }, [selectedFacility, startDate]);

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

        const monthlyDataMap = new Map<string, { revenue: number; visitors: number }>();
        const appendYear = (res: any) => {
          if (res && Array.isArray(res.data)) {
            res.data.forEach((item: any) => {
              const rawM = String(item.month);
              const mKey = `${rawM.substring(0, 4)}-${rawM.substring(4, 6)}`;
              monthlyDataMap.set(mKey, {
                revenue: Math.round(Number(item.revenue || 0)),
                visitors: guestsMap[mKey] || 0
              });
            });
          }
        };

        appendYear(res2024);
        appendYear(res2025);
        appendYear(res2026);

        // 2024-01부터 현재 선택된 날짜(startDate) 월까지 연속 월 배열 생성
        const endYearMonth = startDate ? startDate.substring(0, 7) : '2026-12';
        const [endYear, endMonth] = endYearMonth.split('-').map(Number);
        
        let curYear = 2024;
        let curMonth = 1;
        const monthlyData: { month: string; revenue: number; visitors: number }[] = [];

        while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
          const monthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
          const found = monthlyDataMap.get(monthKey) || { revenue: 0, visitors: guestsMap[monthKey] || 0 };
          monthlyData.push({
            month: monthKey,
            revenue: found.revenue,
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
        // 개별 영업장 조회 (2024-01-01부터 현재 선택된 날짜까지)
        const res = await secureFetcher(`${API_BASE}/api/v6/report/facility-monthly-trend?facility=${encodeURIComponent(selectedFacility)}&endDate=${startDate}`).catch(() => null);
        const payload = res?.data ?? res;
        
        if (payload && payload.monthlyData) {
          setData(payload);
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));
  };

  // ECharts 옵션 구성 (YoY 비교)
  const getChartOptions = () => {
    if (!data || !data.monthlyData || data.monthlyData.length === 0) return {};

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const years = Array.from(new Set(data.monthlyData.map((d: any) => d.month.substring(0, 4)))).sort();
    
    const seriesData: any[] = [];
    const legendData: string[] = [];
    const colors = ['#94a3b8', '#00ae95', '#0f172a', '#10b981'];
    
    years.forEach((year: any, idx: number) => {
      const yearRevenue = Array(12).fill(0);
      const yearVisitors = Array(12).fill(0);
      
      data.monthlyData.forEach((d: any) => {
        if (d.month.startsWith(year)) {
          const monthIdx = parseInt(d.month.substring(5, 7), 10) - 1;
          yearRevenue[monthIdx] = d.revenue || 0;
          yearVisitors[monthIdx] = d.visitors || 0;
        }
      });
      
      const color = colors[idx % colors.length];
      
      legendData.push(`${year}년 매출`);
      seriesData.push({
        name: `${year}년 매출`,
        type: 'bar',
        data: yearRevenue,
        itemStyle: { color: color, borderRadius: [4, 4, 0, 0] }
      });
      
      legendData.push(`${year}년 방문객`);
      seriesData.push({
        name: `${year}년 방문객`,
        type: 'line',
        yAxisIndex: 1,
        data: yearVisitors,
        itemStyle: { color: color },
        lineStyle: { width: 2, type: 'dashed' }
      });
    });

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: legendData, bottom: 0, type: 'scroll' },
      grid: { left: '3%', right: '3%', bottom: '15%', containLabel: true },
      xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
      yAxis: [
        { type: 'value', name: '매출액', axisLabel: { formatter: '{value}' } },
        { type: 'value', name: '방문객수', axisLabel: { formatter: '{value}' } }
      ],
      series: seriesData
    };
  };

  const renderPivotTable = () => {
    if (!data || !data.monthlyData || data.monthlyData.length === 0) return null;
    
    const years = Array.from(new Set(data.monthlyData.map((d: any) => d.month.substring(0, 4)))).sort();
    const rows = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      const rowCols = years.map(year => {
        const target = `${year}-${monthStr}`;
        const match = data.monthlyData.find((d: any) => d.month === target);
        return { year, revenue: match?.revenue || 0, visitors: match?.visitors || 0 };
      });
      rows.push({ month: `${i}월`, data: rowCols });
    }
    
    return (
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
            <th className="px-6 py-4 rounded-tl-xl text-center border-b border-slate-200">월 (Month)</th>
            {years.map((year: any, idx) => (
              <th key={year} colSpan={2} className={`px-6 py-4 text-center border-b border-slate-200 ${idx === years.length - 1 ? 'rounded-tr-xl' : 'border-r'}`}>
                {year}년
              </th>
            ))}
          </tr>
          <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-bold">
            <th className="px-6 py-2 text-center border-b border-slate-200 bg-slate-50/50"></th>
            {years.map((year: any, idx) => (
              <Fragment key={year}>
                <th className="px-4 py-2 text-right border-b border-slate-200">매출액</th>
                <th className={`px-4 py-2 text-right border-b border-slate-200 ${idx === years.length - 1 ? '' : 'border-r'}`}>방문객</th>
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
                  <td className={`px-4 py-4 text-right font-black ${col.revenue > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {col.revenue > 0 ? `₩${formatCurrency(col.revenue)}` : '-'}
                  </td>
                  <td className={`px-4 py-4 text-right font-medium ${col.visitors > 0 ? 'text-emerald-600' : 'text-slate-400'} ${cIdx === years.length - 1 ? '' : 'border-r border-slate-100'}`}>
                    {col.visitors > 0 ? `${formatCurrency(col.visitors)}명` : '-'}
                  </td>
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
              선택한 영업장(또는 벨포레 전체)의 2024년부터 현재까지의 월별 매출 및 방문객 추이를 비교합니다.<br/>
              <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg mt-1 inline-block border border-slate-200">
                💡 식음료(FNB) 및 연회 업장은 아이템 단위 판매이므로 진성 방문객수가 0명으로 집계됩니다. (전체 선택 시 리조트 객실 투숙객 기준)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <Store className="text-slate-400 w-5 h-5 ml-1" />
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-52 p-2.5 outline-none cursor-pointer"
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
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-[#00ae95]" />
          <p className="font-bold">데이터를 불러오는 중입니다...</p>
        </div>
      ) : data?.monthlyData?.length > 0 ? (
        <div className="space-y-6">
          {/* Chart Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00ae95]" /> {selectedFacility === '전체' ? '벨포레 전체' : selectedFacility} 월별 매출 추이
            </h2>
            <div className="h-[400px] w-full">
              <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-500" /> 월별 상세 실적 {selectedFacility === '전체' ? '(벨포레 전체 종합)' : ''}
            </h2>
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
