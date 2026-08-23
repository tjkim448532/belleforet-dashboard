import { useState, useEffect, useMemo } from 'react';
import { useCoreData } from '../contexts/CoreDataContext';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { Ticket, Trophy, AlertCircle, Wallet, Award } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const parseNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = parseNumber(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export interface TopTicketItem {
  rank?: number;
  itemName: string;
  facilityName?: string;
  sales: number;
  quantity: number;
  unitPrice?: number;
}

export default function LeisureFacility() {
  const { core, isLoading } = useCoreData();
  const { startDate, endDate } = useDate();

  const [apiTopItems, setApiTopItems] = useState<TopTicketItem[]>([]);

  // Fetch item-level top tickets from backend API (excluding Moto Arena)
  useEffect(() => {
    const fetchTopItems = async () => {
      try {
        const queryParams = endDate
          ? `startDate=${startDate}&endDate=${endDate}&limit=15`
          : `date=${startDate}&limit=15`;
        const res = await secureFetcher(`${API_BASE}/api/v5/report/top-ticket-items?${queryParams}`).catch(() => null);
        const payload = res?.data ?? res;
        if (payload?.topItems && Array.isArray(payload.topItems) && payload.topItems.length > 0) {
          const filtered = payload.topItems
            .filter((item: any) => {
              const fac = String(item.facilityName || item.shopName || '');
              const cat = String(item.categoryCode || '');
              const name = String(item.itemName || item.name || '');
              
              // Rigorous exclusion of Moto Arena circuit/cart items
              const isMoto = 
                fac.includes('모토아레나') || 
                name.includes('모토') || 
                cat === 'MOTO' ||
                name.includes('1인승') ||
                name.includes('2인승') ||
                name.includes('레저카트') ||
                name.includes('레이싱카트') ||
                name.includes('카트스쿨');

              return !isMoto;
            })
            .slice(0, 5);

          setApiTopItems(filtered.map((item: any, idx: number) => ({
            rank: idx + 1,
            itemName: item.itemName || item.name || '티켓 상품',
            facilityName: item.facilityName || item.shopName || '레저본부',
            sales: parseNumber(item.sales || item.totalSales || 0),
            quantity: parseNumber(item.quantity || item.qty || 0),
            unitPrice: parseNumber(item.unitPrice || 0)
          })));
        } else {
          setApiTopItems([]);
        }
      } catch {
        setApiTopItems([]);
      }
    };
    fetchTopItems();
  }, [startDate, endDate]);

  const { totalSales, topTickets, top5Tickets } = useMemo(() => {
    if (!core?.salesByFacility) {
      return { totalSales: 0, topTickets: [], top5Tickets: [] };
    }

    const ticketFacilities = core.salesByFacility.filter((item: any) => 
      item.categoryCode === 'TICKET' && 
      !String(item.shopName || item.facilityName || '').includes('모토아레나')
    );

    // 1. SSOT: Use backend subtotal for 'TICKET' category from salesByCategory
    let ssotTotalSales = 0;
    
    if (core.salesByCategory && Array.isArray(core.salesByCategory)) {
      const ticketCat = core.salesByCategory.find((x: any) => x.categoryCode === 'TICKET');
      if (ticketCat) {
        ssotTotalSales = parseNumber(ticketCat.todayActual || ticketCat.totalSales || 0);
      }
    }

    // 2. Map facility rows directly (V6 schema subGroupName & totalVisitors)
    const mappedTickets: Array<{ name: string; sales: number; qty: number; depth2: string }> = ticketFacilities
      .filter((item: any) => !item.isSubtotal)
      .map((item: any) => {
        const name = item.shopName || item.facilityName || '기타';
        const sales = parseNumber(item.todayActual || item.totalSales || 0);
        const qty = parseNumber(item.totalVisitors || item.visitors || 0);
        const depth2 = item.partName || '티켓/레저';
        return { name, sales, qty, depth2 };
      });

    const sortedTickets = mappedTickets.sort((a, b) => b.sales - a.sales);
    const top5 = sortedTickets.slice(0, 5);

    return { 
      totalSales: ssotTotalSales, 
      topTickets: sortedTickets, 
      top5Tickets: top5
    };
  }, [core]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  if (topTickets.length === 0 && !isLoading) {
    return (
      <div className="p-8">
        <div className="bg-slate-50 text-slate-500 p-6 rounded-2xl flex items-center gap-3">
          <AlertCircle size={24} />
          <p className="font-medium">레저 영업장 데이터가 없습니다. (혹은 백엔드 데이터 집계 전입니다)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 lg:pb-8">
      {/* Header */}
      <div className="bg-brand-mint rounded-[32px] p-8 lg:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-20 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Ticket size={24} />
              <span className="font-medium tracking-widest text-sm">BELLE FORET LEISURE</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mb-2">
              레저 영업장 대시보드
            </h1>
            <p className="text-[13px] text-emerald-50 font-medium">
              레저본부 카테고리에 속한 전체 영업장의 요약 데이터입니다.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 w-full lg:w-auto">
            <GlobalDatePicker />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* 요약 카드 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 rounded-full" />
            <h2 className="text-base font-bold text-slate-600 mb-6 flex items-center gap-2 relative z-10">
              <Wallet className="w-5 h-5 text-blue-500" /> 총 매출합계 <span className="text-xs font-normal text-slate-400">(조회일)</span>
            </h2>
            <div className="text-3xl font-black text-slate-900 mb-2 tracking-tight relative z-10 tabular-nums">
              {formatCurrency(totalSales)} <span className="text-base font-normal text-slate-500">원</span>
            </div>
            <p className="text-slate-500 text-xs relative z-10 font-medium">순매출 기준 합산 (부가세 별도)</p>
          </div>

          {/* TOP 5 가장 많이 팔린 티켓 상품 요약 카드 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> 가장 많이 팔린 티켓 TOP 5
              </h2>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Ticket size={12} /> 티켓 품목
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-4">
              레저본부 단일 티켓/패스 상품(트랜잭션) 기준 순위
            </p>

            <div className="space-y-3">
              {(apiTopItems.length > 0 ? apiTopItems : top5Tickets).map((t: any, idx: number) => {
                const itemName = t.itemName || t.name;
                const venueName = t.facilityName;
                const sales = t.sales;
                const qty = t.quantity || t.qty;

                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-purple-50/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-400 text-white shadow-xs' :
                        idx === 1 ? 'bg-slate-400 text-white' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 text-sm block truncate">{itemName}</span>
                        {venueName && (
                          <span className="text-xs text-slate-500 font-medium block">
                            {venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 tabular-nums">
                      <span className="font-bold text-sm text-slate-900 block">{formatCurrency(sales)}원</span>
                      <span className="text-xs text-slate-500 font-medium">{qty.toLocaleString()}개</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 레저본부 영업장별 전체 실적 랭킹 */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 h-full">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> 전체 영업장 실적 (레저본부)
              <span className="text-xs font-semibold text-slate-500 ml-2 bg-slate-100 px-2.5 py-1 rounded-lg">매출액 기준 내림차순</span>
            </h2>

            {topTickets.length > 0 ? (
              <div className="space-y-4">
                {topTickets.map((ticket, idx) => (
                  <div key={idx} className="flex items-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl shadow-xs flex items-center justify-center font-bold text-xl mr-4 border border-slate-200 tabular-nums">
                      {idx === 0 ? <span className="text-amber-500 font-bold">1</span> :
                       idx === 1 ? <span className="text-slate-500 font-bold">2</span> :
                       idx === 2 ? <span className="text-amber-700 font-bold">3</span> :
                       <span className="text-slate-400 font-bold">{idx + 1}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand-mint bg-brand-mint/10 px-3 py-0.5 rounded-full">
                          {ticket.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium tabular-nums">{ticket.qty.toLocaleString()}개 판매(입장)</p>
                    </div>
                    
                    <div className="text-right ml-4 tabular-nums">
                      <div className="font-bold text-lg text-slate-900">{formatCurrency(ticket.sales)}원</div>
                      <div className="text-xs font-semibold text-slate-500">
                        ({totalSales > 0 ? ((ticket.sales / totalSales) * 100).toFixed(1) : 0}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <AlertCircle size={32} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium">선택하신 기간 내 그룹 영업장의 판매 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
