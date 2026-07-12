import type { CoreDataState } from '../contexts/CoreDataContext';


export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    c.salesByCategory.forEach((m: any) => {
      const cat = m.category || '기타업장';
      hqTodayMap[cat] = Number(m.sales || m.revenue || 0);
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
    // 구버전 및 신버전 모든 스펙 통합 매핑 (무적 방어벽)
    const roomCat = c.salesByCategory.find((x: any) => 
      x.categoryCode === 'ROOM' || x.category_code === 'ROOM' || x.category_name === '객실' || x.category === '객실' || x.category === 'ROOM'
    );
    if (roomCat) totalRoomRev = Number(roomCat.totalSales || roomCat.total_sales || roomCat.sales || roomCat.revenue || 0);

    const golfCat = c.salesByCategory.find((x: any) => 
      x.categoryCode === 'GOLF' || x.category_code === 'GOLF' || x.category_name === '골프' || x.category === '골프' || x.category === 'GOLF'
    );
    if (golfCat) totalGolfRev = Number(golfCat.totalSales || golfCat.total_sales || golfCat.sales || golfCat.revenue || 0);
  }
  
  const totalResortRevGross = c.summary?.totalRevenue || 0;
  const totalRoomsSold = c.summary?.totalRooms || 0;
  const totalRoomCap = c.summary?.totalRoomCap || c.summary?.totalGuests || 0;
  const totalVisitors = c.summary?.totalVisitors || 0;
  
  const days = Math.max(1, c.resortSummary?.days || 1);
  // SSOT: 백엔드가 정확한 총 가용 객실수(totalInventory)를 주기로 약속함. 180실 하드코딩 폴백 완전 소각.
  const totalInventory = c.summary?.totalInventory || 0;



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
      actual: c.summary?.ytdRevenue || c.summary?.ytdGross || c.summary?.ytd_gross || c.summary?.ytd_actual || c.ytd_gross || c.ytdRevenue || 0, 
      ly_actual: c.summary?.lyYtdRevenue || c.summary?.lyYtdGross || c.summary?.ly_ytd_gross || c.ly_ytd_gross || 0,
      gross: c.summary?.ytdRevenue || c.summary?.ytdGross || c.summary?.ytd_gross || c.summary?.ytd_actual || c.ytd_gross || c.ytdRevenue || 0,
      ly_gross: c.summary?.lyYtdRevenue || c.summary?.lyYtdGross || c.summary?.ly_ytd_gross || c.ly_ytd_gross || 0,
      ly_day: c.summary?.lyYtdRevenue || c.summary?.lyYtdGross || c.summary?.ly_ytd_gross || c.ly_ytd_gross || 0
    },
    today: { 
      actual: c.summary?.totalRevenue || 0, 
      ly_actual: c.summary?.lyRevenue || 0,
      gross: c.summary?.totalRevenue || 0,
      ly_gross: c.summary?.lyRevenue || 0,
      ly_day: c.summary?.lyRevenue || 0
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
      visitedPlayers: c.summary?.visitedPlayers || 0,
      avgGreenFee: c.summary?.visitedPlayers > 0 ? (totalGolfRev / c.summary.visitedPlayers) : 0,
      ly_avgGreenFee: 0,
    },
    golfFacilityBreakdown: c.golfFacilityBreakdown || [],
    qa_metrics: c.qa_metrics || null
  };
};

export const transformExecutiveData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    // V5 Schema
    c.salesByCategory.forEach((m: any) => {
      hqGroups[m.category] = Number(m.sales || m.revenue || 0);
    });
  }
  
  if (c.salesByFacility && Array.isArray(c.salesByFacility)) {
    c.salesByFacility.forEach((t: any) => {
      details.push({
        depth_2_shop: t.sub_group_name || t.shop_name || t.facility_name,
        team_name: t.team_name,
        total_visitors: t.total_visitors || 0,
        total_sales: Number(t.total_sales || t.today_actual || t.revenue || 0)
      });
    });
  }
  
  const summaryList = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: c.summary?.totalRevenue || 0,
      dod_growth: 0,
      rooms_sold: c.summary?.totalRooms || 0,
      golf_visited_players: c.summary?.totalGolfPlayers || 0,
      golf_visited_teams: c.summary?.totalGolfTeams || 0,
      ytd_goal_pct: c.summary?.ytdGoalPct || 0
    },
    revenueData: { summary: summaryList, details }
  };
};

// Removed CHANNEL_ENUM and normalizeMarketType to comply with No Frontend Aggregation SSOT Rule

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>) => {
  if (!payload) return null;

  // 1. Map directly from SSOT roomSummaryByType
  const roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
    '16평': { sold: 0, cap: masterCapacities?.['16평'] ?? 0, rev: 0 },
    '35평': { sold: 0, cap: masterCapacities?.['35평'] ?? 0, rev: 0 },
    '51평': { sold: 0, cap: masterCapacities?.['51평'] ?? 0, rev: 0, isVirtual: true },
    '기타': { sold: 0, cap: 0, rev: 0 }
  };

  if (payload.roomSummaryByType && Array.isArray(payload.roomSummaryByType)) {
    payload.roomSummaryByType.forEach((item: any) => {
      const typeName = item.room_type || '기타';
      const sold = Number(item.rooms_sold || 0);
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
      const sold = Number(item.rooms_sold || 0);
      const rev = Number(item.revenue || 0);
      channelAdrData.push({
        channel: item.channel_group || '기타',
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
    // 구버전/신버전 스펙 무적 방어벽
    const roomCat = payload.salesByCategory.find((x: any) => 
      x.categoryCode === 'ROOM' || x.category_code === 'ROOM' || x.category_name === '객실' || x.category === '객실' || x.category === 'ROOM'
    );
    if (roomCat) summaryRevenue = Number(roomCat.totalSales || roomCat.total_sales || roomCat.sales || roomCat.revenue || 0);
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
