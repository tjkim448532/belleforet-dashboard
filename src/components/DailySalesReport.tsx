import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from './GlobalDatePicker';
interface SalesData {
  category?: string;
  category_code?: string;
  shop_name: string;
  today_actual: number;
  today_ly: number;
  mtd_actual: number;
  mtd_ly: number;
  ytd_actual: number;
  ytd_ly: number;
  isCategory?: boolean;
  isChild?: boolean;
  isFooter?: boolean;
}

const processSalesData = (rawData: SalesData[]) => {
  // 1. Filter out old fake "... Total" rows
  const filtered = rawData.filter(r => !r.shop_name?.includes('Total'));
  
  // 2. Normalize shop names
  const normalizedMap = new Map<string, SalesData>();
  
  filtered.forEach(item => {
    let rawName = item.shop_name || '알수없음';
    // Remove " - Posting", " - Posting ", "-Posting"
    rawName = rawName.replace(/\s*-\s*Posting\s*/i, '');
    // Remove all spaces
    rawName = rawName.replace(/\s+/g, '');
    // Group variations (e.g., 놀이동산(2024) -> 놀이동산)
    if (rawName.includes('놀이동산')) rawName = '놀이동산';
    if (rawName.includes('사계절썰매')) rawName = '사계절썰매장';
    if (rawName.includes('마리나클럽')) rawName = '마리나클럽';
    
    // Determine category
    const cat = item.category_code || item.category || 'OTHER'; // ensure OTHER is handled
    const key = `${cat}_${rawName}`;
    
    if (normalizedMap.has(key)) {
      const existing = normalizedMap.get(key)!;
      existing.today_actual += Number(item.today_actual || 0);
      existing.today_ly += Number(item.today_ly || 0);
      existing.mtd_actual += Number(item.mtd_actual || 0);
      existing.mtd_ly += Number(item.mtd_ly || 0);
      existing.ytd_actual += Number(item.ytd_actual || 0);
      existing.ytd_ly += Number(item.ytd_ly || 0);
    } else {
      normalizedMap.set(key, {
        ...item,
        shop_name: rawName,
        category: cat,
        today_actual: Number(item.today_actual || 0),
        today_ly: Number(item.today_ly || 0),
        mtd_actual: Number(item.mtd_actual || 0),
        mtd_ly: Number(item.mtd_ly || 0),
        ytd_actual: Number(item.ytd_actual || 0),
        ytd_ly: Number(item.ytd_ly || 0),
      });
    }
  });

  // Group by Category
  const grouped: Record<string, SalesData[]> = {};
  Array.from(normalizedMap.values()).forEach(item => {
    let catName = item.category === 'ROOM' ? '객실' :
                  item.category === 'GOLF' ? '골프장' :
                  item.category === 'TICKET' ? '티켓/레저' :
                  item.category === 'FNB' ? '식음' :
                  item.category === 'MOTO' ? '모토아레나' :
                  item.category === 'BANQUET' ? '연회' : '기타영업';
    
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(item);
  });
  
  // Create final array with Category Parent Rows and Grand Total
  const finalArray: SalesData[] = [];
  const grandTotal = { today_actual: 0, today_ly: 0, mtd_actual: 0, mtd_ly: 0, ytd_actual: 0, ytd_ly: 0 };
  
  // Define custom sort order for categories
  const sortOrder = ['객실', '골프장', '티켓/레저', '식음', '모토아레나', '연회', '기타영업'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const idxA = sortOrder.indexOf(a);
    const idxB = sortOrder.indexOf(b);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  sortedCategories.forEach(catName => {
    const children = grouped[catName];
    // calc parent total
    const parentTotal = children.reduce((acc, curr) => ({
      today_actual: acc.today_actual + curr.today_actual,
      today_ly: acc.today_ly + curr.today_ly,
      mtd_actual: acc.mtd_actual + curr.mtd_actual,
      mtd_ly: acc.mtd_ly + curr.mtd_ly,
      ytd_actual: acc.ytd_actual + curr.ytd_actual,
      ytd_ly: acc.ytd_ly + curr.ytd_ly,
    }), { today_actual: 0, today_ly: 0, mtd_actual: 0, mtd_ly: 0, ytd_actual: 0, ytd_ly: 0 });
    
    grandTotal.today_actual += parentTotal.today_actual;
    grandTotal.today_ly += parentTotal.today_ly;
    grandTotal.mtd_actual += parentTotal.mtd_actual;
    grandTotal.mtd_ly += parentTotal.mtd_ly;
    grandTotal.ytd_actual += parentTotal.ytd_actual;
    grandTotal.ytd_ly += parentTotal.ytd_ly;
    
    // Add Parent row
    finalArray.push({
      isCategory: true,
      shop_name: catName,
      ...parentTotal
    });
    
    // Add Child rows
    children.forEach(child => {
      finalArray.push({
        isChild: true,
        ...child
      });
    });
  });
  
  // Add Footer Row
  finalArray.push({
    isFooter: true,
    shop_name: '총계 (Grand Total)',
    ...grandTotal
  });
  
  return finalArray;
};

export default function DailySalesReport() {
  const { startDate: date } = useDate();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SalesData[]>([]);
  const [accumulated, setAccumulated] = useState<{ mtd_room_revenue: number; ytd_total_gross: number } | null>(null);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const result = await secureFetcher(`https://belleforet-data.vercel.app/api/v3/dashboard/revenue-summary?startDate=${date}&endDate=${date}`);
      const payload = result.data || result;
      if (payload && payload.dailyReportBreakdown) {
        setAccumulated(null);
        setData(processSalesData(payload.dailyReportBreakdown));
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
                  
                  const isCategory = row.isCategory;
                  const isChild = row.isChild;
                  const isFooter = row.isFooter;

                  return (
                    <tr 
                      key={idx} 
                      className={`
                        transition-colors
                        ${isFooter ? 'bg-indigo-50 dark:bg-indigo-900/30 font-bold border-t-2 border-indigo-200 dark:border-indigo-800' : ''}
                        ${isCategory ? 'bg-slate-100 dark:bg-slate-800/80 font-semibold' : ''}
                        ${isChild ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50' : ''}
                      `}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 ${isChild ? 'pl-10 text-slate-600 dark:text-slate-400' : 'pl-6'}`}>
                        {isCategory && <span className="mr-2 inline-block w-2 h-2 rounded-full bg-blue-500"></span>}
                        {isChild && <span className="mr-2 text-slate-400">ㄴ</span>}
                        {row.shop_name}
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
