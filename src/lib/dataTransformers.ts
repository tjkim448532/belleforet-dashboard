import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

import { EXCEL_LAYOUT, findExcelShopName } from './matrixSchema';

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core || !core.core.gridData) return [];
  const gridData = core.core.gridData;
  const rows: MatrixRow[] = [];

  const excelDataMap = new Map<string, MatrixRow>();
  EXCEL_LAYOUT.forEach(group => {
    group.shops.forEach(shop => {
      const key = `${group.category}|${shop}`;
      excelDataMap.set(key, {
        category: group.category,
        shop_name: shop,
        today: { actual: 0, lastYear: 0, growthRate: 0 },
        mtd: { actual: 0, lastYear: 0, growthRate: 0 },
        ytd: { actual: 0, lastYear: 0, growthRate: 0 }
      });
    });
  });

  const addAmount = (category: string, shopName: string, amount: number) => {
    if (!amount) return;
    const key = `${category}|${shopName}`;
    if (excelDataMap.has(key)) {
      const row = excelDataMap.get(key)!;
      row.today.actual += amount;
    }
  };

  // Map gridData
  gridData.forEach((item: any) => {
    const isDetail = item.depth3 && item.depth3 !== '전체';
    const rawName = isDetail ? item.depth3 : (item.depth2 || '기타');
    
    // Only map if it's a detail row OR if depth3 is entirely missing
    // We want to avoid mapping '전체' (aggregate rows) if we have detail rows
    // But since findExcelShopName maps explicitly to known shops, aggregate rows like '티켓업장' won't match any shop!
    // Wait, '객실' matches ROOM. '골프장' doesn't match anything. '식음업장' doesn't match anything.
    // So if item is an aggregate row, and it matches (like '객실' -> ROOM), it will be added.
    const match = findExcelShopName(rawName);
    if (match) {
      // Don't add aggregate '객실' if we have roomTypeBreakdown? 
      // Actually, if we use the breakdown arrays, they might overlap.
      // Let's just use gridData for now. If breakdown array has values, we add them too, BUT we might double count!
      // To prevent double counting for ROOM and GOLF:
      const hasGolfBreakdown = core.core?.golfFacilityBreakdown && core.core.golfFacilityBreakdown.length > 0;
      const hasRoomBreakdown = core.core?.roomTypeBreakdown && core.core.roomTypeBreakdown.length > 0;
      const hasTicketBreakdown = core.core?.ticketFacilityBreakdown && core.core.ticketFacilityBreakdown.length > 0;
      const hasFnbBreakdown = core.core?.fnbFacilityBreakdown && core.core.fnbFacilityBreakdown.length > 0;
      
      if (match.category === '객실 Total' && hasRoomBreakdown) return;
      if (match.category === '골프 Total' && hasGolfBreakdown) return;
      if (match.category === '티켓업장 Total' && hasTicketBreakdown) return;
      if (match.category === '식음업장 Total' && hasFnbBreakdown) return;
      
      addAmount(match.category, match.shopName, item.salesAmount || 0);
    }
  });

  // Map Breakdown Arrays
  const mapBreakdown = (arr: any[], nameField: string, valueField: string) => {
    if (!arr) return;
    arr.forEach((item: any) => {
      const match = findExcelShopName(item[nameField] || item.shop_name || item.name || '');
      if (match) addAmount(match.category, match.shopName, item[valueField] || item.sales_amount || item.actual || item.revenue || 0);
    });
  };

  mapBreakdown(core.core.golfFacilityBreakdown, 'facility_name', 'revenue');
  mapBreakdown(core.core.roomTypeBreakdown, 'room_type', 'room_revenue');
  mapBreakdown(core.core.ticketFacilityBreakdown, 'facility_name', 'revenue');
  mapBreakdown(core.core.fnbFacilityBreakdown, 'facility_name', 'revenue');

  // Push rows in exact EXCEL_LAYOUT order
  EXCEL_LAYOUT.forEach(group => {
    group.shops.forEach(shop => {
      const key = `${group.category}|${shop}`;
      rows.push(excelDataMap.get(key)!);
    });
  });

  return rows;
};

