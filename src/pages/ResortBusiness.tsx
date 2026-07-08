import { useState, useEffect } from 'react';
import { CalendarDays, Hotel, Coins } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import ReactECharts from 'echarts-for-react';

interface SummaryData {
  success: boolean;
  date: string;
  ytd: { actual: number; ly_actual: number; };
  today: { actual: number; ly_actual: number; };
  resortSummary?: { totalRoomRevenue?: number; totalRoomsSold?: number; lodging_revenue?: number; rooms_sold?: number; total_capacity?: number; leisure_revenue?: number; today_actual?: number; sales_qty?: number; };
  rooms?: { roomType: string; marketType: string; rateType: string; roomsSold: number; revenue: number; total_capacity?: number; rooms_sold_weighted?: number; sales_qty?: number; }[];
  roomTypeBreakdown?: { shop_name: string; today_actual: number; qty?: number; total_capacity: number; rooms_sold_weighted?: number; sales_qty?: number; pyType?: string; facility_name?: string; rooms_sold?: number; revenue?: number; }[];
  channelBreakdown?: { shop_name: string; today_actual: number; qty?: number; sales_qty?: number; segment?: string; channel_name?: string; rooms_sold?: number; revenue?: number; }[];
  rateTypeBreakdown?: { shop_name: string; today_actual: number; qty?: number; sales_qty?: number; }[];
}

