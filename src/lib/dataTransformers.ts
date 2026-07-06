import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  category_code?: string;
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
  const unmappedRows: MatrixRow[] = [];

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

  const addBreakdownData = (category: string, shopName: string, item: any) => {
    const key = `${category}|${shopName}`;
    if (excelDataMap.has(key)) {
      const row = excelDataMap.get(key)!;
      row.today.actual += Number(item.today_actual || item.revenue || item.actual || item.sales_amount || item.room_revenue || 0);
      row.today.lastYear += Number(item.today_ly || 0);
      row.mtd.actual += Number(item.mtd_actual || 0);
      row.mtd.lastYear += Number(item.mtd_ly || 0);
      row.ytd.actual += Number(item.ytd_actual || 0);
      row.ytd.lastYear += Number(item.ytd_ly || 0);
    }
  };

  const addGridData = (category: string, shopName: string, item: any, skipTodayActual: boolean) => {
    const key = `${category}|${shopName}`;
    if (excelDataMap.has(key)) {
      const row = excelDataMap.get(key)!;
      if (!skipTodayActual) {
        row.today.actual += Number(item.salesAmount) || 0;
      }
      row.today.lastYear += Number(item.lastYearSalesAmount) || 0;
      
      row.mtd.actual += Number(item.mtdSalesAmount) || 0;
      row.mtd.lastYear += Number(item.lastYearMtdSalesAmount) || 0;
      
      row.ytd.actual += Number(item.ytdSalesAmount) || 0;
      row.ytd.lastYear += Number(item.lastYearYtdSalesAmount) || 0;
    }
  };

  const hasGolfBreakdown = core.core?.golfFacilityBreakdown && core.core.golfFacilityBreakdown.length > 0;
  const hasRoomBreakdown = core.core?.roomTypeBreakdown && core.core.roomTypeBreakdown.length > 0;
  const hasTicketBreakdown = core.core?.ticketFacilityBreakdown && core.core.ticketFacilityBreakdown.length > 0;
  const hasFnbBreakdown = core.core?.fnbFacilityBreakdown && core.core.fnbFacilityBreakdown.length > 0;

  // Map gridData
  gridData.forEach((item: any) => {
    const isDetail = item.depth3 && item.depth3 !== '전체';
    const rawName = isDetail ? item.depth3 : (item.depth2 || '기타');
    const amount = item.salesAmount || 0;
    
    const match = findExcelShopName(rawName);
    
    // Determine if we should skip this gridData row because we are using Breakdown arrays instead
    const skipRoom = match?.category === '객실 Total' || item.depth2?.includes('객실');
    const skipGolf = match?.category === '골프 Total' || item.depth2?.includes('골프');
    const skipTicket = match?.category === '티켓업장 Total' || item.depth2?.includes('티켓');
    const skipFnb = match?.category === '식음업장 Total' || item.depth2?.includes('식음');
    const skipOther = match?.category === '기타업장 Total' || item.depth2?.includes('기타');
    const skipBanquet = match?.category === '연회 Total' || item.depth2?.includes('연회');

    if (match) {
      const shouldSkipTodayActual = Boolean(
        (skipRoom && hasRoomBreakdown) ||
        (skipGolf && hasGolfBreakdown) ||
        (skipTicket && hasTicketBreakdown) ||
        (skipFnb && hasFnbBreakdown) ||
        (skipOther && core.core?.otherFacilityBreakdown?.length > 0) ||
        (skipBanquet && core.core?.banquetFacilityBreakdown?.length > 0)
      );
      
      addGridData(match.category, match.shopName, item, shouldSkipTodayActual);
    } else if (amount > 0) {
      // Unmapped gridData
      // If it's an aggregate row (not a detail) AND we have breakdown data for that category, SKIP IT to prevent double counting
      if (!isDetail) {
        if (skipRoom && hasRoomBreakdown) return;
        if (skipGolf && hasGolfBreakdown) return;
        if (skipTicket && hasTicketBreakdown) return;
        if (skipFnb && hasFnbBreakdown) return;
        if (skipOther && core.core?.otherFacilityBreakdown?.length > 0) return;
        if (skipBanquet && core.core?.banquetFacilityBreakdown?.length > 0) return;
      }
      // Unmapped gridData
      // determine default category based on depth1 or depth2
      let defaultCategory = '기타업장 Total';
      if (item.depth1?.includes('레저') || item.depth2?.includes('골프')) defaultCategory = '골프 Total';
      else if (item.depth1?.includes('숙박') || item.depth2?.includes('객실')) defaultCategory = '객실 Total';
      else if (item.depth1?.includes('식음')) defaultCategory = '식음업장 Total';
      
      unmappedRows.push({
        category: defaultCategory,
        shop_name: `[미매핑] ${rawName}`,
        today: { actual: amount, lastYear: Number(item.lastYearSalesAmount) || 0, growthRate: 0 },
        mtd: { actual: Number(item.mtdSalesAmount) || 0, lastYear: Number(item.lastYearMtdSalesAmount) || 0, growthRate: 0 },
        ytd: { actual: Number(item.ytdSalesAmount) || 0, lastYear: Number(item.lastYearYtdSalesAmount) || 0, growthRate: 0 }
      });
    }
  });

  // Map Breakdown Arrays
  const mapBreakdown = (arr: any[], defaultCategory: string) => {
    if (!arr || !Array.isArray(arr)) return;
    arr.forEach((item: any) => {
      try {
        const rawName = String(item.facility_name || item.room_type || item.shop_name || item.name || '알수없음');
        const todayActual = Number(item.today_actual ?? item.revenue ?? item.actual ?? item.sales_amount ?? item.room_revenue ?? 0);
        const mtdActual = Number(item.mtd_actual ?? 0);
        const ytdActual = Number(item.ytd_actual ?? 0);
        
        if (todayActual === 0 && mtdActual === 0 && ytdActual === 0) return;

        const match = findExcelShopName(rawName);
        if (match) {
          addBreakdownData(match.category, match.shopName, item);
        } else {
          // Unmapped breakdown data
          unmappedRows.push({
            category: defaultCategory,
            shop_name: `[미매핑] ${rawName}`,
            today: { actual: todayActual, lastYear: Number(item.today_ly || 0), growthRate: 0 },
            mtd: { actual: mtdActual, lastYear: Number(item.mtd_ly || 0), growthRate: 0 },
            ytd: { actual: ytdActual, lastYear: Number(item.ytd_ly || 0), growthRate: 0 }
          });
        }
      } catch (e) {
        console.error('Error mapping breakdown item', item, e);
      }
    });
  };

  mapBreakdown(core.core.golfFacilityBreakdown, '골프 Total');
  mapBreakdown(core.core.roomTypeBreakdown, '객실 Total');
  mapBreakdown(core.core.ticketFacilityBreakdown, '티켓업장 Total');
  mapBreakdown(core.core.fnbFacilityBreakdown, '식음업장 Total');
  mapBreakdown(core.core.otherFacilityBreakdown, '기타업장 Total');
  mapBreakdown(core.core.banquetFacilityBreakdown, '연회 Total');

  // Push rows in exact EXCEL_LAYOUT order
  EXCEL_LAYOUT.forEach(group => {
    group.shops.forEach(shop => {
      const key = `${group.category}|${shop}`;
      rows.push(excelDataMap.get(key)!);
    });
    
    // Append unmapped rows for this category
    const unmappedForGroup = unmappedRows.filter(r => r.category === group.category);
    rows.push(...unmappedForGroup);
  });

  const calcGrowth = (actual: number, ly: number) => {
    if (!ly) return actual ? 100 : 0;
    return ((actual - ly) / Math.abs(ly)) * 100;
  };

  rows.forEach(r => {
    r.today.growthRate = calcGrowth(r.today.actual, r.today.lastYear);
    r.mtd.growthRate = calcGrowth(r.mtd.actual, r.mtd.lastYear);
    r.ytd.growthRate = calcGrowth(r.ytd.actual, r.ytd.lastYear);
  });

  return rows;
};

