import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformMatrixData, type MatrixRow } from '../lib/dataTransformers';
import { secureFetcher } from '../lib/secureFetcher';

// Utility to format currency
const formatCurrency = (value: number) => {
  if (!value) return '0';
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
};

const formatGrowth = (rate: number) => {
  if (rate === 0) return '0.00';
  const formatted = rate.toFixed(2);
  return rate > 0 ? `+${formatted}` : formatted;
};

export default function MatrixWeeklyDashboard() {
  const { startDate } = useDate();
  const coreData = useCoreData();
  const [checkedShops, setCheckedShops] = useState<string[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<Record<string, MatrixRow>>({});
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [lastYearWeather, setLastYearWeather] = useState<any>(null);

  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        
        // Fetch matrix weekly data
        const res = await secureFetcher(`${API_BASE}/api/v3/dashboard/matrix-weekly?date=${startDate}`);
        const result = res.data || res;
        const dataArray = Array.isArray(result) ? result : (result.data || []);
        
        // Fetch weather for startDate specifically if it's missing from global state
        if (!coreData.core?.weather) {
          try {
            const weatherRes = await secureFetcher(`${API_BASE}/api/v3/dashboard/revenue-summary?startDate=${startDate}&endDate=${startDate}&date=${startDate}`);
            const w = weatherRes.data?.weather || weatherRes.weather || weatherRes.data?.core?.weather;
            if (w) {
              setCurrentWeather(w.current || null);
              setLastYearWeather(w.lastYear || null);
            }
          } catch (e) {
            console.error('Failed to fetch weather', e);
          }
        }
        
        const map: Record<string, MatrixRow> = {};
        dataArray.forEach((row: any) => {
          if (row.category_code) {
            map[row.category_code] = row;
          }
        });
        setWeeklyTotals(map);
      } catch (err) {
        console.error('Failed to fetch matrix weekly', err);
      }
    };
    
    fetchWeekly();
  }, [startDate, coreData.core?.weather]);

  useEffect(() => {
    if (coreData.core?.weather) {
      setCurrentWeather(coreData.core.weather.current || null);
      setLastYearWeather(coreData.core.weather.lastYear || null);
    }
  }, [coreData.core]);

  const data = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return [];
    return transformMatrixData(coreData);
  }, [coreData]);

  // Group data by category_code
  const groupedData = data.reduce((acc: Record<string, MatrixRow[]>, row: MatrixRow) => {
    const code = row.category_code || 'OTHER';
    if (!acc[code]) acc[code] = [];
    acc[code].push(row);
    return acc;
  }, {} as Record<string, MatrixRow[]>);

  const calculateSubtotal = (rows: MatrixRow[]) => {
    return rows.reduce(
      (acc, r) => ({
        today: {
          actual: acc.today.actual + r.today.actual,
          lastYear: acc.today.lastYear + r.today.lastYear,
          growthRate: 0,
        },
        mtd: {
          actual: acc.mtd.actual + r.mtd.actual,
          lastYear: acc.mtd.lastYear + r.mtd.lastYear,
          growthRate: 0,
        },
        ytd: {
          actual: acc.ytd.actual + r.ytd.actual,
          lastYear: acc.ytd.lastYear + r.ytd.lastYear,
          growthRate: 0,
        },
      }),
      {
        today: { actual: 0, lastYear: 0, growthRate: 0 },
        mtd: { actual: 0, lastYear: 0, growthRate: 0 },
        ytd: { actual: 0, lastYear: 0, growthRate: 0 },
      }
    );
  };

  const getGrowth = (actual: number, lastYear: number) => {
    if (!lastYear || lastYear === 0) return actual > 0 ? 100 : 0;
    return ((actual - lastYear) / lastYear) * 100;
  };

  const categoryLabels: Record<string, string> = {
    'ROOM': '객실 Total',
    'GOLF': '골프 Total',
    'FNB': '식음업장 Total',
    'BANQUET': '연회 Total',
    'TICKET': '티켓업장 Total',
    'OTHER': '기타업장 Total'
  };

  const categoriesOrder = ['ROOM', 'GOLF', 'FNB', 'BANQUET', 'TICKET', 'OTHER'];

  const categorySubtotals: Record<string, MatrixRow> = {};
  categoriesOrder.forEach(code => {
    const rows = groupedData[code] || [];
    const rawSub = calculateSubtotal(rows);
    const wTotal = weeklyTotals[code];

    if (wTotal) {
      rawSub.today.actual = wTotal.today.actual !== undefined ? Number(wTotal.today.actual) : rawSub.today.actual;
      rawSub.today.lastYear = wTotal.today.lastYear !== undefined ? Number(wTotal.today.lastYear) : rawSub.today.lastYear;
      rawSub.mtd.actual = wTotal.mtd.actual !== undefined ? Number(wTotal.mtd.actual) : rawSub.mtd.actual;
      rawSub.mtd.lastYear = wTotal.mtd.lastYear !== undefined ? Number(wTotal.mtd.lastYear) : rawSub.mtd.lastYear;
      rawSub.ytd.actual = wTotal.ytd.actual !== undefined ? Number(wTotal.ytd.actual) : rawSub.ytd.actual;
      rawSub.ytd.lastYear = wTotal.ytd.lastYear !== undefined ? Number(wTotal.ytd.lastYear) : rawSub.ytd.lastYear;
    }
    
    categorySubtotals[code] = {
      category: categoryLabels[code],
      category_code: code,
      shop_name: categoryLabels[code],
      today: {
        actual: rawSub.today.actual,
        lastYear: rawSub.today.lastYear,
        growthRate: getGrowth(rawSub.today.actual, rawSub.today.lastYear)
      },
      mtd: {
        actual: rawSub.mtd.actual,
        lastYear: rawSub.mtd.lastYear,
        growthRate: getGrowth(rawSub.mtd.actual, rawSub.mtd.lastYear)
      },
      ytd: {
        actual: rawSub.ytd.actual,
        lastYear: rawSub.ytd.lastYear,
        growthRate: getGrowth(rawSub.ytd.actual, rawSub.ytd.lastYear)
      }
    };
  });

  const netTotal = calculateSubtotal(Object.values(categorySubtotals));

  // Override with the true Net Total from the backend API if available
  if (coreData.core) {
    if (coreData.core.today) {
      netTotal.today.actual = Number(coreData.core.today.actual) || netTotal.today.actual;
      netTotal.today.lastYear = Number(coreData.core.today.ly_actual) || netTotal.today.lastYear;
      netTotal.today.growthRate = getGrowth(netTotal.today.actual, netTotal.today.lastYear);
    }
    if (coreData.core.mtd) {
      netTotal.mtd.actual = Number(coreData.core.mtd.actual) || netTotal.mtd.actual;
      netTotal.mtd.lastYear = Number(coreData.core.mtd.ly_actual) || netTotal.mtd.lastYear;
      netTotal.mtd.growthRate = getGrowth(netTotal.mtd.actual, netTotal.mtd.lastYear);
    }
    if (coreData.core.ytd) {
      netTotal.ytd.actual = Number(coreData.core.ytd.actual) || netTotal.ytd.actual;
      netTotal.ytd.lastYear = Number(coreData.core.ytd.ly_actual) || netTotal.ytd.lastYear;
      netTotal.ytd.growthRate = getGrowth(netTotal.ytd.actual, netTotal.ytd.lastYear);
    }
  }

  const vatTotal = {
    today: { 
      actual: coreData.core?.today?.vat !== undefined ? Number(coreData.core.today.vat) : 0, 
      lastYear: coreData.core?.today?.ly_vat !== undefined ? Number(coreData.core.today.ly_vat) : 0 
    },
    mtd: { 
      actual: coreData.core?.mtd?.vat !== undefined ? Number(coreData.core.mtd.vat) : 0, 
      lastYear: coreData.core?.mtd?.ly_vat !== undefined ? Number(coreData.core.mtd.ly_vat) : 0 
    },
    ytd: { 
      actual: coreData.core?.ytd?.vat !== undefined ? Number(coreData.core.ytd.vat) : 0, 
      lastYear: coreData.core?.ytd?.ly_vat !== undefined ? Number(coreData.core.ytd.ly_vat) : 0 
    },
  };

  const grandTotal = {
    today: { 
      actual: coreData.core?.today?.gross !== undefined ? Number(coreData.core.today.gross) : netTotal.today.actual + vatTotal.today.actual, 
      lastYear: coreData.core?.today?.ly_gross !== undefined ? Number(coreData.core.today.ly_gross) : netTotal.today.lastYear + vatTotal.today.lastYear 
    },
    mtd: { 
      actual: coreData.core?.mtd?.gross !== undefined ? Number(coreData.core.mtd.gross) : netTotal.mtd.actual + vatTotal.mtd.actual, 
      lastYear: coreData.core?.mtd?.ly_gross !== undefined ? Number(coreData.core.mtd.ly_gross) : netTotal.mtd.lastYear + vatTotal.mtd.lastYear 
    },
    ytd: { 
      actual: coreData.core?.ytd?.gross !== undefined ? Number(coreData.core.ytd.gross) : netTotal.ytd.actual + vatTotal.ytd.actual, 
      lastYear: coreData.core?.ytd?.ly_gross !== undefined ? Number(coreData.core.ytd.ly_gross) : netTotal.ytd.lastYear + vatTotal.ytd.lastYear 
    },
  };

  const checkedRowsList = data.filter((r: MatrixRow) => checkedShops.includes(r.shop_name));
  const checkedTotal = calculateSubtotal(checkedRowsList);

  if (coreData.isLoading) {
    return <div className="p-6 text-slate-500">데이터를 불러오는 중입니다...</div>;
  }

  const parsedDate = new Date(startDate);
  const lyDate = new Date(parsedDate.getTime() - 364 * 24 * 60 * 60 * 1000);
  
  const currFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  const currDateStr = currFormatter.format(parsedDate).replace(/ /g, '');
  
  const lyFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
  const lyDateFormattedStr = lyFormatter.format(lyDate).replace(/ /g, ' ');

  const getWeatherIcon = (desc: string) => {
    if (!desc) return '';
    if (desc.includes('눈') || desc.includes('스노우')) return '❄️';
    if (desc.includes('비')) return '🌧️';
    if (desc.includes('구름') || desc.includes('흐림')) return '☁️';
    return '☀️';
  };

  const getWeatherText = (weather: any) => {
    if (!weather) return '';
    const desc = weather.weatherDesc || '맑음';
    const icon = getWeatherIcon(desc);
    const tempText = (weather.tempMax && weather.tempMin) ? ` ${weather.tempMax}°/${weather.tempMin}°` : '';
    return `[${icon} ${desc}${tempText}]`;
  };

  const dynamicTitle = `${currDateStr} ${getWeatherText(currentWeather)} vs ${lyDateFormattedStr} ${getWeatherText(lastYearWeather)}`;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium text-slate-800 tracking-tight">{dynamicTitle}</h1>
        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border">
          기준일자: {startDate}
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-10rem)] rounded-xl border border-slate-200 shadow-sm bg-white relative">
        <table className="w-full text-sm text-right whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b-2 border-slate-300 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-3 text-center border-r-2 border-slate-300" rowSpan={2}>구분</th>
              <th className="p-3 text-center border-r-2 border-slate-300" colSpan={3}>금일(Today)</th>
              <th className="p-3 text-center border-r-2 border-slate-300" colSpan={3}>월누계(Month To Date)</th>
              <th className="p-3 text-center" colSpan={3}>연누계(Year To Date)</th>
            </tr>
            <tr className="bg-slate-50 text-xs">
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 border-r-2 border-slate-300 font-medium text-blue-600">증감율</th>
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 border-r-2 border-slate-300 font-medium text-blue-600">증감율</th>
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 font-medium text-blue-600">증감율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {categoriesOrder.map(category => {
              const rows = groupedData[category];
              if (!rows) return null;
              
              const sub = categorySubtotals[category];

              return (
                <React.Fragment key={category}>
                  {rows.map((row: MatrixRow) => (
                    <tr key={row.shop_name} className={`hover:bg-slate-50 transition-colors ${checkedShops.includes(row.shop_name) ? 'bg-blue-50/50' : ''}`}>
                      <td className="p-2 border-r-2 border-slate-300 text-left pl-4 text-slate-600 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          checked={checkedShops.includes(row.shop_name)}
                          onChange={() => {
                            setCheckedShops(prev => 
                              prev.includes(row.shop_name) ? prev.filter(s => s !== row.shop_name) : [...prev, row.shop_name]
                            )
                          }}
                        />
                        <span className="font-medium cursor-pointer" onClick={() => {
                          setCheckedShops(prev => 
                              prev.includes(row.shop_name) ? prev.filter(s => s !== row.shop_name) : [...prev, row.shop_name]
                          )
                        }}>{row.shop_name}</span>
                      </td>
                      <td className="p-2 font-medium">{formatCurrency(row.today.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.today.lastYear)}</td>

                      <td className={`p-2 border-r-2 border-slate-300 ${row.today.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.today.growthRate)}</td>
                      
                      <td className="p-2 font-medium">{formatCurrency(row.mtd.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.mtd.lastYear)}</td>
                      <td className={`p-2 border-r-2 border-slate-300 ${row.mtd.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.mtd.growthRate)}</td>
                      
                      <td className="p-2 font-medium">{formatCurrency(row.ytd.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.ytd.lastYear)}</td>
                      <td className={`p-2 ${row.ytd.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.ytd.growthRate)}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50 font-semibold text-slate-800 border-t border-b-2 border-amber-200/50">
                    <td className="p-2 border-r-2 border-slate-300 text-left pl-4 font-medium text-slate-800">{sub.category}</td>
                    <td className="p-2">{formatCurrency(sub.today.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.today.lastYear)}</td>
                    <td className={`p-2 border-r-2 border-slate-300 ${getGrowth(sub.today.actual, sub.today.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.today.actual, sub.today.lastYear))}</td>
                    
                    <td className="p-2">{formatCurrency(sub.mtd.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.mtd.lastYear)}</td>
                    <td className={`p-2 border-r-2 border-slate-300 ${getGrowth(sub.mtd.actual, sub.mtd.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.mtd.actual, sub.mtd.lastYear))}</td>
                    
                    <td className="p-2">{formatCurrency(sub.ytd.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.ytd.lastYear)}</td>
                    <td className={`p-2 ${getGrowth(sub.ytd.actual, sub.ytd.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.ytd.actual, sub.ytd.lastYear))}</td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* NET ROW */}
            <tr className="bg-red-50 font-medium text-red-800 border-t-2 border-red-200">
              <td className="p-3 border-r-2 border-slate-300 text-left pl-4">NET</td>
              <td className="p-3">{formatCurrency(netTotal.today.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.today.lastYear)}</td>
              <td className="p-2 border-r border-slate-200">
                {netTotal.today.actual === 0 ? '0.00' : formatGrowth(getGrowth(netTotal.today.actual, netTotal.today.lastYear))}%
              </td>
              <td className="p-3">{formatCurrency(netTotal.mtd.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.mtd.lastYear)}</td>
              <td className="p-3 border-r-2 border-slate-300">{formatGrowth(getGrowth(netTotal.mtd.actual, netTotal.mtd.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(netTotal.ytd.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.ytd.lastYear)}</td>
              <td className="p-3">{formatGrowth(getGrowth(netTotal.ytd.actual, netTotal.ytd.lastYear))}</td>
            </tr>

            {/* SVC ROW */}
            <tr className="bg-slate-50 font-medium text-slate-600">
              <td className="p-2 border-r-2 border-slate-300 text-left pl-4">SVC</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2 border-r-2 border-slate-300">0.00</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2 border-r-2 border-slate-300">0.00</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2">0.00</td>
            </tr>

            {/* VAT ROW */}
            <tr className="bg-slate-50 font-medium text-slate-700 border-b-2 border-slate-300">
              <td className="p-2 border-r-2 border-slate-300 text-left pl-4">VAT</td>
              <td className="p-2">{formatCurrency(vatTotal.today.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.today.lastYear)}</td>
              <td className="p-2 border-r-2 border-slate-300">{formatGrowth(getGrowth(vatTotal.today.actual, vatTotal.today.lastYear))}</td>
              
              <td className="p-2">{formatCurrency(vatTotal.mtd.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.mtd.lastYear)}</td>
              <td className="p-2 border-r-2 border-slate-300">{formatGrowth(getGrowth(vatTotal.mtd.actual, vatTotal.mtd.lastYear))}</td>
              
              <td className="p-2">{formatCurrency(vatTotal.ytd.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.ytd.lastYear)}</td>
              <td className="p-2">{formatGrowth(getGrowth(vatTotal.ytd.actual, vatTotal.ytd.lastYear))}</td>
            </tr>

            {/* GRAND TOTAL ROW */}
            <tr className="bg-red-100 font-extrabold text-red-900 shadow-sm">
              <td className="p-3 border-r-2 border-slate-300 text-left pl-4">Grand Total</td>
              <td className="p-3">{formatCurrency(grandTotal.today.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.today.lastYear)}</td>
              <td className="p-3 border-r-2 border-slate-300">{formatGrowth(getGrowth(grandTotal.today.actual, grandTotal.today.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(grandTotal.mtd.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.mtd.lastYear)}</td>
              <td className="p-3 border-r-2 border-slate-300">{formatGrowth(getGrowth(grandTotal.mtd.actual, grandTotal.mtd.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(grandTotal.ytd.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.ytd.lastYear)}</td>
              <td className="p-3">{formatGrowth(getGrowth(grandTotal.ytd.actual, grandTotal.ytd.lastYear))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {checkedShops.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 p-4 border-t-4 border-blue-800">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-medium">{checkedShops.length}</div>
              <h3 className="font-medium text-lg">선택된 항목 실적 합계</h3>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">금일 실적</p>
                <p className="font-medium text-xl">{formatCurrency(checkedTotal.today.actual)} </p>
                <p className={`text-sm mt-1 font-medium ${getGrowth(checkedTotal.today.actual, checkedTotal.today.lastYear) >= 0 ? 'text-red-300' : 'text-blue-300'}`}>
                  전년비: {formatGrowth(getGrowth(checkedTotal.today.actual, checkedTotal.today.lastYear))}%
                </p>
              </div>
              <div className="w-px bg-blue-500/50"></div>
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">월누계 실적</p>
                <p className="font-medium text-xl">{formatCurrency(checkedTotal.mtd.actual)} </p>
                <p className={`text-sm mt-1 font-medium ${getGrowth(checkedTotal.mtd.actual, checkedTotal.mtd.lastYear) >= 0 ? 'text-red-300' : 'text-blue-300'}`}>
                  전년비: {formatGrowth(getGrowth(checkedTotal.mtd.actual, checkedTotal.mtd.lastYear))}%
                </p>
              </div>
              <div className="w-px bg-blue-500/50"></div>
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">연누계 실적</p>
                <p className="font-medium text-xl">{formatCurrency(checkedTotal.ytd.actual)} </p>
                <p className={`text-sm mt-1 font-medium ${getGrowth(checkedTotal.ytd.actual, checkedTotal.ytd.lastYear) >= 0 ? 'text-red-300' : 'text-blue-300'}`}>
                  전년비: {formatGrowth(getGrowth(checkedTotal.ytd.actual, checkedTotal.ytd.lastYear))}%
                </p>
              </div>
              <div className="ml-4">
                <button 
                  onClick={() => setCheckedShops([])}
                  className="bg-blue-800 hover:bg-blue-900 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
