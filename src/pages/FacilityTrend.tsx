import { useState, useEffect } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import ReactECharts from 'echarts-for-react';
import { Store, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { useDate } from '../contexts/DateContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// 하드코딩된 임시 영업장 목록 (추후 백엔드/매핑 컨텍스트에서 동적으로 가져올 수 있음)
const FACILITIES = [
  '브리스켓346',
  '벼루',
  '벼루재촌',
  '클럽하우스',
  '사계절썰매장',
  '놀이동산',
  '루지',
  '익스트림루지',
  '미디어아트센터',
  '콘도',
  '골프장'
];

export default function FacilityTrend() {
  const { startDate } = useDate();
  const [selectedFacility, setSelectedFacility] = useState<string>('브리스켓346');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchFacilityTrend();
  }, [selectedFacility, startDate]);

  const fetchFacilityTrend = async () => {
    setLoading(true);
    try {
      // 2024-01-01부터 현재 선택된 날짜(startDate)까지의 데이터를 가져오도록 설계
      const res = await secureFetcher(`${API_BASE}/api/v6/report/facility-monthly-trend?facility=${encodeURIComponent(selectedFacility)}&endDate=${startDate}`).catch(() => null);
      const payload = res?.data ?? res;
      
      if (payload && payload.monthlyData) {
        setData(payload);
      } else {
        setData(null);
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

  // ECharts 옵션 구성
  const getChartOptions = () => {
    if (!data || !data.monthlyData || data.monthlyData.length === 0) return {};

    const months = data.monthlyData.map((d: any) => d.month); // e.g., '2024-01', '2024-02'
    const revenues = data.monthlyData.map((d: any) => d.revenue);
    const visitors = data.monthlyData.map((d: any) => d.visitors);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['매출액(원)', '방문객수(명)'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: months,
          axisPointer: { type: 'shadow' }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '매출액',
          axisLabel: { formatter: '{value}' }
        },
        {
          type: 'value',
          name: '방문객수',
          axisLabel: { formatter: '{value}' }
        }
      ],
      series: [
        {
          name: '매출액(원)',
          type: 'bar',
          data: revenues,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '방문객수(명)',
          type: 'line',
          yAxisIndex: 1,
          data: visitors,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                Facility Monthly Trend
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                2024 ~ Present
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <TrendingUp className="text-blue-600 w-8 h-8" />
              영업장별 월별 실적 추이
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              선택한 영업장의 2024년부터 현재까지의 월별 매출 및 방문객 추이를 비교합니다.<br/>
              <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg mt-1 inline-block border border-amber-100">
                💡 식음료(FNB) 및 연회 업장은 아이템 단위 판매이므로 진성 방문객수가 0명으로 집계됩니다.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <Store className="text-slate-400 w-5 h-5 ml-1" />
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-48 p-2.5 outline-none cursor-pointer"
            >
              {FACILITIES.map(fac => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
            <button 
              onClick={fetchFacilityTrend}
              disabled={loading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500" />
          <p className="font-bold">데이터를 불러오는 중입니다...</p>
        </div>
      ) : data?.monthlyData?.length > 0 ? (
        <div className="space-y-6">
          {/* Chart Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" /> {selectedFacility} 월별 매출 추이
            </h2>
            <div className="h-[400px] w-full">
              <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-500" /> 월별 상세 실적
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                    <th className="px-6 py-4 rounded-l-xl">연월 (Month)</th>
                    <th className="px-6 py-4 text-right">총 매출액 (원)</th>
                    <th className="px-6 py-4 text-right rounded-r-xl">방문객 수 (명)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.monthlyData.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{row.month}</td>
                      <td className="px-6 py-4 text-right font-black text-blue-600">₩{formatCurrency(row.revenue)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatCurrency(row.visitors)}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-slate-400">
          <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-bold text-slate-600 text-lg mb-2">데이터가 없거나 백엔드 연동 전입니다.</p>
          <p className="text-sm text-slate-400 text-center max-w-md">
            <b>{selectedFacility}</b>의 2024년 이후 매출 데이터가 백엔드에서 아직 제공되지 않고 있습니다.<br/>
            (백엔드 API: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">/api/v6/report/facility-monthly-trend</code>)
          </p>
        </div>
      )}
    </div>
  );
}