export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.gridData) {
    // To prevent double counting, only sum rows that are '전체' at depth3, 
    // OR if depth3 doesn't exist/isn't '전체', sum the detail rows.
    // Safest way: if there's an aggregate for depth2 (depth3 === '전체'), we sum those.
    // If a depth2 group has NO '전체' row, we sum its details.
    const depth2Totals: Record<string, number> = {};
    const depth1Map: Record<string, string> = {};
    
    c.gridData.forEach((g: any) => {
      depth1Map[g.depth2] = g.depth1 || '기타';
      if (g.depth3 === '전체') {
        depth2Totals[g.depth2] = g.salesAmount || 0;
      }
    });

    c.gridData.forEach((g: any) => {
      // If this depth2 group didn't have an explicit '전체' aggregate, we manually sum its details
      if (g.depth3 !== '전체' && depth2Totals[g.depth2] === undefined) {
        depth2Totals[g.depth2] = (depth2Totals[g.depth2] || 0) + (g.salesAmount || 0);
      }
    });

    // Now sum up depth2 totals to get depth1 totals
    Object.keys(depth2Totals).forEach(depth2 => {
      const cat = depth1Map[depth2] || '기타';
      hqTodayMap[cat] = (hqTodayMap[cat] || 0) + depth2Totals[depth2];
    });
  }
  
  const hqToday = Object.keys(hqTodayMap).map(key => ({
    hq: key,
    actual: hqTodayMap[key],
    qty: 0 // Fallback
  })).filter(h => h.actual > 0);

  return {
    success: true,
    date: c.date || '',
    ytd: { 
      actual: c.ytd?.actual || 0, 
      ly_actual: c.ytd?.ly_actual || 0,
      ly_day: 0
    },
    today: { 
      actual: c.today?.actual || 0, 
      ly_actual: c.today?.ly_actual || 0,
      ly_day: 0
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, // Fallback
    avg_green_fee: 0, // Fallback
    weekly_trend: [], // Fallback
    golfSummary: c.golfSummary || {
      reservedTeams: 0,
      visitedTeams: 0,
      visitedPlayers: 0,
      avgGreenFee: 0,
      memberAvgGreenFee: 0,
      nonMemberAvgGreenFee: 0
    },
    qa_metrics: c.qa_metrics || null
  };
};

export const transformExecutiveData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  if (c.gridData) {
    const depth2Totals: Record<string, number> = {};
    const depth1Map: Record<string, string> = {};
    
    c.gridData.forEach((g: any) => {
      depth1Map[g.depth2] = g.depth1 || '기타';
      if (g.depth3 === '전체') {
        depth2Totals[g.depth2] = g.salesAmount || 0;
      }
    });

    c.gridData.forEach((g: any) => {
      if (g.depth3 !== '전체' && depth2Totals[g.depth2] === undefined) {
        depth2Totals[g.depth2] = (depth2Totals[g.depth2] || 0) + (g.salesAmount || 0);
      }
      
      // For details array, we want actual shops, not '전체'
      if (g.depth3 && g.depth3 !== '전체') {
        details.push({
          depth_2_shop: g.depth3,
          sales_amount: g.salesAmount || 0
        });
      } else if (!g.depth3 || g.depth3 === '전체') {
        // If there are no detail rows for this depth2, we might just push the depth2 as a fallback
        // but we'll do this later if details is empty
      }
    });

    Object.keys(depth2Totals).forEach(depth2 => {
      const cat = depth1Map[depth2] || '기타';
      hqGroups[cat] = (hqGroups[cat] || 0) + depth2Totals[depth2];
      
      // If we didn't push any details for this depth2, push the depth2 itself
      if (!details.some(d => d.depth_2_shop === depth2) && !c.gridData.some((g:any) => g.depth2 === depth2 && g.depth3 && g.depth3 !== '전체')) {
        details.push({
          depth_2_shop: depth2,
          sales_amount: depth2Totals[depth2]
        });
      }
    });
  }
  
  const summaryList = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: c.today?.actual || 0,
      dod_growth: 0,
      rooms_sold: 0,
      golf_visited_players: c.golfSummary?.visitedPlayers || 0,
      golf_visited_teams: c.golfSummary?.visitedTeams || 0
    },
    revenueData: { summary: summaryList, details }
  };
};
