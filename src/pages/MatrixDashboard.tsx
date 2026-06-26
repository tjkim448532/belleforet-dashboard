import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';

// Types matching the API response
interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

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

export default function MatrixDashboard() {
  const { targetDate } = useDate();
  const [data, setData] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://belleforet-data.vercel.app/api/dashboard/matrix?date=${targetDate}`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching matrix data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [targetDate]);

  // Group data by category
  const groupedData = data.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, MatrixRow[]>);

  const calculateSubtotal = (rows: MatrixRow[]) => {
    return rows.reduce(
      (acc, r) => ({
        today: {
          actual: acc.today.actual + r.today.actual,
          lastYear: acc.today.lastYear + r.today.lastYear,
        },
        mtd: {
          actual: acc.mtd.actual + r.mtd.actual,
          lastYear: acc.mtd.lastYear + r.mtd.lastYear,
        },
        ytd: {
          actual: acc.ytd.actual + r.ytd.actual,
          lastYear: acc.ytd.lastYear + r.ytd.lastYear,
        },
      }),
      {
        today: { actual: 0, lastYear: 0 },
        mtd: { actual: 0, lastYear: 0 },
        ytd: { actual: 0, lastYear: 0 },
      }
    );
  };

  const getGrowth = (actual: number, lastYear: number) => {
    if (!lastYear || lastYear === 0) return actual > 0 ? 100 : 0;
    return ((actual - lastYear) / lastYear) * 100;
  };

  const categoriesOrder = ['식음', '연회', '레저', '숙박', '기타업장'];
  const grandTotalRows = data;
  const netTotal = calculateSubtotal(grandTotalRows);

  const vatTotal = {
    today: { actual: netTotal.today.actual * 0.1, lastYear: netTotal.today.lastYear * 0.1 },
    mtd: { actual: netTotal.mtd.actual * 0.1, lastYear: netTotal.mtd.lastYear * 0.1 },
    ytd: { actual: netTotal.ytd.actual * 0.1, lastYear: netTotal.ytd.lastYear * 0.1 },
  };

  const grandTotal = {
    today: { actual: netTotal.today.actual + vatTotal.today.actual, lastYear: netTotal.today.lastYear + vatTotal.today.lastYear },
    mtd: { actual: netTotal.mtd.actual + vatTotal.mtd.actual, lastYear: netTotal.mtd.lastYear + vatTotal.mtd.lastYear },
    ytd: { actual: netTotal.ytd.actual + vatTotal.ytd.actual, lastYear: netTotal.ytd.lastYear + vatTotal.ytd.lastYear },
  };

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full">데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">경영 매트릭스 (기존 대시보드 검증용)</h1>
        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border">
          기준일자: {targetDate}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm text-right whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b-2 border-slate-300">
            <tr>
              <th className="p-3 text-center border-r border-slate-200" rowSpan={2}>구분</th>
              <th className="p-3 text-center border-r border-slate-200" colSpan={3}>금일(Today)</th>
              <th className="p-3 text-center border-r border-slate-200" colSpan={3}>월누계(Month To Date)</th>
              <th className="p-3 text-center" colSpan={3}>연누계(Year To Date)</th>
            </tr>
            <tr className="bg-slate-50 text-xs">
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 border-r border-slate-200 font-medium text-blue-600">증감율</th>
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 border-r border-slate-200 font-medium text-blue-600">증감율</th>
              <th className="p-2 border-r border-slate-200 font-medium">실적</th>
              <th className="p-2 border-r border-slate-200 font-medium">전년</th>
              <th className="p-2 font-medium text-blue-600">증감율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {categoriesOrder.map(category => {
              const rows = groupedData[category];
              if (!rows) return null;
              
              const sub = calculateSubtotal(rows);

              return (
                <React.Fragment key={category}>
                  {rows.map((row, idx) => (
                    <tr key={row.shop_name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border-r border-slate-200 text-left pl-4 text-slate-600">{row.shop_name}</td>
                      <td className="p-2 font-medium">{formatCurrency(row.today.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.today.lastYear)}</td>
                      <td className={`p-2 border-r border-slate-200 ${row.today.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.today.growthRate)}</td>
                      
                      <td className="p-2 font-medium">{formatCurrency(row.mtd.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.mtd.lastYear)}</td>
                      <td className={`p-2 border-r border-slate-200 ${row.mtd.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.mtd.growthRate)}</td>
                      
                      <td className="p-2 font-medium">{formatCurrency(row.ytd.actual)}</td>
                      <td className="p-2 text-slate-500">{formatCurrency(row.ytd.lastYear)}</td>
                      <td className={`p-2 ${row.ytd.growthRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatGrowth(row.ytd.growthRate)}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50 font-semibold text-slate-800 border-t border-b-2 border-amber-200/50">
                    <td className="p-2 border-r border-slate-200 text-left pl-4">{category} Total</td>
                    <td className="p-2">{formatCurrency(sub.today.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.today.lastYear)}</td>
                    <td className={`p-2 border-r border-slate-200 ${getGrowth(sub.today.actual, sub.today.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.today.actual, sub.today.lastYear))}</td>
                    
                    <td className="p-2">{formatCurrency(sub.mtd.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.mtd.lastYear)}</td>
                    <td className={`p-2 border-r border-slate-200 ${getGrowth(sub.mtd.actual, sub.mtd.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.mtd.actual, sub.mtd.lastYear))}</td>
                    
                    <td className="p-2">{formatCurrency(sub.ytd.actual)}</td>
                    <td className="p-2">{formatCurrency(sub.ytd.lastYear)}</td>
                    <td className={`p-2 ${getGrowth(sub.ytd.actual, sub.ytd.lastYear) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatGrowth(getGrowth(sub.ytd.actual, sub.ytd.lastYear))}</td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* NET ROW */}
            <tr className="bg-red-50 font-bold text-red-800 border-t-2 border-red-200">
              <td className="p-3 border-r border-slate-200 text-left pl-4">NET</td>
              <td className="p-3">{formatCurrency(netTotal.today.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.today.lastYear)}</td>
              <td className="p-3 border-r border-slate-200">{formatGrowth(getGrowth(netTotal.today.actual, netTotal.today.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(netTotal.mtd.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.mtd.lastYear)}</td>
              <td className="p-3 border-r border-slate-200">{formatGrowth(getGrowth(netTotal.mtd.actual, netTotal.mtd.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(netTotal.ytd.actual)}</td>
              <td className="p-3">{formatCurrency(netTotal.ytd.lastYear)}</td>
              <td className="p-3">{formatGrowth(getGrowth(netTotal.ytd.actual, netTotal.ytd.lastYear))}</td>
            </tr>

            {/* SVC ROW */}
            <tr className="bg-slate-50 font-medium text-slate-600">
              <td className="p-2 border-r border-slate-200 text-left pl-4">SVC</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2 border-r border-slate-200">0.00</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2 border-r border-slate-200">0.00</td>
              <td className="p-2">0</td><td className="p-2">0</td><td className="p-2">0.00</td>
            </tr>

            {/* VAT ROW */}
            <tr className="bg-slate-50 font-medium text-slate-700 border-b-2 border-slate-300">
              <td className="p-2 border-r border-slate-200 text-left pl-4">VAT</td>
              <td className="p-2">{formatCurrency(vatTotal.today.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.today.lastYear)}</td>
              <td className="p-2 border-r border-slate-200">{formatGrowth(getGrowth(vatTotal.today.actual, vatTotal.today.lastYear))}</td>
              
              <td className="p-2">{formatCurrency(vatTotal.mtd.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.mtd.lastYear)}</td>
              <td className="p-2 border-r border-slate-200">{formatGrowth(getGrowth(vatTotal.mtd.actual, vatTotal.mtd.lastYear))}</td>
              
              <td className="p-2">{formatCurrency(vatTotal.ytd.actual)}</td>
              <td className="p-2">{formatCurrency(vatTotal.ytd.lastYear)}</td>
              <td className="p-2">{formatGrowth(getGrowth(vatTotal.ytd.actual, vatTotal.ytd.lastYear))}</td>
            </tr>

            {/* GRAND TOTAL ROW */}
            <tr className="bg-red-100 font-extrabold text-red-900 shadow-sm">
              <td className="p-3 border-r border-slate-200 text-left pl-4">Grand Total</td>
              <td className="p-3">{formatCurrency(grandTotal.today.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.today.lastYear)}</td>
              <td className="p-3 border-r border-slate-200">{formatGrowth(getGrowth(grandTotal.today.actual, grandTotal.today.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(grandTotal.mtd.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.mtd.lastYear)}</td>
              <td className="p-3 border-r border-slate-200">{formatGrowth(getGrowth(grandTotal.mtd.actual, grandTotal.mtd.lastYear))}</td>
              
              <td className="p-3">{formatCurrency(grandTotal.ytd.actual)}</td>
              <td className="p-3">{formatCurrency(grandTotal.ytd.lastYear)}</td>
              <td className="p-3">{formatGrowth(getGrowth(grandTotal.ytd.actual, grandTotal.ytd.lastYear))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
