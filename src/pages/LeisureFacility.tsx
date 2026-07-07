import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCoreData } from '../contexts/CoreDataContext';
import { useDate } from '../contexts/DateContext';
import { useLeisureMapping } from '../contexts/LeisureMappingContext';
import { Ticket, Trophy, AlertCircle, Wallet } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export default function LeisureFacility() {
  const { groupId } = useParams();
  const { core, isLoading } = useCoreData();
  const { startDate, endDate } = useDate();
  const { leisureGroups } = useLeisureMapping();

  const group = leisureGroups.find(g => g.id === groupId);

  const { totalSales, topTickets, totalQuantity } = useMemo(() => {
    if (!core || !group) {
      return { totalSales: 0, topTickets: [], totalQuantity: 0 };
    }

    const { facilities } = group;
    const products = core.leisureProductBreakdown || [];
    const visitors = core.leisureVisitorBreakdown || [];

    // Filter products matching the facilities (for SALES)
    const matchedProducts = products.filter((p: any) => {
      return facilities.some((f: string) => p.shop_name?.includes(f));
    });

    // Filter visitors matching the facilities (for QUANTITY/VISITORS)
    const matchedVisitors = visitors.filter((v: any) => {
      return facilities.some((f: string) => v.shop_name?.includes(f));
    });

    let totalSales = 0;
    const itemMap = new Map<string, { name: string; sales: number; qty: number; depth1?: string; depth2?: string }>();

    matchedProducts.forEach((p: any) => {
      // Prioritize gross for VAT inclusive calculation
      const sales = Number(p.today_actual || 0);
      // Extract qty directly from product payload if the backend provides it
      const qty = Number(p.sales_qty || p.qty || 0);
      totalSales += sales;
      const pName = p.shop_name || '알 수 없음';
      const existing = itemMap.get(pName);
      if (existing) {
        existing.sales += sales;
        existing.qty += qty;
      } else {
        itemMap.set(pName, { name: pName, sales, qty, depth1: '레저', depth2: p.shop_name });
      }
    });

    let totalQuantity = 0;
    matchedVisitors.forEach((v: any) => {
      const qty = Number(v.sales_qty || v.qty) || 0;
      totalQuantity += qty;
      const vName = v.shop_name || '알 수 없음';
      const existing = itemMap.get(vName);
      if (existing) {
        existing.qty += qty;
      } else {
        itemMap.set(vName, { name: vName, sales: 0, qty, depth1: '레저', depth2: v.shop_name });
      }
    });

    const sortedTickets = Array.from(itemMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    return { totalSales, topTickets: sortedTickets, totalQuantity };
  }, [core, group]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-500 p-6 rounded-2xl flex items-center gap-3">
          <AlertCircle size={24} />
          <p className="font-medium">그룹을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const isRange = startDate !== endDate;

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
              {group.name} 영업장 대시보드
            </h1>
            <p className="text-emerald-50">
              {group.facilities.length > 0 
                ? `현재 묶인 영업장: ${group.facilities.join(', ')}`
                : '현재 이 그룹에 묶인 영업장이 없습니다. 관리자 페이지에서 묶음 설정을 진행해주세요.'}
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
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 rounded-full" />
            <h2 className="text-base font-medium text-slate-500 mb-6 flex items-center gap-2 relative z-10">
              <Wallet className="w-5 h-5 text-blue-500" /> 그룹 매출 총합 <span className="text-xs font-normal">({isRange ? '선택기간' : '오늘'})</span>
            </h2>
            <div className="text-3xl font-medium text-slate-800 mb-2 tracking-tight relative z-10">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-slate-400 text-sm relative z-10 font-medium">총매출 기준 합산</p>
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 rounded-full" />
            <h2 className="text-base font-medium text-slate-500 mb-6 flex items-center gap-2 relative z-10">
              <Ticket className="w-5 h-5 text-purple-500" /> 총 판매 수량
            </h2>
            <div className="text-3xl font-medium text-slate-800 mb-2 tracking-tight relative z-10">
              {totalQuantity.toLocaleString()} <span className="text-xl text-slate-500">개</span>
            </div>
            <p className="text-slate-400 text-sm relative z-10 font-medium">그룹 내 판매된 상품 총합</p>
          </div>
        </div>

        {/* Top 5 랭킹 */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
            <h2 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> 가장 많이 팔린 상품 Top 5
              <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-md">매출액 기준 정렬</span>
            </h2>

            {topTickets.length > 0 ? (
              <div className="space-y-4">
                {topTickets.map((ticket, idx) => (
                  <div key={idx} className="flex items-center p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl shadow-sm flex items-center justify-center font-medium text-xl mr-4 border border-slate-100">
                      {idx === 0 ? <span className="text-amber-400">1</span> :
                       idx === 1 ? <span className="text-slate-400">2</span> :
                       idx === 2 ? <span className="text-amber-700">3</span> :
                       <span className="text-slate-300">{idx + 1}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-brand-mint bg-brand-mint/10 px-2 py-0.5 rounded-full">{ticket.depth2}</span>
                        <h3 className="font-medium text-slate-800 truncate">{ticket.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500">{ticket.qty.toLocaleString()}개 판매됨</p>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="font-medium text-lg text-slate-800">{formatCurrency(ticket.sales)}</div>
                      <div className="text-xs font-medium text-slate-400">
                        ({totalSales > 0 ? ((ticket.sales / totalSales) * 100).toFixed(1) : 0}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <AlertCircle size={32} className="mb-3 text-slate-300" />
                <p>선택하신 기간 내 그룹 영업장의 판매 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
