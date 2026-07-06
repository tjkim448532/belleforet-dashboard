import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from './GlobalDatePicker';
interface SalesData {
  category: string;
  name: string;
  today_actual: number;
  today_ly: number;
  mtd_actual: number;
  mtd_ly: number;
  ytd_actual: number;
  ytd_ly: number;
}

export default function DailySalesReport() {
  const { startDate: date } = useDate();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SalesData[]>([]);
  const [accumulated, setAccumulated] = useState<{ mtd_room_revenue: number; ytd_total_gross: number } | null>(null);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const result = await secureFetcher(`https://belleforet-data.vercel.app/api/v3/dashboard/revenue-summary?date=${date}`);
      const payload = result.data || result;
      if (payload && payload.dailyReportBreakdown) {
        setAccumulated(null);
        setData(payload.dailyReportBreakdown);
      } else {
        setData([]);
        setAccumulated(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('API Error:', err);
      setData([]);
      setAccumulated(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [date]);

  const formatCurrency = (num: number | string) => {
    if (!num) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.round(Number(num)));
  };

  const getGrowthRate = (actual: number | string, ly: number | string) => {
    const act = Number(actual) || 0;
    const lastYear = Number(ly) || 0;
    if (lastYear === 0) return act > 0 ? '100.0' : '0.0';
    return (((act - lastYear) / Math.abs(lastYear)) * 100).toFixed(1);
  };

  const getGrowthColor = (rate: string) => {
    const num = Number(rate);
    if (num > 0) return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10';
    if (num < 0) return 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium">일일 매출 보고서</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">부서별 일계, 월누계, 연누계 목표 및 실적 매트릭스</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <GlobalDatePicker allowRange={false} />
          </div>
          <button 
            onClick={() => fetchSalesData()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors">
            <Download size={16} />
            <span>Excel 다운로드</span>
          </button>
        </div>
      </div>

      {/* 누적 실적 요약 (MTD/YTD) */}
      {accumulated && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#131A2A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">이번 달 누적 객실 매출 (MTD)</h3>
            <div className="text-3xl font-medium text-emerald-600">
              {formatCurrency(accumulated.mtd_room_revenue)}원
            </div>
          </div>
          <div className="bg-white dark:bg-[#131A2A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">올해 누적 총매출 (YTD)</h3>
            <div className="text-3xl font-medium text-blue-600">
              {formatCurrency(accumulated.ytd_total_gross)}원
            </div>
          </div>
        </div>
      )}

      {/* 매트릭스 테이블 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131A2A] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" rowSpan={2}>구분</th>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" colSpan={3}>금일 실적 (Daily)</th>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" colSpan={3}>월 누계 (MTD)</th>
                <th scope="col" className="px-6 py-4 text-center" colSpan={3}>연 누계 (YTD)</th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {/* Daily */}
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-right">전년</th>
                <th scope="col" className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800">증감율(%)</th>
                
                {/* MTD */}
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-right">전년</th>
                <th scope="col" className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800">증감율(%)</th>
                
                {/* YTD */}
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-right">전년</th>
                <th scope="col" className="px-4 py-3 text-center">증감율(%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin mb-3 text-blue-500" size={24} />
                      데이터를 불러오는 중입니다...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">조회된 데이터가 없습니다.</td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const dailyGrowth = getGrowthRate(row.today_actual, row.today_ly);
                  const mtdGrowth = getGrowthRate(row.mtd_actual, row.mtd_ly);
                  const ytdGrowth = getGrowthRate(row.ytd_actual, row.ytd_ly);
                  
                  const isTotalRow = row.name && row.name.includes('Total');

                  return (
                    <tr 
                      key={idx} 
                      className={`
                        hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors
                        ${isTotalRow ? 'bg-amber-50/30 dark:bg-amber-900/10 font-medium' : ''}
                      `}
                    >
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 pl-8">
                        {row.name}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {formatCurrency(row.today_actual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.today_ly)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(dailyGrowth)}`}>
                          {Number(dailyGrowth) > 0 ? '+' : ''}{dailyGrowth}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {formatCurrency(row.mtd_actual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.mtd_ly)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(mtdGrowth)}`}>
                          {Number(mtdGrowth) > 0 ? '+' : ''}{mtdGrowth}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {formatCurrency(row.ytd_actual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.ytd_ly)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(ytdGrowth)}`}>
                          {Number(ytdGrowth) > 0 ? '+' : ''}{ytdGrowth}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
