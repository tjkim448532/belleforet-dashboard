import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core || !core.core.gridData) return [];
  const gridData = core.core.gridData;
  const golfBreakdown = core.core.golfFacilityBreakdown || [];
  const roomBreakdown = core.core.roomTypeBreakdown || [];
  const ticketBreakdown = core.core.ticketFacilityBreakdown || [];
  const fnbBreakdown = core.core.fnbFacilityBreakdown || [];

  const hasGolfBreakdown = golfBreakdown.length > 0;
  const hasRoomBreakdown = roomBreakdown.length > 0;
  const hasTicketBreakdown = ticketBreakdown.length > 0;
  const hasFnbBreakdown = fnbBreakdown.length > 0;

  const rows: MatrixRow[] = [];

  gridData.forEach((item: any) => {
    // Only use depth2 for the aggregate matching
    const shop = item.depth2 || item.depth1 || '기타업장';
    let cat = item.depth1 || '기타';

    if (cat === 'GOLF') cat = '레저';
    if (cat === 'ROOM') cat = '숙박';
    if (cat === 'FNB') cat = '식음';

    // Skip detailed rows from gridData since we use the new Breakdown arrays
    if (item.depth3 && item.depth3 !== '전체') return;

    // Filter out aggregate rows if we have breakdowns for them to avoid double counting
    if (hasGolfBreakdown && shop.includes('골프장')) return;
    if (hasRoomBreakdown && shop.includes('객실')) return;
    if (hasTicketBreakdown && shop.includes('티켓')) return;
    if (hasFnbBreakdown && shop.includes('식음')) return;

    rows.push({
      category: cat,
      shop_name: shop,
      today: { actual: item.salesAmount || 0, lastYear: 0, growthRate: 0 },
      mtd: { actual: 0, lastYear: 0, growthRate: 0 },
      ytd: { actual: 0, lastYear: 0, growthRate: 0 }
    });
  });

  const pushBreakdowns = (breakdownArray: any[], category: string, nameField: string, valueField: string) => {
    breakdownArray.forEach((item: any) => {
      rows.push({
        category,
        shop_name: item[nameField] || '기타',
        today: { actual: item[valueField] || 0, lastYear: 0, growthRate: 0 },
        mtd: { actual: 0, lastYear: 0, growthRate: 0 },
        ytd: { actual: 0, lastYear: 0, growthRate: 0 }
      });
    });
  };

  if (hasGolfBreakdown) pushBreakdowns(golfBreakdown, '레저', 'facility_name', 'sales_amount');
  if (hasRoomBreakdown) pushBreakdowns(roomBreakdown, '숙박', 'room_type', 'room_revenue');
  if (hasTicketBreakdown) pushBreakdowns(ticketBreakdown, '레저', 'facility_name', 'sales_amount');
  if (hasFnbBreakdown) pushBreakdowns(fnbBreakdown, '식음', 'facility_name', 'sales_amount');

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
