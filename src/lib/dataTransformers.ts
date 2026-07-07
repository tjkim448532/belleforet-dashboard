import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  category_code?: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

const calcGrowth = (actual: number, ly: number) => {
  if (!ly) return actual ? 100 : 0;
  return ((actual - ly) / Math.abs(ly)) * 100;
};

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core || !core.core.gridData) return [];
  const gridData = core.core.gridData;
  const rows: MatrixRow[] = [];

  gridData.forEach((item: any) => {
    rows.push({
      category: item.category_name || '기타업장',
      category_code: item.category_code || 'OTHER',
      shop_name: item.shop_name || '알수없음',
      today: {
        actual: Number(item.today_actual) || 0,
        lastYear: Number(item.today_ly) || 0,
        growthRate: calcGrowth(Number(item.today_actual) || 0, Number(item.today_ly) || 0)
      },
      mtd: {
        actual: Number(item.mtd_actual) || 0,
        lastYear: Number(item.mtd_ly) || 0,
        growthRate: calcGrowth(Number(item.mtd_actual) || 0, Number(item.mtd_ly) || 0)
      },
      ytd: {
        actual: Number(item.ytd_actual) || 0,
        lastYear: Number(item.ytd_ly) || 0,
        growthRate: calcGrowth(Number(item.ytd_actual) || 0, Number(item.ytd_ly) || 0)
      }
    });
  });

  return rows;
};

export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.gridData) {
    c.gridData.forEach((g: any) => {
      const cat = g.category_name || '기타업장';
      hqTodayMap[cat] = (hqTodayMap[cat] || 0) + (Number(g.today_actual) || 0);
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
        const weightedQty = Number(rt.rooms_sold_weighted || qty);
        
        totalProductsSold += qty;
        hybridOccupiedRooms += weightedQty;
        
        if (rt.shop_name?.includes('16평')) {
          sold16 += qty;
        } else if (rt.shop_name?.includes('35평')) {
          sold35 += qty;
        } else if (rt.shop_name?.includes('51평')) {
          sold51 += qty;
        }
      });
  }

  let totalInventory = 0;
  if (dynamicDailyCapacity > 0) {
    if (Math.abs(dynamicDailyCapacity - 180) < 100) {
      totalInventory = dynamicDailyCapacity * days;
    } else if (Math.abs((dynamicDailyCapacity / days) - 180) < 100) {
      totalInventory = dynamicDailyCapacity;
    } else {
      totalInventory = dynamicDailyCapacity * days;
    }
  } else if (r.total_capacity > 0) {
    if (Math.abs(r.total_capacity - 180) < 100) {
      totalInventory = r.total_capacity * days;
    } else if (Math.abs((r.total_capacity / days) - 180) < 100) {
      totalInventory = r.total_capacity;
    } else {
      totalInventory = r.total_capacity * days;
    }
  }
  
  const soldOther = totalProductsSold - sold16 - sold35 - sold51;
  hybridOccupiedRooms += Math.max(0, soldOther);

  const totalRoomRev = Number(r.lodging_revenue || 0);
  const totalResortRevGross = Number(c.today_actual ?? c.today?.today_actual ?? c.today?.gross ?? c.today?.actual ?? 0);

  const kpiMetrics = {
    totalOcc: totalInventory > 0 ? (hybridOccupiedRooms / totalInventory) * 100 : 0,
    totalADR: totalProductsSold > 0 ? (totalRoomRev / totalProductsSold) : 0,
    revPAR: totalInventory > 0 ? (totalRoomRev / totalInventory) : 0,
    trevPAR: totalInventory > 0 ? (totalResortRevGross / totalInventory) : 0,
    days: days,
    weekdayDays: r.weekday_days ?? r.weekdayDays ?? 0,
    weekendDays: r.weekend_days ?? r.weekendDays ?? 0,
    raw: {
      totalRoomRev,
      totalProductsSold,
      totalInventory,
      totalResortRevGross
    }
  };

  return {
    success: true,
    date: c.date || '',
    kpiMetrics: kpiMetrics,
    ytd: { 
      actual: c.ytd_actual ?? c.ytd?.today_actual ?? c.ytd?.actual ?? 0, 
      ly_actual: c.ytd_ly ?? c.ytd?.today_ly ?? c.ytd?.ly_actual ?? 0,
      gross: c.ytd_actual ?? c.ytd?.today_actual ?? c.ytd?.gross ?? c.ytd?.actual ?? 0,
      ly_gross: c.ytd_ly ?? c.ytd?.today_ly ?? c.ytd?.ly_gross ?? c.ytd?.ly_actual ?? 0,
      ly_day: 0
    },
    today: { 
      actual: c.today_actual ?? c.today?.today_actual ?? c.today?.actual ?? 0, 
      ly_actual: c.today_ly ?? c.today?.today_ly ?? c.today?.ly_actual ?? 0,
      gross: c.today_actual ?? c.today?.today_actual ?? c.today?.gross ?? c.today?.actual ?? 0,
      ly_gross: c.today_ly ?? c.today?.today_ly ?? c.today?.ly_gross ?? c.today?.ly_actual ?? 0,
      ly_day: 0
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, 
    avg_green_fee: 0, 
    weekly_trend: [], 
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: {
      reservedTeams: c.golfSummary?.reservedTeams || 0,
      visitedTeams: c.golfSummary?.visitedTeams || 0,
      visitedPlayers: c.golfSummary?.visitedPlayers || 0,
      avgGreenFee: c.golfSummary?.avgGreenFee || c.golfSummary?.avg_green_fee || 0,
      ly_avgGreenFee: c.golfSummary?.ly_avgGreenFee || c.golfSummary?.ly_avg_green_fee || 0,
      memberAvgGreenFee: c.golfSummary?.memberAvgGreenFee || c.golfSummary?.member_avg_green_fee || 0,
      nonMemberAvgGreenFee: c.golfSummary?.nonMemberAvgGreenFee || c.golfSummary?.non_member_avg_green_fee || 0
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
    c.gridData.forEach((g: any) => {
      const cat = g.category_name || '기타업장';
      hqGroups[cat] = (hqGroups[cat] || 0) + (Number(g.today_actual) || 0);
      
      details.push({
        depth_2_shop: g.shop_name,
        total_sales: Number(g.today_actual) || 0
      });
    });
  }
  
  const summaryList = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: c.today_actual ?? c.today?.today_actual ?? c.today?.gross ?? c.today?.actual ?? 0,
      dod_growth: 0,
      rooms_sold: c.resortSummary?.rooms_sold || 0,
      golf_visited_players: c.golfSummary?.visitedPlayers || 0,
      golf_visited_teams: c.golfSummary?.visitedTeams || 0,
      ytd_goal_pct: c.kpi?.ytd_goal_pct || 0
    },
    revenueData: { summary: summaryList, details }
  };
};
