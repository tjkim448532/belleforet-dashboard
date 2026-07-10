import type { CoreDataState } from '../contexts/CoreDataContext';
import { shopNameNormalizer } from './uiGroupDictionary';

export interface MatrixRow {
  category: string;
  category_code?: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
  isSubtotal?: boolean;
}

const calcGrowth = (actual: number, ly: number) => {
  if (!ly) return actual ? 100 : 0;
  return ((actual - ly) / Math.abs(ly)) * 100;
};

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core || !core.core.gridData) return [];
  const gridData = core.core.gridData;
  const rowMap = new Map<string, MatrixRow>();

  gridData.forEach((item: any) => {
    // 백엔드에서 더 이상 서브토탈 데이터를 주지 않는다고 했으나 여전히 섞여 들어오는 경우가 있음
    const isBackendSubtotalRow = item.depth3 === '전체' || item.shop_name === '전체' || item.shop_name === '합계';
    // NET, VAT, SVC, Grand Total 등은 영업장이 아니라 백엔드의 합계행이므로 반드시 필터링!
    const isTaxOrTotalRow = ['NET', 'VAT', 'SVC', 'GRAND TOTAL', 'TOTAL'].includes(String(item.shop_name || '').toUpperCase());
    
    if (isBackendSubtotalRow || isTaxOrTotalRow) return;

    let categoryCode = item.category_code || 'OTHER';
    let categoryName = item.category_name || '기타영업';

    let shopName = item.shop_name ?? item.shopName ?? item.facility_name ?? item.name ?? (item.depth3 ? (item.depth3 === '전체' ? (item.depth2 ?? '알수없음') : item.depth3) : '알수없음');
    
    // 1. '- Posting' 병합 처리
    shopName = shopName.replace(/-\s*posting/i, '').trim();

    // 2. 띄어쓰기 및 미세 명칭 차이 병합 처리
    shopName = shopName.replace(/\s+/g, '');
    
    // O(1) Dictionary Mapping for shopName normalization
    shopName = shopNameNormalizer[shopName] || shopName;

    // Backend category_code and name are trusted directly
    categoryCode = item.category_code || categoryCode;
    categoryName = item.category_name || item.category || categoryName;

    const t_act = Number(item.today_actual ?? item.actual ?? item.today_sales ?? item.salesAmount ?? item.revenue) || 0;
    const t_ly = Number(item.today_ly ?? item.ly_actual ?? item.today_last_year ?? item.lastYear) || 0;
    const m_act = Number(item.mtd_actual ?? item.mtdActual ?? item.mtd_sales) || 0;
    const m_ly = Number(item.mtd_ly ?? item.mtdLy ?? item.mtd_last_year) || 0;
    const y_act = Number(item.ytd_actual ?? item.ytdActual ?? item.ytd_sales) || 0;
    const y_ly = Number(item.ytd_ly ?? item.ytdLy ?? item.ytd_last_year) || 0;

    const key = `${categoryCode}_${shopName}`;

    if (rowMap.has(key)) {
      const existing = rowMap.get(key)!;
      existing.today.actual += t_act;
      existing.today.lastYear += t_ly;
      existing.today.growthRate = calcGrowth(existing.today.actual, existing.today.lastYear);
      
      existing.mtd.actual += m_act;
      existing.mtd.lastYear += m_ly;
      existing.mtd.growthRate = calcGrowth(existing.mtd.actual, existing.mtd.lastYear);
      
      existing.ytd.actual += y_act;
      existing.ytd.lastYear += y_ly;
      existing.ytd.growthRate = calcGrowth(existing.ytd.actual, existing.ytd.lastYear);
    } else {
      rowMap.set(key, {
        category: categoryName,
        category_code: categoryCode,
        shop_name: shopName,
        today: { actual: t_act, lastYear: t_ly, growthRate: calcGrowth(t_act, t_ly) },
        mtd: { actual: m_act, lastYear: m_ly, growthRate: calcGrowth(m_act, m_ly) },
        ytd: { actual: y_act, lastYear: y_ly, growthRate: calcGrowth(y_act, y_ly) },
        isSubtotal: false
      });
    }
  });

  return Array.from(rowMap.values()).filter(row => {
    // 제로(0) 필터링: 금일, 누계, 전년 모두 0원인 쓰레기 행은 렌더링에서 제외
    const hasToday = row.today.actual > 0 || row.today.lastYear > 0;
    const hasMtd = row.mtd.actual > 0 || row.mtd.lastYear > 0;
    const hasYtd = row.ytd.actual > 0 || row.ytd.lastYear > 0;
    return hasToday || hasMtd || hasYtd;
  });
};

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
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    const roomCat = c.salesByCategory.find((x: any) => x.category === '객실');
    if (roomCat) totalRoomRev = Number(roomCat.sales || roomCat.revenue || 0);
  }
  
  const totalResortRevGross = c.summary?.totalRevenue || 0;
  const totalRoomsSold = c.summary?.totalRooms || 0;
  const totalRoomCap = c.summary?.totalRoomCap || c.summary?.totalGuests || 0;
  const totalVisitors = c.summary?.totalVisitors || 0;
  
  // Total Inventory is still needed from some logic or if not provided by backend, default to 180 (for now)
  const days = Math.max(1, c.resortSummary?.days || 1);
  const totalInventory = c.summary?.totalInventory || 180 * days;



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
      actual: 0, 
      ly_actual: 0,
      gross: 0,
      ly_gross: 0,
      ly_day: 0
    },
    today: { 
      actual: c.summary?.totalRevenue || 0, 
      ly_actual: 0,
      gross: c.summary?.totalRevenue || 0,
      ly_gross: 0,
      ly_day: 0
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
      visitedPlayers: 0, // 바이블에 없는 경우 0
      avgGreenFee: 0,
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
        roomOccupancyMap['16평'].sold = sold; roomOccupancyMap['16평'].rev = rev;
      } else if (typeName.includes('35평')) {
        roomOccupancyMap['35평'].sold = sold; roomOccupancyMap['35평'].rev = rev;
      } else if (typeName.includes('51평')) {
        roomOccupancyMap['51평'].sold = sold; roomOccupancyMap['51평'].rev = rev;
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
    const roomCat = payload.salesByCategory.find((x: any) => x.category === '객실');
    if (roomCat) summaryRevenue = Number(roomCat.sales || roomCat.revenue || 0);
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
