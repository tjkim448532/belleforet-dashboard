import type { CoreDataState } from '../contexts/CoreDataContext';


export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    c.salesByCategory.forEach((m: any) => {
      const cat = m.categoryCode || m.category_code || m.category || '기타업장';
      hqTodayMap[cat] = Number(m.todayActual || m.total_sales || m.totalSales || m.sales || m.revenue || 0);
    });
  }
  
  const hqToday = Object.keys(hqTodayMap).map(key => ({
    hq: key,
    actual: hqTodayMap[key],
    qty: 0
  })).filter(h => h.actual > 0);

  // Use SSOT values explicitly
  // Find room revenue from salesByCategory as backend gives it per category
  let totalRoomRev = 0;
  let totalGolfRev = 0;
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    // 백엔드의 완벽한 카멜케이스화에 따른 SSOT 단일 매핑 (단, 실제 라이브 데이터는 snake_case와 한글 값을 반환할 수 있으므로 fallback 추가)
    const roomCat = c.salesByCategory.find((x: any) => x.categoryCode === 'ROOM' || x.categoryCode === '객실' || x.category_code === 'ROOM' || x.category_code === '객실');
    if (roomCat) totalRoomRev = Number(roomCat.todayActual || roomCat.totalSales || roomCat.total_sales || roomCat.sales || roomCat.revenue || 0);

    const golfCat = c.salesByCategory.find((x: any) => x.categoryCode === 'GOLF' || x.categoryCode === '골프' || x.category_code === 'GOLF' || x.category_code === '골프');
    if (golfCat) totalGolfRev = Number(golfCat.todayActual || golfCat.totalSales || golfCat.total_sales || golfCat.sales || golfCat.revenue || 0);
  }

  // Fallback: If salesByCategory missing ROOM category, read from roomSummaryByType
  if (totalRoomRev === 0 && c.roomSummaryByType && Array.isArray(c.roomSummaryByType)) {
    totalRoomRev = c.roomSummaryByType.reduce((sum: number, item: any) => sum + Number(item.revenue || 0), 0);
  }
  
  const totalResortRevGross = Number(c.summary?.totalRevenue ?? c.totalRevenue ?? 0);
  const totalRoomsSold = Number(c.summary?.totalRooms ?? c.totalRooms ?? 0);
  const totalVisitors = Number(c.summary?.totalVisitors ?? c.totalVisitors ?? 0);
  
  const isRange = Boolean(c.isRangeQuery || (c.startDate && c.endDate && c.startDate !== c.endDate));
  const days = isRange ? Math.max(1, c.resortSummary?.days || c.days || (Array.isArray(c.dailyTrends) ? c.dailyTrends.length : 1)) : 1;
  const physicalRoomInventory = 175 * days; // 16평 85 + 35평 85 + 51평 단독 5 = 총 175실/일

  const kpiMetrics = {
    totalOcc: physicalRoomInventory > 0 ? (totalRoomsSold / physicalRoomInventory) * 100 : 0,
    totalADR: totalRoomsSold > 0 ? (totalRoomRev / totalRoomsSold) : 0,
    revPAR: physicalRoomInventory > 0 ? (totalRoomRev / physicalRoomInventory) : 0,
    trevPAR: physicalRoomInventory > 0 ? (totalResortRevGross / physicalRoomInventory) : 0,
    days: days,
    raw: {
      totalRoomRev,
      totalRoomsSold,
      totalInventory: physicalRoomInventory,
      totalResortRevGross,
      totalRoomCap: physicalRoomInventory,
      totalVisitors
    }
  };

  return {
    success: true,
    date: c.date || '',
    kpiMetrics: kpiMetrics,
    ytd: { 
      actual: Number(c.summary?.ytdActual ?? c.summary?.ytdRevenue ?? c.summary?.ytd_revenue ?? c.ytd?.revenue ?? c.ytd?.actual ?? c.ytdActual ?? c.summary?.ytd_gross ?? 0), 
      ly_actual: Number(c.summary?.ytdLy ?? c.summary?.ytdLyRevenue ?? c.summary?.ytd_ly_revenue ?? c.ytd?.lyRevenue ?? c.ytd?.lyActual ?? c.ytdLy ?? c.summary?.ly_ytd_gross ?? 0),
      gross: Number(c.summary?.ytdActual ?? c.summary?.ytdRevenue ?? c.summary?.ytd_revenue ?? c.ytd?.revenue ?? c.ytd?.actual ?? c.ytdActual ?? c.summary?.ytd_gross ?? 0),
      ly_gross: Number(c.summary?.ytdLy ?? c.summary?.ytdLyRevenue ?? c.summary?.ytd_ly_revenue ?? c.ytd?.lyRevenue ?? c.ytd?.lyActual ?? c.ytdLy ?? c.summary?.ly_ytd_gross ?? 0),
      ly_day: Number(c.summary?.ytdLy ?? c.summary?.ytdLyRevenue ?? c.summary?.ytd_ly_revenue ?? c.ytd?.lyRevenue ?? c.ytd?.lyActual ?? c.ytdLy ?? c.summary?.ly_ytd_gross ?? 0)
    },
    today: { 
      actual: Number(c.summary?.totalRevenue ?? c.totalRevenue ?? 0), 
      ly_actual: Number(c.summary?.todayLyRevenue ?? c.summary?.lyRevenue ?? 0),
      gross: Number(c.summary?.totalRevenue ?? c.totalRevenue ?? 0),
      ly_gross: Number(c.summary?.todayLyRevenue ?? c.summary?.lyRevenue ?? 0),
      ly_day: Number(c.summary?.todayLyRevenue ?? c.summary?.lyRevenue ?? 0)
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, 
    avg_green_fee: 0, 
    weekly_trend: [], 
    rooms: c.rooms || [],
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: (() => {
      const visited = Number(c.summary?.totalGolfTeams || c.summary?.visitedGolfTeams || 0);
      const canceled = Number(c.summary?.totalGolfCanceledTeams || c.summary?.pendingGolfTeams || c.summary?.cancelledGolfTeams || 0);
      const rawReserved = Number(c.summary?.totalGolfReservedTeams || c.summary?.reservedGolfTeams || 0);
      const reserved = rawReserved > 0 ? rawReserved : (visited + canceled);
      const visitedPlayers = Number(c.summary?.totalGolfVisitors || c.summary?.visitedPlayers || c.salesByCategory?.find((x:any)=>(x.categoryCode==='GOLF' || x.categoryCode==='골프'))?.visitors || 0);
      
      return {
        reservedTeams: reserved,
        visitedTeams: visited,
        pendingTeams: canceled,
        visitedPlayers: visitedPlayers,
        avgGreenFee: Number(
          c.summary?.golfAvgGreenFee ?? 
          c.summary?.golf_avg_green_fee ?? 
          (visitedPlayers > 0 ? Math.round(totalGolfRev / visitedPlayers) : 0)
        ),
        ly_avgGreenFee: 0,
      };
    })(),
    golfFacilityBreakdown: c.golfFacilityBreakdown || [],
    qa_metrics: c.qa_metrics || null
  };
};



