import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from './GlobalDatePicker';
import { standardizeGridRows } from '../lib/standardVenueUtils';

interface GridRow {
  categoryCode?: string;
  categoryName?: string;
  teamName?: string;
  partName?: string;
  shopName: string;
  facilityName?: string;
  todayActual: number;
  todayLy: number;
  todayGrowth?: number;
  mtdActual: number;
  mtdLy: number;
  mtdGrowth?: number;
  ytdActual: number;
  ytdLy: number;
  ytdGrowth?: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  isCategorySubtotal?: boolean;
}

export default function DailySalesReport() {
  const { startDate: date } = useDate();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<GridRow[]>([]);
  const [accumulated, setAccumulated] = useState<{ mtd_room_revenue: number; ytd_total_gross: number } | null>(null);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      const result = await secureFetcher(`${API_BASE}/api/v6/dashboard/overview?date=${date}&_t=${Date.now()}`);
      const payload = result.data || result;
      
      // V6 SSOT Zero-Proxy: Bind directly from backend finished gridData with standard facility rollup
      if (payload && payload.gridData) {
        const roomCat = (payload.salesByCategory || []).find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도');
        setAccumulated({
          mtd_room_revenue: Number(roomCat?.mtdActual || 0),
          ytd_total_gross: Number(payload.summary?.ytdRevenue || payload.summary?.ytdActual || 0)
        });
        setData(standardizeGridRows(payload.gridData));
      } else {
        setData([]);
        setAccumulated(null);
      }
    } catch (err) {
      console.error('DailySalesReport V6 API Error:', err);
      setData([]);
      setAccumulated(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [date]);

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
    return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const getGrowthColor = (growth: number | undefined) => {
    if (growth === undefined || growth === null) return 'text-slate-500 dark:text-slate-400';
    if (growth > 0) return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10';
    if (growth < 0) return 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium">일일 매출 보고서 (V6 SSOT)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">부서별 일계, 월누계, 연누계 목표 및 실적 매트릭스</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
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
                  const isGrandTotal = row.isGrandTotal || row.shopName === '총계 (Grand Total)';
                  const isSubtotal = row.isSubtotal;
                  const isChild = !isSubtotal && !isGrandTotal;

                  const displayName = row.shopName || row.facilityName || row.categoryName || '';

                  return (
                    <tr 
                      key={idx} 
                      className={`
                        transition-colors
                        ${isGrandTotal ? 'bg-indigo-50 dark:bg-indigo-900/30 font-bold border-t-2 border-indigo-200 dark:border-indigo-800' : ''}
                        ${isSubtotal ? 'bg-brand-mint/10 dark:bg-brand-mint/20 font-semibold border-t border-brand-mint/30' : ''}
                        ${isChild ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50' : ''}
                      `}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 ${isChild ? 'pl-10 text-slate-600 dark:text-slate-400' : 'pl-6 font-bold'}`}>
                        {isSubtotal && <span className="mr-2 inline-block w-2 h-2 rounded-full bg-teal-500"></span>}
                        {isChild && <span className="mr-2 text-slate-400">ㄴ</span>}
                        {displayName}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {formatCurrency(row.todayActual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatCurrency(row.todayLy)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(row.todayGrowth)}`}>
                          {row.todayGrowth !== undefined && row.todayGrowth > 0 ? '+' : ''}{row.todayGrowth !== undefined ? Number(row.todayGrowth).toFixed(1) : '0.0'}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {formatCurrency(row.mtdActual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatCurrency(row.mtdLy)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(row.mtdGrowth)}`}>
                          {row.mtdGrowth !== undefined && row.mtdGrowth > 0 ? '+' : ''}{row.mtdGrowth !== undefined ? Number(row.mtdGrowth).toFixed(1) : '0.0'}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {formatCurrency(row.ytdActual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatCurrency(row.ytdLy)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGrowthColor(row.ytdGrowth)}`}>
                          {row.ytdGrowth !== undefined && row.ytdGrowth > 0 ? '+' : ''}{row.ytdGrowth !== undefined ? Number(row.ytdGrowth).toFixed(1) : '0.0'}%
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
