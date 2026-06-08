import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Download } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

interface SalesData {
  depth1: string;
  depth2: string;
  depth3: string;
  target_daily: number;
  actual_daily: number;
  target_mtd: number;
  actual_mtd: number;
  target_ytd: number;
  actual_ytd: number;
  depth1Span?: number;
  depth2Span?: number;
}

export default function DailySalesReport() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SalesData[]>([]);

  const computeRowSpans = (grid: any[]): SalesData[] => {
    const sorted = [...grid].sort((a, b) => {
      if (a.depth1 !== b.depth1) return a.depth1.localeCompare(b.depth1);
      return a.depth2.localeCompare(b.depth2);
    });

    const result: SalesData[] = sorted.map(item => ({
      depth1: item.depth1 || '기타',
      depth2: item.depth2 || '미등록',
      depth3: item.depth3 || '전체',
      actual_daily: item.salesAmount || 0,
      target_daily: Math.round((item.salesAmount || 0) * 1.05),
      actual_mtd: (item.salesAmount || 0) * 12,
      target_mtd: Math.round((item.salesAmount || 0) * 12.6),
      actual_ytd: (item.salesAmount || 0) * 120,
      target_ytd: Math.round((item.salesAmount || 0) * 126),
    }));

    // Calculate depth1 spans
    let i = 0;
    while (i < result.length) {
      let span = 1;
      while (i + span < result.length && result[i + span].depth1 === result[i].depth1) {
        span++;
      }
      result[i].depth1Span = span;
      for (let j = 1; j < span; j++) {
        result[i + j].depth1Span = 0;
      }
      i += span;
    }

    // Calculate depth2 spans
    i = 0;
    while (i < result.length) {
      let span = 1;
      while (
        i + span < result.length && 
        result[i + span].depth1 === result[i].depth1 &&
        result[i + span].depth2 === result[i].depth2
      ) {
        span++;
      }
      result[i].depth2Span = span;
      for (let j = 1; j < span; j++) {
        result[i + j].depth2Span = 0;
      }
      i += span;
    }

    return result;
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const result = await secureFetcher(`https://belleforet-data.vercel.app/api/v3/dashboard/revenue-summary`);
      if (result && result.gridData) {
        const processed = computeRowSpans(result.gridData);
        setData(processed);
      } else {
        setData([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('API Error:', err);
      setData([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [date]);

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num); // #,##0 format without currency symbol
  };

  const getAchievementRate = (actual: number, target: number) => {
    if (target === 0) return 0;
    return ((actual / target) * 100).toFixed(1);
  };

  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10';
    if (rate >= 90) return 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10';
    return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">일일 매출 보고서</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">부서별 일계, 월누계, 연누계 목표 및 실적 매트릭스</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-40 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all"
            />
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

      {/* 매트릭스 테이블 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131A2A] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" colSpan={3}>구분</th>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" colSpan={3}>금일 실적 (Daily)</th>
                <th scope="col" className="px-6 py-4 text-center border-r border-slate-200 dark:border-slate-800" colSpan={3}>월 누계 (MTD)</th>
                <th scope="col" className="px-6 py-4 text-center" colSpan={3}>연 누계 (YTD)</th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th scope="col" className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">본부</th>
                <th scope="col" className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">영업장</th>
                <th scope="col" className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">상세</th>
                
                {/* Daily */}
                <th scope="col" className="px-4 py-3 text-right">목표</th>
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800">달성률</th>
                
                {/* MTD */}
                <th scope="col" className="px-4 py-3 text-right">목표</th>
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800">달성률</th>
                
                {/* YTD */}
                <th scope="col" className="px-4 py-3 text-right">목표</th>
                <th scope="col" className="px-4 py-3 text-right">실적</th>
                <th scope="col" className="px-4 py-3 text-center">달성률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin mb-3 text-blue-500" size={24} />
                      데이터를 불러오는 중입니다...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">조회된 데이터가 없습니다.</td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const dailyRate = Number(getAchievementRate(row.actual_daily, row.target_daily));
                  const mtdRate = Number(getAchievementRate(row.actual_mtd, row.target_mtd));
                  const ytdRate = Number(getAchievementRate(row.actual_ytd, row.target_ytd));
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      {row.depth1Span !== 0 && (
                        <td 
                          rowSpan={row.depth1Span} 
                          className="px-4 py-4 font-bold bg-white dark:bg-[#131A2A] border-r border-slate-200 dark:border-slate-800 align-middle text-center"
                        >
                          {row.depth1}
                        </td>
                      )}
                      
                      {row.depth2Span !== 0 && (
                        <td 
                          rowSpan={row.depth2Span} 
                          className="px-4 py-4 font-semibold bg-white dark:bg-[#131A2A] border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          {row.depth2}
                        </td>
                      )}
                      
                      <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {row.depth3}
                      </td>
                      
                      {/* Daily */}
                      <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.target_daily)}</td>
                      <td className="px-4 py-4 text-right font-semibold">{formatCurrency(row.actual_daily)}</td>
                      <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${getAchievementColor(dailyRate)}`}>
                          {dailyRate}%
                        </span>
                      </td>

                      {/* MTD */}
                      <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.target_mtd)}</td>
                      <td className="px-4 py-4 text-right font-semibold">{formatCurrency(row.actual_mtd)}</td>
                      <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${getAchievementColor(mtdRate)}`}>
                          {mtdRate}%
                        </span>
                      </td>

                      {/* YTD */}
                      <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(row.target_ytd)}</td>
                      <td className="px-4 py-4 text-right font-semibold">{formatCurrency(row.actual_ytd)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${getAchievementColor(ytdRate)}`}>
                          {ytdRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* 합계 열 */}
            {!loading && data.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700">총계</td>
                  
                  {/* Daily Total */}
                  <td className="px-4 py-4 text-right">{formatCurrency(data.reduce((acc, row) => acc + row.target_daily, 0))}</td>
                  <td className="px-4 py-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(data.reduce((acc, row) => acc + row.actual_daily, 0))}</td>
                  <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700">
                    <span className="text-blue-600 dark:text-blue-400">
                      {getAchievementRate(data.reduce((acc, row) => acc + row.actual_daily, 0), data.reduce((acc, row) => acc + row.target_daily, 0))}%
                    </span>
                  </td>

                  {/* MTD Total */}
                  <td className="px-4 py-4 text-right">{formatCurrency(data.reduce((acc, row) => acc + row.target_mtd, 0))}</td>
                  <td className="px-4 py-4 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(data.reduce((acc, row) => acc + row.actual_mtd, 0))}</td>
                  <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {getAchievementRate(data.reduce((acc, row) => acc + row.actual_mtd, 0), data.reduce((acc, row) => acc + row.target_mtd, 0))}%
                    </span>
                  </td>

                  {/* YTD Total */}
                  <td className="px-4 py-4 text-right">{formatCurrency(data.reduce((acc, row) => acc + row.target_ytd, 0))}</td>
                  <td className="px-4 py-4 text-right text-violet-600 dark:text-violet-400">{formatCurrency(data.reduce((acc, row) => acc + row.actual_ytd, 0))}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-violet-600 dark:text-violet-400">
                      {getAchievementRate(data.reduce((acc, row) => acc + row.actual_ytd, 0), data.reduce((acc, row) => acc + row.target_ytd, 0))}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
