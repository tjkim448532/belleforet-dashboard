import { useMemo } from 'react';
import { useCoreData } from '../contexts/CoreDataContext';
import { Ticket, Trophy, AlertCircle, Wallet, Award } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};


export default function LeisureFacility() {
  const { core, isLoading } = useCoreData();

  const { totalSales, topTickets, totalQuantity, top5Quantity, top5Tickets } = useMemo(() => {
    if (!core?.salesByFacility) {
      return { totalSales: 0, topTickets: [], totalQuantity: 0, top5Quantity: 0, top5Tickets: [] };
    }

    const ticketFacilities = core.salesByFacility.filter((item: any) => item.categoryCode === 'TICKET');

    // 1. SSOT: Use backend subtotal for 'TICKET' category from salesByCategory
    let ssotTotalSales = 0;
    
    if (core.salesByCategory && Array.isArray(core.salesByCategory)) {
      const ticketCat = core.salesByCategory.find((x: any) => x.categoryCode === 'TICKET');
      if (ticketCat) {
        ssotTotalSales = Number(ticketCat.totalSales || 0);
      }
    }

    // 2. Map facility rows directly (V5 schema subGroupName & totalVisitors)
    const mappedTickets: Array<{ name: string; sales: number; qty: number; depth2: string }> = ticketFacilities.map((item: any) => {
      const name = item.shopName || '기타';
      const sales = Number(item.totalSales || 0);
      const qty = Number(item.totalVisitors || 0);
      const depth2 = item.partName || '티켓/레저';
      return { name, sales, qty, depth2 };
    });

    const sortedTickets = mappedTickets.sort((a: any, b: any) => b.sales - a.sales);
    
    // [SSOT 무관용 원칙 적용] 프론트엔드 자체 reduce 합산 금지 -> 백엔드 연동 또는 산출 불가 0 처리
    const sumQty = 0; // TODO: API (core.salesByCategory의 해당 카테고리 totalVisitors 등) 연동 필요
    
    const top5 = sortedTickets.slice(0, 5);
    const top5Qty = 0; // TODO: 백엔드 지원 시 연동 (상위 5개 합산 또한 쿼리에서 가져와야 함)

    return { 
      totalSales: ssotTotalSales, 
      topTickets: sortedTickets, 
      totalQuantity: sumQty,
      top5Quantity: top5Qty,
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
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 rounded-full" />
            <h2 className="text-base font-medium text-slate-500 mb-6 flex items-center gap-2 relative z-10">
              <Wallet className="w-5 h-5 text-blue-500" /> 총 매출합계 <span className="text-xs font-normal">(조회일)</span>
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
              {totalQuantity.toLocaleString()} <span className="text-xl text-slate-500">개(명)</span>
            </div>
            <p className="text-slate-400 text-sm relative z-10 font-medium border-t border-slate-100 pt-3 mt-2">
              최고 매출 TOP 5 영업장 수량: <strong className="text-purple-600 font-medium">{top5Quantity.toLocaleString()}개</strong>
            </p>
          </div>

          {/* TOP 5 최고 매출 트랜잭션 영업장 요약 카드 */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-medium text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> 최고 매출 TOP 5 트랜잭션
            </h2>
            <div className="space-y-3">
              {top5Tickets.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      idx === 0 ? 'bg-amber-400 text-white' :
                      idx === 1 ? 'bg-slate-300 text-white' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-700 text-sm truncate">{t.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-medium text-sm text-slate-900 block">{formatCurrency(t.sales)}원</span>
                    <span className="text-xs text-slate-400">{t.qty.toLocaleString()}개</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 레저본부 영업장별 전체 실적 랭킹 */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
            <h2 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> 전체 영업장 실적 (레저본부)
              <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-md">매출액 기준 내림차순</span>
            </h2>

            {topTickets.length > 0 ? (
              <div className="space-y-4">
                {topTickets.map((ticket, idx) => (
                  <div key={idx} className="flex items-center p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl shadow-sm flex items-center justify-center font-medium text-xl mr-4 border border-slate-100">
                      {idx === 0 ? <span className="text-amber-400 font-medium">1</span> :
                       idx === 1 ? <span className="text-slate-400 font-medium">2</span> :
                       idx === 2 ? <span className="text-amber-700 font-medium">3</span> :
                       <span className="text-slate-300 font-medium">{idx + 1}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-brand-mint bg-brand-mint/10 px-2.5 py-0.5 rounded-full">
                          {ticket.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{ticket.qty.toLocaleString()}개 판매(입장)됨</p>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="font-medium text-lg text-slate-800">{formatCurrency(ticket.sales)}원</div>
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
