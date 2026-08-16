export const parseNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

import type { CoreDataState } from '../contexts/CoreDataContext';


export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    c.salesByCategory.forEach((m: any) => {
      const cat = m.categoryCode || '기타업장';
      // [SSOT 무관용] 월간 조회시 단일 매출(todayActual)이 아닌 월간 매출이 정상 반영되도록 strict mapping
      hqTodayMap[cat] = parseNum(m.totalSales || 0);
    });
  }
  
  const hqToday = Object.keys(hqTodayMap).map(key => ({
    hq: key,
    actual: hqTodayMap[key],
    qty: 0
  })).filter(h => h.actual > 0);

  // [SSOT 무관용] 누락된 부대시설(단일 매출) 테이블 복구. salesByFacility를 직접 활용
  const storeToday: { shop_name: string; actual: number; qty: number }[] = [];
  if (c.salesByFacility && Array.isArray(c.salesByFacility)) {
    c.salesByFacility.forEach((m: any) => {
      storeToday.push({
        shop_name: m.shopName || m.facilityName || '알수없음', // facilityName은 구버전 호환용으로 남김
        actual: parseNum(m.totalSales || 0),
        qty: parseNum(m.visitors || m.totalVisitors || 0)
      });
    });
  }

  // Use SSOT values explicitly
  // Find room revenue from salesByCategory as backend gives it per category
  let totalRoomRev = 0;
  let totalGolfRev = 0;
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    // 백엔드의 완벽한 카멜케이스화에 따른 SSOT 단일 매핑
    const roomCat = c.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) totalRoomRev = parseNum(roomCat.totalSales || 0);

    const golfCat = c.salesByCategory.find((x: any) => x.categoryCode === 'GOLF');
    if (golfCat) totalGolfRev = parseNum(golfCat.totalSales || 0);
  }

  // Fallback: 백엔드의 salesByCategory에 ROOM이 없을 경우 프론트엔드가 자체적으로 roomSummaryByType를
  // reduce()로 합산하여 소계를 생성하는 행위(Slice Summation)는 바이블 원칙에 위배되므로 제거.
  
  const totalResortRevGross = parseNum(c.summary?.totalRevenue || 0);
  const totalRoomsSold = parseNum(c.summary?.totalRooms || 0);
  const totalVisitors = parseNum(c.summary?.totalVisitors || 0);
  
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
      actual: parseNum(c.summary?.ytdActual || c.summary?.ytdRevenue || 0), 
      ly_actual: parseNum(c.summary?.ytdLy || 0),
      gross: parseNum(c.summary?.ytdActual || c.summary?.ytdRevenue || 0),
      ly_gross: parseNum(c.summary?.ytdLy || 0),
      ly_day: parseNum(c.summary?.ytdLy || 0)
    },
    today: { 
      actual: parseNum(c.summary?.totalRevenue || 0), 
      ly_actual: parseNum(c.summary?.todayLyRevenue || 0),
      gross: parseNum(c.summary?.totalRevenue || 0),
      ly_gross: parseNum(c.summary?.todayLyRevenue || 0),
      ly_day: parseNum(c.summary?.todayLyRevenue || 0)
    },
    hq_today: hqToday,
    store_today: storeToday,
    adr: 0, 
    avg_green_fee: 0, 
    weekly_trend: [], 
    rooms: c.rooms || [],
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: (() => {
      const visited = parseNum(c.summary?.totalGolfTeams || 0);
      const canceled = parseNum(c.summary?.totalGolfCanceledTeams || 0);
      const reserved = parseNum(c.summary?.totalGolfReservedTeams || 0);
      const visitedPlayers = parseNum(c.summary?.totalGolfVisitors || 0);
      
      return {
        reservedTeams: reserved,
        visitedTeams: visited,
        canceledTeams: canceled,
        pendingTeams: c.summary?.totalGolfPendingTeams !== undefined 
          ? parseNum(c.summary.totalGolfPendingTeams) 
          : Math.max(0, reserved - visited - canceled),
        visitedPlayers: visitedPlayers,
        avgGreenFee: parseNum(
          c.summary?.golfAvgGreenFee ?? 
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

  const dailyCap16 = parseNum(masterCapacities?.['16평']) || 85;
  const dailyCap35 = parseNum(masterCapacities?.['35평']) || 85;
  const dailyCap51 = parseNum(masterCapacities?.['51평']) || 90; // Option A: 5 dedicated + 85 connected limit = 90 rooms/day

  // 1. Map directly from SSOT roomSummaryByType with period capacity
  const roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
    '16평': { sold: 0, cap: dailyCap16 * days, rev: 0 },
    '35평': { sold: 0, cap: dailyCap35 * days, rev: 0 },
    '51평': { sold: 0, cap: dailyCap51 * days, rev: 0 },
    '기타': { sold: 0, cap: 0, rev: 0 }
  };

  if (payload.roomSummaryByType && Array.isArray(payload.roomSummaryByType)) {
    payload.roomSummaryByType.forEach((item: any) => {
      const typeName = item.roomType || '기타';
      const sold = parseNum(item.roomsSold || 0);
      const rev = parseNum(item.totalSales || item.revenue || 0);

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
      const sold = parseNum(item.roomsSold || 0);
      const rev = parseNum(item.totalSales || item.revenue || 0);
      channelAdrData.push({
        channel: item.channelName || '기타',
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
      const sold = parseNum(item.roomsSold || 0);
      const rev = parseNum(item.totalSales || 0);
      marketTypeAdrData.push({
        marketType: item.segmentName || '기타',
        roomsSold: sold,
        totalRevenue: rev,
        adr: sold > 0 ? Math.round(rev / sold) : 0
      });
    });
  }
  marketTypeAdrData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  let summaryRevenue = 0;
  if (payload.salesByCategory && Array.isArray(payload.salesByCategory)) {
    // 백엔드의 완벽한 카멜케이스화에 따른 SSOT 단일 매핑
    const roomCat = payload.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) summaryRevenue = parseNum(roomCat.totalSales || 0);
  }
  
  let summaryRoomsSold = parseNum(payload.summary?.totalRooms || 0);
  let summaryTotalCapacity = parseNum(payload.summary?.totalRoomCap || 0);

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
