import type { CoreDataState } from '../contexts/CoreDataContext';

export const parseNum = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const num = Number(val.replace(/,/g, '').trim());
    return isNaN(num) ? 0 : num;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export interface TransformedHomeData {
  success: boolean;
  date: string;
  kpiMetrics: {
    totalOcc: number;
    totalADR: number;
    revPAR: number;
    trevPAR: number;
    days: number;
    raw: {
      totalRoomRev: number;
      totalRoomsSold: number;
      totalInventory: number;
      totalResortRevGross: number;
      totalRoomCap: number;
      totalVisitors: number;
    };
  };
  ytd: {
    actual: number;
    ly_actual: number;
    gross: number;
    ly_gross: number;
    ly_day: number;
  };
  today: {
    actual: number;
    ly_actual: number;
    gross: number;
    ly_gross: number;
    ly_day: number;
  };
  hq_today: Array<{ hq: string; actual: number; qty: number }>;
  store_today: Array<{ shop_name: string; actual: number; qty: number }>;
  rooms: any[];
  roomTypeBreakdown: any[];
  golfSummary: {
    reservedTeams: number;
    visitedTeams: number;
    canceledTeams: number;
    pendingTeams: number;
    visitedPlayers: number;
    avgGreenFee: number;
    ly_avgGreenFee: number;
  };
  golfFacilityBreakdown: any[];
  qa_metrics: any;
}

export const transformHomeData = (core: CoreDataState): TransformedHomeData | null => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    c.salesByCategory.forEach((m: any) => {
      const cat = m.categoryCode || '기타업장';
      hqTodayMap[cat] = parseNum(m.totalSales || 0);
    });
  }
  
  const hqToday = Object.keys(hqTodayMap).map(key => ({
    hq: key,
    actual: hqTodayMap[key],
    qty: 0
  })).filter(h => h.actual > 0);

  const storeToday: { shop_name: string; actual: number; qty: number }[] = [];
  if (c.salesByFacility && Array.isArray(c.salesByFacility)) {
    c.salesByFacility.forEach((m: any) => {
      storeToday.push({
        shop_name: m.shopName || m.facilityName || '알수없음',
        actual: parseNum(m.totalSales || 0),
        qty: parseNum(m.visitors || m.totalVisitors || 0)
      });
    });
  }

  let totalRoomRev = 0;
  let totalGolfRev = 0;
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    const roomCat = c.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) totalRoomRev = parseNum(roomCat.totalSales || 0);

    const golfCat = c.salesByCategory.find((x: any) => x.categoryCode === 'GOLF');
    if (golfCat) totalGolfRev = parseNum(golfCat.totalSales || 0);
  }
  
  const totalResortRevGross = parseNum(c.summary?.totalRevenue || 0);
  const totalRoomsSold = parseNum(c.summary?.totalRooms || 0);
  const totalVisitors = parseNum(c.summary?.totalVisitors || 0);
  
  const isRange = Boolean(c.isRangeQuery || (c.startDate && c.endDate && c.startDate !== c.endDate));
  const days = isRange ? Math.max(1, c.resortSummary?.days || c.days || (Array.isArray(c.dailyTrends) ? c.dailyTrends.length : 1)) : 1;
  const physicalRoomInventory = 175 * days;

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

  const actualRev = parseNum(c.summary?.totalRevenue || 0);
  const lyRev = parseNum(c.summary?.todayLyRevenue || 0);
  const ytdRev = parseNum(c.summary?.ytdActual || c.summary?.ytdRevenue || 0);
  const ytdLyRev = parseNum(c.summary?.ytdLy || 0);

  return {
    success: true,
    date: c.date || '',
    kpiMetrics,
    ytd: { 
      actual: ytdRev, 
      ly_actual: ytdLyRev,
      gross: ytdRev,
      ly_gross: ytdLyRev,
      ly_day: ytdLyRev
    },
    today: { 
      actual: actualRev, 
      ly_actual: lyRev,
      gross: actualRev,
      ly_gross: lyRev,
      ly_day: lyRev
    },
    hq_today: hqToday,
    store_today: storeToday,
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

export interface TransformedResortData {
  success: boolean;
  date?: string;
  ytd: { actual: number; ly_actual: number };
  today: { actual: number; ly_actual: number };
  roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }>;
  channelAdrData: Array<{ channel: string; roomsSold: number; totalRevenue: number; adr: number }>;
  marketTypeAdrData: Array<{ marketType: string; roomsSold: number; totalRevenue: number; adr: number }>;
  rateAdrData: Array<{ marketType: string; roomsSold: number; totalRevenue: number; adr: number }>;
  lodgingStats: {
    revenue: number;
    roomsSold: number;
    totalCapacity: number;
    adr: number;
  };
}

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>): TransformedResortData | null => {
  if (!payload) return null;

  const isRange = Boolean(payload.isRangeQuery || (payload.startDate && payload.endDate && payload.startDate !== payload.endDate));
  let days = isRange ? Math.max(1, payload.resortSummary?.days || payload.days || (Array.isArray(payload.dailyTrends) ? payload.dailyTrends.length : 1)) : 1;

  if (isRange && days === 1 && payload.startDate && payload.endDate) {
    const s = new Date(payload.startDate);
    const e = new Date(payload.endDate);
    const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) days = diff;
  }

  const dailyCap16 = parseNum(masterCapacities?.['16평']) || 85;
  const dailyCap35 = parseNum(masterCapacities?.['35평']) || 85;
  const dailyCap51 = parseNum(masterCapacities?.['51평']) || 90;

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
  channelAdrData.sort((a, b) => b.totalRevenue - a.totalRevenue);

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
    const roomCat = payload.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) summaryRevenue = parseNum(roomCat.totalSales || 0);
  }
  
  const summaryRoomsSold = parseNum(payload.summary?.totalRooms || 0);
  const summaryTotalCapacity = parseNum(payload.summary?.totalRoomCap || 0);

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
    rateAdrData: marketTypeAdrData,
    lodgingStats
  };
};
