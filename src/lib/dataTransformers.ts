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
  
  const totalResortRevGross = c.summary?.totalRevenue || 0;
  const totalRoomsSold = c.summary?.totalRooms || 0;
  const totalRoomCap = c.summary?.totalRoomCap || c.summary?.totalGuests || 0;
  const totalVisitors = c.summary?.totalVisitors || 0;
  
  const days = Math.max(1, c.resortSummary?.days || 1);
  // 폴백 복구: 백엔드에서 totalInventory가 아직 내려오지 않는 경우를 대비해 180실을 하드코딩 폴백으로 유지
  const totalInventory = c.summary?.totalInventory || 180;



  const kpiMetrics = {
    totalOcc: totalInventory > 0 ? (totalRoomsSold / totalInventory) * 100 : 0,
    totalADR: totalRoomsSold > 0 ? (totalRoomRev / totalRoomsSold) : 0,
    revPAR: totalInventory > 0 ? (totalRoomRev / totalInventory) : 0,
    trevPAR: totalInventory > 0 ? (totalResortRevGross / totalInventory) : 0,
    days: days,
    raw: {
      totalRoomRev,
      totalRoomsSold,
      totalInventory,
      totalResortRevGross,
      totalRoomCap,
      totalVisitors
    }
  };

  return {
    success: true,
    date: c.date || '',
    kpiMetrics: kpiMetrics,
    ytd: { 
      actual: c.summary?.ytdActual || c.summary?.ytdRevenue || c.summary?.ytd_revenue || c.ytd?.revenue || c.ytd?.actual || c.ytdActual || c.summary?.ytd_gross || 0, 
      ly_actual: c.summary?.ytdLy || c.summary?.ytdLyRevenue || c.summary?.ytd_ly_revenue || c.ytd?.lyRevenue || c.ytd?.lyActual || c.ytdLy || c.summary?.ly_ytd_gross || 0,
      gross: c.summary?.ytdActual || c.summary?.ytdRevenue || c.summary?.ytd_revenue || c.ytd?.revenue || c.ytd?.actual || c.ytdActual || c.summary?.ytd_gross || 0,
      ly_gross: c.summary?.ytdLy || c.summary?.ytdLyRevenue || c.summary?.ytd_ly_revenue || c.ytd?.lyRevenue || c.ytd?.lyActual || c.ytdLy || c.summary?.ly_ytd_gross || 0,
      ly_day: c.summary?.ytdLy || c.summary?.ytdLyRevenue || c.summary?.ytd_ly_revenue || c.ytd?.lyRevenue || c.ytd?.lyActual || c.ytdLy || c.summary?.ly_ytd_gross || 0
    },
    today: { 
      actual: c.summary?.totalRevenue || 0, 
      ly_actual: c.summary?.todayLyRevenue || c.summary?.lyRevenue || 0,
      gross: c.summary?.totalRevenue || 0,
      ly_gross: c.summary?.todayLyRevenue || c.summary?.lyRevenue || 0,
      ly_day: c.summary?.todayLyRevenue || c.summary?.lyRevenue || 0
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, 
    avg_green_fee: 0, 
    weekly_trend: [], 
    rooms: c.rooms || [],
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: {
      reservedTeams: c.summary?.totalGolfTeams || 0,
      visitedTeams: c.summary?.totalGolfTeams || 0,
      visitedPlayers: c.summary?.totalGolfVisitors || c.summary?.visitedPlayers || c.salesByCategory?.find((x:any)=>(x.categoryCode==='GOLF' || x.categoryCode==='골프'))?.visitors || 0,
      avgGreenFee: (c.summary?.totalGolfVisitors || c.summary?.visitedPlayers || c.salesByCategory?.find((x:any)=>(x.categoryCode==='GOLF' || x.categoryCode==='골프'))?.visitors || 0) > 0 ? (totalGolfRev / (c.summary?.totalGolfVisitors || c.summary?.visitedPlayers || c.salesByCategory?.find((x:any)=>(x.categoryCode==='GOLF' || x.categoryCode==='골프'))?.visitors || 1)) : 0,
      ly_avgGreenFee: 0,
    },
    golfFacilityBreakdown: c.golfFacilityBreakdown || [],
    qa_metrics: c.qa_metrics || null
  };
};



// Removed CHANNEL_ENUM and normalizeMarketType to comply with No Frontend Aggregation SSOT Rule

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>) => {
  if (!payload) return null;

  // 1. Map directly from SSOT roomSummaryByType with default fallback capacities (72실/72실/36실 = 총 180실)
  const roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
    '16평': { sold: 0, cap: Number(masterCapacities?.['16평']) || 72, rev: 0 },
    '35평': { sold: 0, cap: Number(masterCapacities?.['35평']) || 72, rev: 0 },
    '51평': { sold: 0, cap: Number(masterCapacities?.['51평']) || 36, rev: 0, isVirtual: true },
    '기타': { sold: 0, cap: Number(masterCapacities?.['기타']) || 0, rev: 0 }
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
        channel: item.channel_group || item.channelGroup || '기타',
        roomsSold: sold,
        totalRevenue: rev,
        adr: sold > 0 ? Math.round(rev / sold) : 0
      });
    });
  }
  
  // Sort descending by revenue
  channelAdrData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 3. Rate Type Data (Fallback removal, safely returning empty)
  // removed rateMap loop completely

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
    rateAdrData: [], // rateType is deprecated in V5 payload
    lodgingStats,
    rawRooms: [], 
    rawRoomTypeBreakdown: []
  };
};