export const transformMatrixWeeklyToExcelLayout = (weeklyData: MatrixRow[]): MatrixRow[] => {
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

  const addAmount = (category: string, shopName: string, sourceRow: MatrixRow) => {
    const key = `${category}|${shopName}`;
    if (excelDataMap.has(key)) {
      const row = excelDataMap.get(key)!;
      row.today.actual += sourceRow.today?.actual || 0;
      row.today.lastYear += sourceRow.today?.lastYear || 0;
      row.mtd.actual += sourceRow.mtd?.actual || 0;
      row.mtd.lastYear += sourceRow.mtd?.lastYear || 0;
      row.ytd.actual += sourceRow.ytd?.actual || 0;
      row.ytd.lastYear += sourceRow.ytd?.lastYear || 0;
      
      const calcGrowth = (actual: number, ly: number) => ly ? ((actual - ly) / ly) * 100 : (actual ? 100 : 0);
      row.today.growthRate = calcGrowth(row.today.actual, row.today.lastYear);
      row.mtd.growthRate = calcGrowth(row.mtd.actual, row.mtd.lastYear);
      row.ytd.growthRate = calcGrowth(row.ytd.actual, row.ytd.lastYear);
    }
  };

  if (Array.isArray(weeklyData)) {
    weeklyData.forEach(item => {
      const rawName = item.shop_name;
      if (!rawName) return;
      const match = findExcelShopName(rawName);
      if (match) {
        addAmount(match.category, match.shopName, item);
      }
    });
  }

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

  const r = c.resortSummary || {};
  const days = Math.max(1, r.days || 1);
  
  let dynamicDailyCapacity = 0;
  let sold16 = 0;
  let sold35 = 0;
  let sold51 = 0;
  let totalProductsSold = 0;
  let hybridOccupiedRooms = 0;

  if (c.roomTypeBreakdown) {
      c.roomTypeBreakdown.forEach((rt: any) => {
        dynamicDailyCapacity += Number(rt.total_capacity || 0);
        
        const qty = Number(rt.qty || rt.visitors || 0);
        
        totalProductsSold += qty;
        hybridOccupiedRooms += qty;
        
        if (rt.facility_name.includes('16평')) {
          sold16 += qty;
        } else if (rt.facility_name.includes('35평')) {
          sold35 += qty;
        } else if (rt.facility_name.includes('51평')) {
          sold51 += qty;
        }
      });
  }

  // Use dynamic capacity purely as requested by the guide. No hardcoded 180 fallback.
  const dailyCapacity = dynamicDailyCapacity > 0 ? dynamicDailyCapacity : 0;
  const totalInventory = dailyCapacity * days;
  
  // Calculate unmapped (Other) rooms to prevent leakage
  const soldOther = totalProductsSold - sold16 - sold35 - sold51;
  
  // Total OCC hybrid calculation: uses weighted rooms for 51평 natively
  // (hybridOccupiedRooms already calculated above, adding soldOther just in case)
  hybridOccupiedRooms += Math.max(0, soldOther);

  const totalRoomRev = Number(r.lodging_revenue || 0);
  // Use net revenue (actual) instead of gross as per guide
  const totalResortRevNet = Number(c.today?.actual || 0);

  const kpiMetrics = {
    totalOcc: totalInventory > 0 ? (hybridOccupiedRooms / totalInventory) * 100 : 0,
    totalADR: totalProductsSold > 0 ? (totalRoomRev / totalProductsSold) : 0,
    revPAR: totalInventory > 0 ? (totalRoomRev / totalInventory) : 0,
    trevPAR: totalInventory > 0 ? (totalResortRevNet / totalInventory) : 0,
    days: days,
    weekdayDays: r.weekdayDays || 0,
    weekendDays: r.weekendDays || 0
  };

  return {
    success: true,
    date: c.date || '',
    kpiMetrics: kpiMetrics,
    ytd: { 
      actual: c.ytd?.actual || 0, 
      ly_actual: c.ytd?.ly_actual || 0,
      gross: c.ytd?.gross || c.ytd?.actual || 0,
      ly_gross: c.ytd?.ly_gross || c.ytd?.ly_actual || 0,
      ly_day: 0
    },
    today: { 
      actual: c.today?.actual || 0, 
      ly_actual: c.today?.ly_actual || 0,
      gross: c.today?.gross || c.today?.actual || 0,
      ly_gross: c.today?.ly_gross || c.today?.ly_actual || 0,
      ly_day: 0
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, // Fallback
    avg_green_fee: 0, // Fallback
    weekly_trend: [], // Fallback
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: {
      reservedTeams: c.golfSummary?.reservedTeams || 0,
      visitedTeams: c.golfSummary?.visitedTeams || 0,
      visitedPlayers: c.golfSummary?.visitedPlayers || 0,
      avgGreenFee: c.golfSummary?.avgGreenFee || 0,
      memberAvgGreenFee: c.golfSummary?.memberAvgGreenFee || 0,
      nonMemberAvgGreenFee: c.golfSummary?.nonMemberAvgGreenFee || 0
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
      total_revenue_today: c.today?.gross || c.today?.actual || 0,
      dod_growth: 0,
      rooms_sold: 0,
      golf_visited_players: c.golfSummary?.visitedPlayers || 0,
      golf_visited_teams: c.golfSummary?.visitedTeams || 0,
      ytd_goal_pct: c.kpi?.ytd_goal_pct || 0
    },
    revenueData: { summary: summaryList, details }
  };
};