export default function ResortBusiness() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useDate();



  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const queryParams = startDate === endDate 
          ? `date=${endDate}` 
          : `startDate=${startDate}&endDate=${endDate}`;
        const json = await secureFetcher(`https://belleforet-data.vercel.app/api/v5/dashboard/revenue-summary?${queryParams}`);
        const payload = json.data ?? json;
        if (!payload) throw new Error("Invalid payload");
        
        setData({
          success: json.success || true,
          date: payload.date || endDate,
          ytd: { actual: payload.ytd?.actual || 0, ly_actual: payload.ytd?.ly_actual || 0 },
          today: { actual: payload.today?.actual || 0, ly_actual: payload.today?.ly_actual || 0 },
          resortSummary: payload.roomSummary || payload.resortSummary || null,
          rooms: payload.rooms || null,
          roomTypeBreakdown: payload.roomTypeBreakdown || payload.visitorData?.roomTypeBreakdown || [],
          channelBreakdown: payload.channelBreakdown || payload.marketTypeBreakdown || payload.segmentBreakdown || payload.roomMarketBreakdown || [],
          rateTypeBreakdown: payload.rateTypeBreakdown || []
        });
      } catch (err) {
        console.error('API Error:', err);
        setData({
          success: true,
          date: endDate,
          ytd: { actual: 0, ly_actual: 0 },
          today: { actual: 0, ly_actual: 0 },
          rooms: [],
          roomTypeBreakdown: [],
          channelBreakdown: [],
          rateTypeBreakdown: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val || 0);
    return new Intl.NumberFormat('ko-KR').format(rounded);
  };

  const lodgingStats = (() => {
    if (!data) return { revenue: 0, roomsSold: 0, adr: 0 };
    if (data.resortSummary && (data.resortSummary.today_actual || data.resortSummary.totalRoomRevenue)) {
      const summary = data.resortSummary;
      const revenue = Number(summary.today_actual ?? summary.totalRoomRevenue) || 0;
      
      let roomsSold = summary.sales_qty || summary.rooms_sold || summary.totalRoomsSold || 0;
      let totalBookings = roomsSold;

      if (data.rooms && data.rooms.length > 0) {
        roomsSold = data.rooms.reduce((sum, r) => {
          if (r.roomType === '전체' || r.roomType === '소계' || r.roomType === '합계') return sum;
          return sum + Number(r.sales_qty || r.rooms_sold_weighted || r.roomsSold || 0);
        }, 0);
        totalBookings = roomsSold;
      } else if (data.roomTypeBreakdown && data.roomTypeBreakdown.length > 0) {
        roomsSold = data.roomTypeBreakdown.reduce((sum, item) => sum + Number(item.sales_qty || item.rooms_sold_weighted || item.qty || 0), 0);
        totalBookings = roomsSold;
      }
      
      const adr = totalBookings > 0 ? Math.round(revenue / totalBookings) : 0;
      return { revenue, roomsSold, adr };
    }
    
    if (data.rooms && data.rooms.length > 0) {
      const revenue = data.rooms.reduce((sum, r) => {
        if (r.roomType === '전체' || r.roomType === '소계' || r.roomType === '합계') return sum;
        return sum + (Number(r.revenue) || 0);
      }, 0);
      const roomsSold = data.rooms.reduce((sum, r) => {
        if (r.roomType === '전체' || r.roomType === '소계' || r.roomType === '합계') return sum;
        return sum + Number(r.sales_qty || r.rooms_sold_weighted || r.roomsSold || 0);
      }, 0);
      const totalBookings = roomsSold;
      const adr = totalBookings > 0 ? Math.round(revenue / totalBookings) : 0;
      return { revenue, roomsSold, adr };
    }

    if (data.roomTypeBreakdown && data.roomTypeBreakdown.length > 0) {
      const revenue = data.roomTypeBreakdown.reduce((sum, item) => sum + (Number(item.today_actual) || 0), 0);
      const roomsSold = data.roomTypeBreakdown.reduce((sum, item) => sum + Number(item.sales_qty || item.rooms_sold_weighted || item.qty || 0), 0);
      const totalBookings = roomsSold;
      const adr = totalBookings > 0 ? Math.round(revenue / totalBookings) : 0;
      return { revenue, roomsSold, adr };
    }

    return { revenue: 0, roomsSold: 0, adr: 0 };
  })();

  const roomOccupancyData = (() => {
    if (!data) return [];
    
    const groups: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
      '16평': { sold: 0, cap: 0, rev: 0 },
      '35평': { sold: 0, cap: 0, rev: 0 },
      '51평': { sold: 0, cap: 0, rev: 0, isVirtual: true },
      '기타': { sold: 0, cap: 0, rev: 0 }
    };

    if (data.rooms && data.rooms.length > 0) {
      data.rooms.forEach(r => {
        const name = r.roomType || '기타';
        if (name === '전체' || name === '소계' || name === '합계') return;
        const sold = Number(r.sales_qty || r.roomsSold || 0);
        const cap = Number(r.total_capacity || 0);
        const rev = Number(r.revenue || 0);

        if (name.includes('16평')) {
          groups['16평'].sold += sold; groups['16평'].cap += cap; groups['16평'].rev += rev;
        } else if (name.includes('35평')) {
          groups['35평'].sold += sold; groups['35평'].cap += cap; groups['35평'].rev += rev;
        } else if (name.includes('51평')) {
          groups['51평'].sold += sold; groups['51평'].cap += cap; groups['51평'].rev += rev;
        } else {
          groups['기타'].sold += sold; groups['기타'].cap += cap; groups['기타'].rev += rev;
        }
      });
    } else if (data.roomTypeBreakdown) {
      data.roomTypeBreakdown.forEach(item => {
        const name = item.pyType || item.facility_name || item.shop_name || '';
        const sold = Number(item.sales_qty || item.qty || item.rooms_sold || 0);
        const cap = item.total_capacity || 0;
        const rev = Number(item.today_actual ?? item.revenue) || 0;

        if (name.includes('16평')) {
          groups['16평'].sold += sold; groups['16평'].cap += cap; groups['16평'].rev += rev;
        } else if (name.includes('35평')) {
          groups['35평'].sold += sold; groups['35평'].cap += cap; groups['35평'].rev += rev;
        } else if (name.includes('51평')) {
          groups['51평'].sold += sold; groups['51평'].cap += cap; groups['51평'].rev += rev;
        } else {
          groups['기타'].sold += sold; groups['기타'].cap += cap; groups['기타'].rev += rev;
        }
      });
    }

    const result = [];
    const keys = ['16평', '35평', '51평', '기타'];
    
    for (const key of keys) {
      const g = groups[key];
      if (g.sold === 0 && g.cap === 0 && g.rev === 0) continue;
      
      let rate = 0;
      let displayRate = '0%';
      
      if (key === '16평') {
        rate = g.cap > 0 ? Math.round(((g.sold + groups['51평'].sold) / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      } else if (key === '35평') {
        rate = g.cap > 0 ? Math.round(((g.sold + groups['51평'].sold) / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      } else if (key === '51평') {
        rate = 0; // N/A conceptually
        displayRate = 'N/A';
      } else {
        rate = g.cap > 0 ? Math.round((g.sold / g.cap) * 100) : 0;
        displayRate = `${rate}%`;
      }

      result.push({
        roomSize: key,
        sold: g.sold,
        capacity: g.cap,
        rate,
        displayRate,
        revenue: g.rev,
        adr: g.sold > 0 ? Math.round(g.rev / g.sold) : 0
      });
    }

    return result;
  })();

  const groupMarketType = (market: string) => {
    const m = (market || '').replace(/\s+/g, '');
    
    // 1. 기업영업(휴양소)
    if (m.includes('휴양소') || m.includes('법인') || m.includes('기업영업')) return '기업영업(휴양소)';
    
    // 2. 온라인 여행사(OTA)
    if (m.includes('온라인') || m.includes('여행사') || m.includes('OTA') || m.includes('자동') || m.includes('수동') || m.includes('야놀자') || m.includes('여기어때') || m.includes('아고다') || m.includes('익스피디아') || m.includes('트립닷컴') || m.includes('네이버예약') || m.includes('카카오메이커스') || m.includes('쿠팡')) return '온라인 여행사(OTA)';
    
    // 3. 단체영업(세미나)
    if (m.includes('단체') || m.includes('세미나') || m.includes('MICE') || m.includes('워크샵') || m.includes('연수') || m.includes('수학여행')) return '단체영업(세미나)';
    
    // 4. 예약실(오프라인)
    if (m.includes('예약실') || m.includes('전화') || m.includes('메신저') || m.includes('분양회원') || m.includes('임직원')) return '예약실(오프라인)';
    
    // 5. 홈페이지(다이렉트)
    if (m.includes('홈페이지') || m.includes('APP') || m.includes('WEB') || m.includes('자사채널')) return '홈페이지(다이렉트)';
    
    return '기타';
  };

  const channelAdrData = (() => {
    if (!data) return [];
    
    const map: Record<string, { rev: number, sold: number }> = {};
    
    if (data.rooms && data.rooms.length > 0) {
      data.rooms.forEach(r => {
        const mt = r.marketType || '기타';
        if (mt === '전체' || mt === '소계' || mt === '합계') return;
        
        const groupName = groupMarketType(mt);
        if (!map[groupName]) map[groupName] = { rev: 0, sold: 0 };
        map[groupName].rev += Number(r.revenue || 0);
        map[groupName].sold += Number(r.sales_qty || r.roomsSold || 0);
      });
    } else if (data.channelBreakdown) {
      data.channelBreakdown.forEach(item => {
        const rawChannel = item.segment || item.channel_name || item.shop_name || '알수없음';
        const groupName = groupMarketType(rawChannel);
        
        const revenue = Number(item.today_actual ?? item.revenue) || 0;
        const sold = Number(item.sales_qty || item.qty || item.rooms_sold || 0);
        
        if (!map[groupName]) map[groupName] = { rev: 0, sold: 0 };
        map[groupName].rev += revenue;
        map[groupName].sold += sold;
      });
    } else {
      return [];
    }
    
    return Object.keys(map).map(k => ({
      channel: k,
      roomsSold: map[k].sold,
      totalRevenue: map[k].rev,
      adr: map[k].sold > 0 ? Math.round(map[k].rev / map[k].sold) : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();

  const rateAdrData = (() => {
    if (!data) return [];
    if (data.rooms && data.rooms.length > 0) {
      const map: Record<string, { rev: number, sold: number }> = {};
      data.rooms.forEach(r => {
        const rat = r.rateType || '기타';
        if (rat === '전체' || rat === '소계' || rat === '합계') return;
        if (!map[rat]) map[rat] = { rev: 0, sold: 0 };
        map[rat].rev += Number(r.revenue || 0);
        map[rat].sold += Number(r.sales_qty || r.roomsSold || 0);
      });
      return Object.keys(map).map(k => ({
        rateType: k,
        roomsSold: map[k].sold,
        totalRevenue: map[k].rev,
        adr: map[k].sold > 0 ? Math.round(map[k].rev / map[k].sold) : 0
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    if (data.rateTypeBreakdown) {
      return data.rateTypeBreakdown.map(item => {
        const revenue = Number(item.today_actual) || 0;
        const sold = Number(item.sales_qty || item.qty || 0);
        return {
          rateType: item.shop_name,
          roomsSold: sold,
          totalRevenue: revenue,
          adr: sold > 0 ? Math.round(revenue / sold) : 0
        };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
    return [];
  })();

  const pieOptions = (() => {
    const pieData = roomOccupancyData
      .filter(r => r.roomSize === '16평' || r.roomSize === '35평' || r.roomSize === '51평')
      .map(r => ({ 
        name: r.roomSize, 
        value: r.sold 
      }))
      .filter(d => d.value > 0);
      
    if (pieData.length === 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}건 ({d}%)'
      },
      legend: {
        top: 'bottom'
      },
      series: [
        {
          name: '상품 판매 비중',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\\n{d}%'
          },
          data: pieData
        }
      ]
    };
  })();

  if (loading || !data) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-brand-mint animate-pulse">리조트사업본부 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 tracking-tight pb-16">
      
      {/* Decorative Header Background */}
      <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[40px]">
        <div className="absolute top-10 right-[15%] w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-12 left-[10%] w-44 h-44 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-3xl tracking-widest bg-white text-emerald-600 px-3 py-1 rounded-sm shadow-md">
                BELLE FORET
              </span>
              <span className="font-black text-2xl tracking-wide ml-1">RESORT</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mt-3">리조트사업본부 경영 현황 🏨</h1>
            <p className="text-white/80 mt-1">객실 판매 채널별 세부 객단가 및 정산 실적 리포트입니다.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker allowRange={true} />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
          {/* Room Revenue */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-emerald-500" /> 선택 기간 객실 매출
            </h2>
            <div className="text-3xl font-medium text-slate-800 tracking-tight">
              {formatCurrency(lodgingStats.revenue)}
            </div>
            <p className="text-xs text-slate-400 mt-2">정산 시트 기준 Room Charge 매출액 누적 합계</p>
          </div>

          {/* Rooms Sold */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" /> 판매된 객실 수
            </h2>
            <div className="text-3xl font-medium text-slate-800 tracking-tight">
              {lodgingStats.roomsSold}실
            </div>
            <p className="text-xs text-slate-400 mt-2">선택 기간 내 정산 완료된 총 객실 수</p>
          </div>

          {/* Overall ADR */}
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <h2 className="text-base font-medium text-slate-500 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" /> 객실 평균 단가 (ADR)
            </h2>
            <div className="text-3xl font-medium text-emerald-600 tracking-tight">
              {formatCurrency(lodgingStats.adr)}
            </div>
            <p className="text-xs text-slate-400 mt-2">선택 기간 총 객실 매출 ÷ 총 판매 객실 수</p>
          </div>
        </div>

        {/* Room Occupancy Status Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <h2 className="text-base font-medium text-slate-800 mb-6 flex items-center gap-2">
            🏨 평형별 객실 실시간 가동률 (Occupancy Status)
          </h2>
          {roomOccupancyData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {roomOccupancyData.map((row) => (
                <div key={row.roomSize} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 mb-3">{row.roomSize}</span>
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                      <circle cx="40" cy="40" r="34" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(row.rate, 100) / 100)} />
                    </svg>
                    <span className="absolute text-base font-medium text-slate-800">{row.displayRate}</span>
                  </div>
                  <div className="flex flex-col items-center mt-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">{row.sold}실 / {row.capacity}실</span>
                    <span className="text-[10px] text-slate-400">매출: {formatCurrency(row.revenue)}</span>
                    <span className="text-[10px] text-emerald-500 font-medium">ADR: {formatCurrency(row.adr)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              해당 날짜에 가동률 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* Pie Chart Section */}
        {pieOptions && (
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
            <h2 className="text-base font-medium text-slate-800 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" /> 객실 평형별 판매 비중 (인기도)
            </h2>
            <div className="h-[300px] w-full">
              <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
              💰 판매채널별 객단가 분석
            </h2>
            {channelAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">판매 채널명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {channelAdrData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.channel}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 판매 채널 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-medium text-slate-800 mb-8 flex items-center gap-2">
              💳 요금타입별 비중 및 객단가 (회원/비회원 분석)
            </h2>
            {rateAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">요금 타입명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {rateAdrData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.rateType}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 요금타입 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
