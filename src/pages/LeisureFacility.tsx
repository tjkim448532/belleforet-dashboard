import { useState, useEffect, useMemo } from 'react';
import { useCoreData } from '../contexts/CoreDataContext';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { Ticket, Trophy, AlertCircle, Wallet, Award, Globe } from 'lucide-react';
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
  const { startDate, endDate, isRange } = useDate();

  const [apiTopItems, setApiTopItems] = useState<TopTicketItem[]>([]);

  const [isTopItemsLoading, setIsTopItemsLoading] = useState<boolean>(true);

  // Fetch item-level top tickets from backend API (excluding Moto Arena)
  useEffect(() => {
    let isCancelled = false;
    const fetchTopItems = async () => {
      setIsTopItemsLoading(true);
      try {
        const isRangeQuery = Boolean(endDate && startDate !== endDate);
        const queryParams = isRangeQuery
          ? `startDate=${startDate}&endDate=${endDate}&limit=30`
          : `date=${startDate}&limit=30`;
        const res = await secureFetcher(`${API_BASE}/api/v6/report/top-ticket-items?${queryParams}`).catch(() => null);
        if (isCancelled) return;
        const payload = res?.data ?? res;
        if (payload?.topItems && Array.isArray(payload.topItems) && payload.topItems.length > 0) {
          const filtered = payload.topItems
            .filter((item: any) => {
              const cat = String(item.categoryCode || '');
              return cat !== 'MOTO';
            })
            // 총액수(sales) 기준 내림차순 정렬
            .sort((a: any, b: any) => parseNumber(b.sales || b.totalSales || 0) - parseNumber(a.sales || a.totalSales || 0))
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
        if (!isCancelled) setApiTopItems([]);
      } finally {
        if (!isCancelled) setIsTopItemsLoading(false);
      }
    };
    fetchTopItems();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, isRange]);

  // 레저본부 전체 영업장 판매채널(자사·OTA·POS·PMS) 비중 — 백엔드 완제품(summary, venues) 그대로 바인딩
  const [channelData, setChannelData] = useState<{ summary: any; venues: any[] } | null>(null);
  const [channelLoading, setChannelLoading] = useState<boolean>(true);
  const [channelError, setChannelError] = useState<string | null>(null);
  // [Ticket 34] 업장·권종별 정가 대비 할인 누수율 및 미사용 티켓 감사
  const [discountLeakageIntel, setDiscountLeakageIntel] = useState<any>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchChannels = async () => {
      setChannelLoading(true);
      setChannelError(null);
      try {
        const isRangeQuery = Boolean(endDate && startDate !== endDate);
        const queryParams = isRangeQuery
          ? `startDate=${startDate}&endDate=${endDate}`
          : `date=${startDate}`;
        const [res, discountRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/report/leisure-channel-sales?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v6/report/leisure-discount-leakage?${queryParams}`).catch(() => null)
        ]);
        if (isCancelled) return;
        if (discountRes && (discountRes.summary || discountRes.data)) {
          setDiscountLeakageIntel(discountRes.data || discountRes);
        } else {
          setDiscountLeakageIntel(null);
        }
        const summary = res?.summary || (res?.data && !Array.isArray(res.data) ? res.data.summary : null);
        const venues = res?.venues || res?.venueBreakdown || (res?.data && !Array.isArray(res.data) ? res.data.venues : null);
        if (summary && Array.isArray(venues)) {
          setChannelData({ summary, venues });
        } else {
          setChannelData(null);
          setChannelError('API 응답에 summary/venues 완제품 데이터가 없습니다.');
        }
      } catch (err: any) {
        if (!isCancelled) {
          setChannelData(null);
          setChannelError(err?.message || 'leisure-channel-sales API 호출 실패');
        }
      } finally {
        if (!isCancelled) setChannelLoading(false);
      }
    };
    fetchChannels();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, isRange]);

  // 백엔드 비중(%) 값 표시 전용: null/undefined면 '-' (Fail-Stop, 클라이언트 재계산 금지)
  const showPct = (v: any) => (v === null || v === undefined || v === '' ? '-' : `${v}%`);
  const showWon = (v: any) => (v === null || v === undefined || v === '' ? '-' : `${formatCurrency(v)}원`);

  const { totalSales, topTickets } = useMemo(() => {
    // 1. Primary SSOT: core.salesByFacility (from /api/v6/dashboard/revenue-summary)
    // Official Gold Mart SSOT: contains 100% complete POS + PMS sales and proper category mapping
    if (core?.salesByFacility && core.salesByFacility.length > 0) {
      const ticketFacilities = core.salesByFacility.filter((item: any) => 
        (item.categoryCode === 'TICKET' || item.categoryCode === 'MOTO') && !item.isSubtotal
      );

      let ssotTotalSales = parseNumber(
        (core as any).summary?.totalLeisureSales ??
        (core as any).summary?.synergySales?.leisureTotal ??
        channelData?.summary?.totalRevenue ??
        0
      );
      if (ssotTotalSales === 0 && core.salesByCategory && Array.isArray(core.salesByCategory)) {
        const leisureCat = core.salesByCategory.find((x: any) => x.categoryCode === 'LEISURE' || x.categoryCode === 'TICKET');
        ssotTotalSales = parseNumber(leisureCat?.todayActual || leisureCat?.totalSales || 0);
      }

      const mappedTickets: Array<{ name: string; sales: number; qty: number; depth2: string; sharePct: number | null }> = ticketFacilities
        .map((item: any) => {
          const name = item.shopName || item.facilityName || '기타';
          const sales = parseNumber(item.todayActual || item.totalSales || 0);
          const qty = parseNumber(item.totalVisitors || item.visitors || 0);
          const depth2 = item.partName || '티켓/레저';
          const sharePct = item.sharePct ?? item.todaySharePct ?? null;
          return { name, sales, qty, depth2, sharePct };
        })
        .filter((item: any) => item.sales > 0 || item.qty > 0)
        .sort((a: any, b: any) => b.sales - a.sales);

      return { 
        totalSales: ssotTotalSales, 
        topTickets: mappedTickets
      };
    }

    // 2. Secondary fallback: channelData (from /api/v6/report/leisure-channel-sales)
    if (channelData?.venues && channelData.venues.length > 0) {
      const grandTotal = parseNumber(channelData.summary?.totalRevenue || 0);
      const mapped = channelData.venues
        .map((v: any) => ({
          name: v.venueName || '기타',
          sales: parseNumber(v.totalRevenue || 0),
          qty: parseNumber(v.totalVisitors || 0),
          depth2: '레저/체험',
          sharePct: v.sharePct ?? v.revenueSharePct ?? null
        }))
        .filter((v: any) => v.sales > 0 || v.qty > 0)
        .sort((a: any, b: any) => b.sales - a.sales);

      return {
        totalSales: grandTotal,
        topTickets: mapped
      };
    }

    return { totalSales: 0, topTickets: [] };
  }, [core, channelData]);

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      
      {/* 🌲 Luxury Deep Forest Banner with Ambient Glow */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 레저본부</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Ticket className="w-7 h-7 text-[#B59269] shrink-0" />
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight break-keep whitespace-nowrap">
                레저 영업장 대시보드
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                공식 실시간 마트
              </span>
            </div>
            <p className="text-sm text-white/80 mt-1 break-keep">
              놀이동산, 마운틴카트, 목장, 사계절썰매장, 모토아레나 등 레저본부 전체 영업장의 공식 집계 현황입니다.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* 요약 카드 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#284F42] uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#B59269]" />
                <span>총 매출합계</span>
                <span className="text-[11px] font-normal text-[#284F42]/60">({endDate && startDate !== endDate ? '조회기간' : '조회일'})</span>
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                순매출 (VAT 별도)
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black text-[#1B382E] tracking-tight tabular-nums">
              {(channelLoading && !channelData) || (isLoading && !channelData) ? (
                <span className="text-[#D0C6BB] animate-pulse text-2xl font-bold">집계 중...</span>
              ) : (
                <>{formatCurrency(totalSales)} <span className="text-base font-medium text-[#284F42]/70">원</span></>
              )}
            </div>
            <p className="text-[#284F42]/60 text-xs mt-3 font-medium">
              레저본부 전체 영업장 공식 마트 실적 합계
            </p>
          </div>

          {/* TOP 5 가장 많이 팔린 티켓 상품 요약 카드 */}
          <div className="bg-white rounded-3xl p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300">
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-[#1B382E] flex items-center gap-2 whitespace-nowrap">
                <Award className="w-5 h-5 text-[#B59269]" /> 가장 많이 팔린 티켓 TOP 5
              </h2>
              <span className="text-xs font-bold text-[#284F42] bg-[#284F42]/10 border border-[#284F42]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                <Ticket size={12} /> 티켓 품목
              </span>
            </div>
            <p className="text-xs text-[#284F42]/70 font-medium mb-4 break-keep">
              레저본부 단일 티켓/패스 상품(트랜잭션) 기준 순위
            </p>

            <div className="space-y-2.5">
              {isTopItemsLoading ? (
                <div className="py-8 flex items-center justify-center text-[#284F42]/60 text-xs">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#284F42] mr-2"></div>
                  티켓 품목 순위를 불러오는 중입니다...
                </div>
              ) : apiTopItems.length > 0 ? (
                apiTopItems.map((t: any, idx: number) => {
                  const itemName = t.itemName || t.name;
                  const venueName = t.facilityName;
                  const sales = t.sales;
                  const qty = t.quantity || t.qty;

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F3EE]/80 border border-[#D0C6BB]/70 hover:bg-[#F4F3EE] transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          idx === 0 ? 'bg-[#B59269] text-white shadow-xs' :
                          idx === 1 ? 'bg-[#284F42] text-white' :
                          idx === 2 ? 'bg-[#2F5548] text-white' :
                          'bg-[#D0C6BB] text-[#1B382E]'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-[#1B382E] text-sm block truncate" title={itemName}>{itemName}</span>
                          {venueName && (
                            <span className="text-xs text-[#284F42]/70 font-medium block truncate" title={venueName}>
                              {venueName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 tabular-nums whitespace-nowrap ml-3">
                        <span className="font-extrabold text-sm text-[#1B382E] block">{formatCurrency(sales)}원</span>
                        <span className="text-xs text-[#284F42]/70 font-medium">{qty.toLocaleString()}개</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-[#284F42]/60 text-xs font-medium bg-[#F4F3EE]/60 rounded-2xl border border-[#D0C6BB]/70">
                  해당 기간 판매된 단일 티켓 상품 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 레저본부 영업장별 전체 실적 랭킹 */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col h-[520px] lg:h-[644px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2 shrink-0">
              <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2 flex-wrap break-keep">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Trophy className="w-6 h-6 text-[#B59269]" /> 전체 영업장 실적 (레저본부)
                </span>
                <span className="text-xs font-bold text-[#284F42] bg-[#284F42]/10 border border-[#284F42]/20 px-2.5 py-1 rounded-lg whitespace-nowrap">매출액 기준 내림차순</span>
              </h2>
              <span className="text-xs font-bold text-[#284F42] bg-[#F4F3EE] border border-[#D0C6BB]/70 px-3 py-1 rounded-full whitespace-nowrap">
                총 {topTickets.length}개 업장
              </span>
            </div>

            {(channelLoading && !channelData) || (isLoading && !channelData) ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#284F42]/60 text-xs flex-1">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#284F42] mb-3"></div>
                영업장별 실적 데이터를 집계 중입니다...
              </div>
            ) : topTickets.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {topTickets.map((ticket, idx) => (
                  <div key={idx} className="flex items-center p-3.5 rounded-2xl bg-[#F4F3EE]/70 border border-[#D0C6BB]/70 hover:bg-white hover:border-[#284F42]/40 hover:shadow-md transition-all duration-300">
                    <div className="w-10 h-10 flex-shrink-0 bg-white rounded-xl shadow-xs flex items-center justify-center font-black text-base mr-3 border border-[#D0C6BB]/70 tabular-nums">
                      {idx === 0 ? <span className="text-[#B59269]">1</span> :
                       idx === 1 ? <span className="text-[#284F42]">2</span> :
                       idx === 2 ? <span className="text-[#2F5548]">3</span> :
                       <span className="text-[#6C7A73]">{idx + 1}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-[#284F42] bg-[#284F42]/10 border border-[#284F42]/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          {ticket.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#284F42]/70 font-medium tabular-nums whitespace-nowrap">
                        {ticket.qty > 0 ? `시설 이용객(티켓 입장객) ${ticket.qty.toLocaleString()}명` : '시설 이용객 미집계 (0명)'}
                      </p>
                    </div>
                    
                    <div className="text-right ml-4 tabular-nums whitespace-nowrap shrink-0">
                      <div className="font-extrabold text-base text-[#1B382E]">{formatCurrency(ticket.sales)}원</div>
                      {ticket.sharePct !== null && ticket.sharePct !== undefined && (
                        <div className="text-xs font-bold text-[#B59269]">
                          ({ticket.sharePct}%)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-[#284F42]/60 bg-[#F4F3EE]/50 rounded-2xl border border-dashed border-[#D0C6BB] flex-1">
                <AlertCircle size={32} className="mb-3 text-[#284F42]/40" />
                <p className="text-sm font-medium">선택하신 기간 내 그룹 영업장의 판매 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 레저본부 전체 영업장 판매채널(자사·OTA·POS·PMS) 매출 비중 — GET /api/v6/report/leisure-channel-sales */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-extrabold text-[#1B382E] flex items-center gap-2 whitespace-nowrap">
              <Globe className="w-5 h-5 text-[#284F42]" /> 레저본부 전체 영업장별 판매채널 비중 (자사·OTA·POS·PMS)
            </h2>
            <p className="text-xs text-[#284F42]/70 font-medium mt-1 break-keep">
              놀이동산, 마운틴카트, 목장, 사계절썰매장, 모토아레나 등 레저본부 전체 영업장의 채널별(현장 POS · 자사 홈페이지 · 외부 OTA · 객실연계 PMS) 매출 및 비중
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#284F42]/60">API: /api/v6/report/leisure-channel-sales</span>
        </div>

        {channelLoading ? (
          <div className="py-10 flex items-center justify-center text-[#284F42]/60 text-xs">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#284F42] mr-2"></div>
            레저본부 전체 영업장 채널별 매출 비중을 불러오는 중입니다...
          </div>
        ) : channelError || !channelData ? (
          <div className="bg-[#F4F3EE]/70 border border-[#D0C6BB]/70 rounded-2xl p-6 text-sm flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[#B59269] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[#1B382E]">전체 영업장 판매채널 집계 내역 없음</p>
                <span className="text-[11px] font-mono bg-[#284F42]/10 text-[#284F42] font-semibold px-2.5 py-0.5 rounded-full border border-[#284F42]/20">
                  채널별 데이터 확인 중
                </span>
              </div>
              <p className="text-xs text-[#284F42]/80 leading-relaxed break-keep">
                모토아레나를 포함한 레저본부 전체 영업장(놀이동산, 마운틴카트, 목장, 사계절썰매장, 모토아레나, 마리나클럽, 미디어아트, 썸머랜드 등)의 판매채널(자사 홈페이지 · 외부 OTA · 현장 POS · 객실 PMS) 집계 데이터를 확인하고 있습니다. 공식 데이터 적재 완료 시 실시간으로 표출됩니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 4대 채널 요약 KPI 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 tabular-nums">
              <div className="bg-[#F4F3EE]/60 p-5 rounded-2xl border border-[#D0C6BB]/70 shadow-2xs flex flex-col justify-between hover:border-[#284F42]/40 transition-all">
                <div className="text-xs font-bold text-[#1B382E] flex items-center justify-between">
                  <span>현장 POS (현장발권)</span>
                  <span className="text-[11px] font-semibold bg-white text-[#284F42] px-2 py-0.5 rounded-full border border-[#D0C6BB]/70">현장 결제</span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] tracking-tight mt-2">{showPct(channelData.summary?.posSharePct)}</div>
                <div className="text-xs text-[#284F42]/70 mt-1">매출 {showWon(channelData.summary?.posRevenue)}</div>
              </div>

              <div className="bg-[#F4F3EE]/60 p-5 rounded-2xl border border-[#D0C6BB]/70 shadow-2xs flex flex-col justify-between hover:border-[#284F42]/40 transition-all">
                <div className="text-xs font-bold text-[#1B382E] flex items-center justify-between">
                  <span>자사 홈페이지 (Direct)</span>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">수수료 0%</span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] tracking-tight mt-2">{showPct(channelData.summary?.homepageSharePct)}</div>
                <div className="text-xs text-[#284F42]/70 mt-1">매출 {showWon(channelData.summary?.homepageRevenue)}</div>
              </div>

              <div className="bg-[#F4F3EE]/60 p-5 rounded-2xl border border-[#D0C6BB]/70 shadow-2xs flex flex-col justify-between hover:border-[#284F42]/40 transition-all">
                <div className="text-xs font-bold text-[#1B382E] flex items-center justify-between">
                  <span>순수 외부 OTA (대행사)</span>
                  <span className="text-[11px] font-semibold bg-white text-[#284F42] px-2 py-0.5 rounded-full border border-[#D0C6BB]/70">야놀자/네이버 등</span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] tracking-tight mt-2">{showPct(channelData.summary?.otaSharePct)}</div>
                <div className="text-xs text-[#284F42]/70 mt-1">매출 {showWon(channelData.summary?.otaRevenue)}</div>
              </div>

              <div className="bg-[#F4F3EE]/60 p-5 rounded-2xl border border-[#D0C6BB]/70 shadow-2xs flex flex-col justify-between hover:border-[#284F42]/40 transition-all">
                <div className="text-xs font-bold text-[#1B382E] flex items-center justify-between">
                  <span>객실 연계 (PMS)</span>
                  <span className="text-[11px] font-semibold bg-white text-[#284F42] px-2 py-0.5 rounded-full border border-[#D0C6BB]/70">패키지/부대</span>
                </div>
                <div className="text-3xl font-black text-[#1B382E] tracking-tight mt-2">{showPct(channelData.summary?.pmsSharePct)}</div>
                <div className="text-xs text-[#284F42]/70 mt-1">매출 {showWon(channelData.summary?.pmsRevenue)}</div>
              </div>
            </div>

            {/* 전체 영업장별 채널 비중 매트릭스 테이블 */}
            <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75 shadow-2xs">
              <table className="w-full text-left text-sm tabular-nums min-w-[960px]">
                <thead>
                  <tr className="border-b-2 border-[#D0C6BB] text-xs font-extrabold text-[#1B382E] bg-[#F4F3EE]">
                    <th className="py-3.5 px-4 text-left">영업장명</th>
                    <th className="py-3.5 px-3 text-right">총매출</th>
                    <th className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>현장 POS</span>
                        <span className="text-[10px] font-bold text-[#1B382E] bg-white px-1.5 py-0.5 rounded border border-[#D0C6BB]/60">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right bg-emerald-50/50">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-emerald-950 font-bold">자사 홈페이지</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right bg-[#284F42]/10">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[#1B382E] font-bold">외부 OTA</span>
                        <span className="text-[10px] font-bold text-[#284F42] bg-white px-1.5 py-0.5 rounded border border-[#D0C6BB]/60">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>객실연계(PMS)</span>
                        <span className="text-[10px] font-bold text-[#B59269] bg-white px-1.5 py-0.5 rounded border border-[#D0C6BB]/60">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center">주력 채널</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/40 bg-white">
                  {channelData.venues?.map((v: any, idx: number) => {
                    const dominantTag = v.dominantChannel || (
                      v.posSharePct >= 60 ? '현장 POS 주력' :
                      v.homepageSharePct >= 30 ? '자사 채널 활성' :
                      v.otaSharePct >= 10 ? 'OTA 비중 높음' : '다채널 혼합'
                    );
                    const tagCls = dominantTag.includes('OTA') 
                      ? 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/20'
                      : dominantTag.includes('자사')
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/70';

                    return (
                      <tr key={v.venueName || idx} className="hover:bg-[#F4F3EE]/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#1B382E]">
                          {v.venueName ?? '-'}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap font-black text-[#1B382E]">
                          {showWon(v.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span className="text-base lg:text-lg font-black text-[#1B382E] block leading-tight">
                            {showPct(v.posSharePct)}
                          </span>
                          <span className="text-[11px] text-[#284F42]/60 font-medium block mt-0.5">
                            {showWon(v.posRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap bg-emerald-50/20">
                          <span className="text-base lg:text-lg font-black text-emerald-700 block leading-tight">
                            {showPct(v.homepageSharePct)}
                          </span>
                          <span className="text-[11px] text-emerald-600/80 font-medium block mt-0.5">
                            {showWon(v.homepageRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap bg-[#284F42]/5">
                          <span className="text-base lg:text-lg font-black text-[#284F42] block leading-tight">
                            {showPct(v.otaSharePct)}
                          </span>
                          <span className="text-[11px] text-[#284F42]/70 font-medium block mt-0.5">
                            {showWon(v.otaRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span className="text-base lg:text-lg font-black text-[#B59269] block leading-tight">
                            {showPct(v.pmsSharePct)}
                          </span>
                          <span className="text-[11px] text-[#284F42]/60 font-medium block mt-0.5">
                            {showWon(v.pmsRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tagCls}`}>
                            {dominantTag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#284F42] text-white font-bold text-sm border-t-2 border-[#1B382E]">
                    <td className="py-4 px-4 whitespace-nowrap">레저본부 전체 총합계</td>
                    <td className="py-4 px-3 text-right whitespace-nowrap text-[#B59269] font-black">
                      {showWon(channelData.summary?.totalRevenue)}
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <span className="text-base lg:text-lg font-black text-white block leading-tight">
                        {showPct(channelData.summary?.posSharePct)}
                      </span>
                      <span className="text-[11px] text-white/70 font-normal block mt-0.5">
                        {showWon(channelData.summary?.posRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap bg-[#1B382E]/40">
                      <span className="text-base lg:text-lg font-black text-emerald-300 block leading-tight">
                        {showPct(channelData.summary?.homepageSharePct)}
                      </span>
                      <span className="text-[11px] text-emerald-200/70 font-normal block mt-0.5">
                        {showWon(channelData.summary?.homepageRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap bg-[#1B382E]/70">
                      <span className="text-base lg:text-lg font-black text-[#B59269] block leading-tight">
                        {showPct(channelData.summary?.otaSharePct)}
                      </span>
                      <span className="text-[11px] text-white/70 font-normal block mt-0.5">
                        {showWon(channelData.summary?.otaRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <span className="text-base lg:text-lg font-black text-white block leading-tight">
                        {showPct(channelData.summary?.pmsSharePct)}
                      </span>
                      <span className="text-[11px] text-white/70 font-normal block mt-0.5">
                        {showWon(channelData.summary?.pmsRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap text-white/70 text-xs font-normal">
                      전체 합계
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 3. [Ticket 34] 레저 티켓·POS 업장/권종별 정가 대비 할인 누수율(Price Realization Rate) 및 미사용 티켓 감사 */}
      <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden mt-8">
        <div className="p-6 border-b border-[#D0C6BB]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F4F3EE]/80">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#284F42] text-white shadow-xs shrink-0 mt-0.5">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-[#1B382E]">
                  업장·권종별 정가 대비 할인 누수율(Price Realization Rate) 및 미사용 티켓 감사
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/30">
                  할인 누수 및 미사용 티켓 분석
                </span>
              </div>
              <p className="text-xs text-[#284F42]/70 mt-1">
                티켓(<code className="px-1 py-0.5 bg-white rounded text-[#1B382E] font-mono border border-[#D0C6BB]/60">정상가격·할인금액·판매금액</code>) 및 POS(<code className="px-1 py-0.5 bg-white rounded text-[#1B382E] font-mono border border-[#D0C6BB]/60">판매가·할인금액·판매금액</code>) 정가 실현율과 발권 후 미검표(<code className="px-1 py-0.5 bg-white rounded text-[#1B382E] font-mono border border-[#D0C6BB]/60">티켓출력,티켓미사용</code>) 대기 물량을 정밀 감사합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {discountLeakageIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/30">
                <AlertCircle size={14} />
                Fail-Stop · 조회 구간 데이터 없음 (/api/v6/report/leisure-discount-leakage)
              </span>
            )}
          </div>
        </div>

        {!discountLeakageIntel ? (
          <div className="p-8 bg-[#F4F3EE]/40">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-[#D0C6BB] p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#B59269]/10 text-[#B59269] flex items-center justify-center mx-auto">
                <AlertCircle size={20} />
              </div>
              <h4 className="text-sm font-extrabold text-[#1B382E]">
                [Zero-Fake / Fail-Stop] 레저·POS 할인 누수율 및 미사용 티켓 감사 조회 데이터 없음
              </h4>
              <p className="text-xs text-[#284F42]/70 leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-[#F4F3EE] rounded text-[#1B382E] font-mono border border-[#D0C6BB]/60">GET /api/v6/report/leisure-discount-leakage</code> 응답 데이터가 없거나 비어 있을 경우 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                  <div className="text-[11px] font-bold text-[#6C7A73]">정상가 총액 (List Price)</div>
                  <div className="text-base font-black text-[#6C7A73] mt-1">-</div>
                  <div className="text-[10px] text-[#6C7A73]/70 mt-0.5">정상가격 × 판매수량 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                  <div className="text-[11px] font-bold text-[#6C7A73]">총 할인 누수액 (Discount)</div>
                  <div className="text-base font-black text-[#6C7A73] mt-1">-</div>
                  <div className="text-[10px] text-[#6C7A73]/70 mt-0.5">티켓·POS 할인금액 합산 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                  <div className="text-[11px] font-bold text-[#6C7A73]">정가 실현율 (Realization)</div>
                  <div className="text-base font-black text-[#6C7A73] mt-1">-</div>
                  <div className="text-[10px] text-[#6C7A73]/70 mt-0.5">실매출 / 정상가 총액 비율 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                  <div className="text-[11px] font-bold text-[#6C7A73]">발권 후 미사용 티켓 잔액</div>
                  <div className="text-base font-black text-[#6C7A73] mt-1">-</div>
                  <div className="text-[10px] text-[#6C7A73]/70 mt-0.5">티켓출력,티켓미사용 상태 집계 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                <div className="text-xs font-bold text-[#284F42]/70">정상가 총액 (List Price)</div>
                <div className="text-xl font-black text-[#1B382E] mt-1">
                  {showWon(discountLeakageIntel.summary?.totalListAmount)}
                </div>
                <div className="text-[11px] text-[#284F42]/60 mt-1">
                  실매출액: {showWon(discountLeakageIntel.summary?.totalNetAmount)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                <div className="text-xs font-bold text-[#284F42]/70">총 할인 공제액 (Discount Leakage)</div>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {showWon(discountLeakageIntel.summary?.totalDiscountAmount)}
                </div>
                <div className="text-[11px] text-[#284F42]/60 mt-1">
                  할인율: {showPct(discountLeakageIntel.summary?.discountRatePct ?? discountLeakageIntel.summary?.overallDiscountRate)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                <div className="text-xs font-bold text-[#284F42]/70">정가 실현율 (Price Realization)</div>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {(discountLeakageIntel.summary?.totalListAmount ?? 0) > 0
                    ? showPct(discountLeakageIntel.summary?.realizationRatePct ?? discountLeakageIntel.summary?.overallRealizationRate)
                    : '-'}
                </div>
                <div className="text-[11px] text-[#284F42]/60 mt-1">
                  정상가 대비 실수취 비율
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F3EE]/60 border border-[#D0C6BB]/70">
                <div className="text-xs font-bold text-[#284F42]/70">티켓출력 · 미사용 잔여 금액</div>
                <div className="text-xl font-black text-[#B59269] mt-1">
                  {showWon(discountLeakageIntel.summary?.unusedTicketAmount ?? discountLeakageIntel.summary?.totalUnusedAmount)}
                </div>
                <div className="text-[11px] text-[#284F42]/60 mt-1">
                  미사용 건수: {(discountLeakageIntel.summary?.unusedTicketCount ?? discountLeakageIntel.summary?.totalUnusedCount) != null ? `${Number(discountLeakageIntel.summary?.unusedTicketCount ?? discountLeakageIntel.summary?.totalUnusedCount).toLocaleString()}건` : '-'}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D0C6BB]/75 overflow-hidden">
              <div className="px-4 py-3 bg-[#F4F3EE] border-b border-[#D0C6BB]/70 flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#1B382E]">업장 · 권종별 정가 대비 할인 누수 및 미사용 티켓 상세</span>
                <span className="text-[11px] text-[#284F42]/60">단위: 건 / 원 / %</span>
              </div>
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F4F3EE]/80 text-[#284F42] sticky top-0 border-b border-[#D0C6BB]/70">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-bold">영업장명</th>
                      <th className="py-2.5 px-3 text-left font-bold">권종 · 메뉴명</th>
                      <th className="py-2.5 px-3 text-right font-bold">정상가 합계</th>
                      <th className="py-2.5 px-3 text-right font-bold">할인 금액</th>
                      <th className="py-2.5 px-3 text-right font-bold">실매출액</th>
                      <th className="py-2.5 px-3 text-right font-bold">정가 실현율</th>
                      <th className="py-2.5 px-3 text-right font-bold">판매(건수)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30 bg-white">
                    {(() => {
                      const items = discountLeakageIntel.topDiscountMenus || discountLeakageIntel.items || discountLeakageIntel.shops || [];
                      if (items.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-[#284F42]/60 font-medium">
                              조회하신 일자({endDate && startDate !== endDate ? `${startDate} ~ ${endDate}` : startDate})에 집계된 할인 누수 및 미사용 티켓 내역이 없습니다. (백엔드 마트 배치 점검 필요)
                            </td>
                          </tr>
                        );
                      }
                      return items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F4F3EE]/50">
                          <td className="py-2.5 px-3 font-bold text-[#1B382E]">{item.shopName ?? '-'}</td>
                          <td className="py-2.5 px-3 text-[#284F42]">{item.menuName ?? item.shopName ?? '-'}</td>
                          <td className="py-2.5 px-3 text-right text-[#284F42]/80">{showWon(item.listAmount)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">{showWon(item.discountAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#1B382E]">{showWon(item.netAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{showPct(item.realizationRatePct ?? item.realizationRate)}</td>
                          <td className="py-2.5 px-3 text-right text-[#284F42]">
                            {item.salesCount != null ? `${Number(item.salesCount).toLocaleString()}건` : (item.unusedCount != null ? `${Number(item.unusedCount).toLocaleString()}건` : '-')}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