// Removed CHANNEL_ENUM and normalizeMarketType to comply with No Frontend Aggregation SSOT Rule

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>) => {
  if (!payload) return null;

  const isRange = Boolean(payload.isRangeQuery || (payload.startDate && payload.endDate && payload.startDate !== payload.endDate));
  let days = isRange ? Math.max(1, payload.resortSummary?.days || payload.days || (Array.isArray(payload.dailyTrends) ? payload.dailyTrends.length : 1)) : 1;

  // Fallback days calculation from startDate and endDate if dailyTrends missing
  if (isRange && days === 1 && payload.startDate && payload.endDate) {
    const s = new Date(payload.startDate);
    const e = new Date(payload.endDate);
    const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) days = diff;
  }

  const dailyCap16 = Number(masterCapacities?.['16평']) || 85;
  const dailyCap35 = Number(masterCapacities?.['35평']) || 85;
  const dailyCap51 = Number(masterCapacities?.['51평']) || 90; // Option A: 5 dedicated + 85 connected limit = 90 rooms/day

  // 1. Map directly from SSOT roomSummaryByType with period capacity
  const roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
    '16평': { sold: 0, cap: dailyCap16 * days, rev: 0 },
    '35평': { sold: 0, cap: dailyCap35 * days, rev: 0 },
    '51평': { sold: 0, cap: dailyCap51 * days, rev: 0 },
    '기타': { sold: 0, cap: 0, rev: 0 }
  };

  if (payload.roomSummaryByType && Array.isArray(payload.roomSummaryByType)) {
    payload.roomSummaryByType.forEach((item: any) => {
      const typeName = item.room_type || item.roomType || '기타';
      const sold = Number(item.rooms_sold || item.roomsSold || 0);
      const rev = Number(item.revenue || 0);

      if (typeName.includes('16평')) {
        roomOccupancyMap['16평'].sold += sold; roomOccupancyMap['16평'].rev += rev;
      } else if (typeName.includes('35평')) {
        roomOccupancyMap['35평'].sold += sold; roomOccupancyMap['35평'].rev += rev;
      } else if (typeName.includes('51평')) {
        roomOccupancyMap['51평'].sold += sold; roomOccupancyMap['51평'].rev += rev;
      } else {
        roomOccupancyMap['기타'].sold += sold; roomOccupancyMap['기타'].rev += rev;
      }
    });
  }

  // 2. Map directly from SSOT salesByChannel
  const channelAdrData: Array<{ channel: string; roomsSold: number; totalRevenue: number; adr: number }> = [];
  
  if (payload.salesByChannel && Array.isArray(payload.salesByChannel)) {
    payload.salesByChannel.forEach((item: any) => {
      const sold = Number(item.rooms_sold || item.roomsSold || 0);
      const rev = Number(item.revenue || 0);
      channelAdrData.push({
        channel: item.channelName || item.channel_name || item.channel_group || item.channelGroup || '기타',
        roomsSold: sold,
        totalRevenue: rev,
        adr: sold > 0 ? Math.round(rev / sold) : 0
      });
    });
  }
  
  // Sort descending by revenue
  channelAdrData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 3. Market Type Segment Data (SSOT salesBySegment / marketType)
  const marketTypeAdrData: Array<{ marketType: string; roomsSold: number; totalRevenue: number; adr: number }> = [];

  if (payload.salesBySegment && Array.isArray(payload.salesBySegment)) {
    payload.salesBySegment.forEach((item: any) => {
      const sold = Number(item.rooms_sold || item.roomsSold || 0);
      const rev = Number(item.revenue || item.todayRevenue || item.totalSales || 0);
      marketTypeAdrData.push({
        marketType: item.segmentName || item.marketType || item.segment_name || item.market_type || '기타',
        roomsSold: sold,
        totalRevenue: rev,
        adr: sold > 0 ? Math.round(rev / sold) : 0
      });
    });
  }
  marketTypeAdrData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // SSOT Principle for Lodging Stats
  let summaryRevenue = 0;
  if (payload.salesByCategory && Array.isArray(payload.salesByCategory)) {
    // 백엔드의 완벽한 카멜케이스화에 따른 SSOT 단일 매핑 (fallback 추가)
    const roomCat = payload.salesByCategory.find((x: any) => x.categoryCode === 'ROOM' || x.categoryCode === '객실' || x.category_code === 'ROOM' || x.category_code === '객실');
    if (roomCat) summaryRevenue = Number(roomCat.todayActual || roomCat.totalSales || roomCat.total_sales || roomCat.sales || roomCat.revenue || 0);
  }
  
  let summaryRoomsSold = payload.summary?.totalRooms || 0;
  let summaryTotalCapacity = payload.summary?.totalRoomCap || payload.summary?.totalGuests || 0;

  const lodgingStats = {
    revenue: summaryRevenue,
    roomsSold: summaryRoomsSold,
    totalCapacity: summaryTotalCapacity,
    adr: summaryRoomsSold > 0 ? Math.round(summaryRevenue / summaryRoomsSold) : 0
  };

  return {
    success: payload.success || true,
    date: payload.date,
    ytd: { actual: payload.ytd?.actual || 0, ly_actual: payload.ytd?.ly_actual || 0 },
    today: { actual: payload.today?.actual || 0, ly_actual: payload.today?.ly_actual || 0 },
    roomOccupancyMap,
    channelAdrData,
    marketTypeAdrData,
    rateAdrData: marketTypeAdrData, // Fallback alias for backward compatibility
    lodgingStats,
    rawRooms: [], 
    rawRoomTypeBreakdown: []
  };
};
