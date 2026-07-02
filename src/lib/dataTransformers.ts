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
  const rows: MatrixRow[] = [];
  
  gridData.forEach((item: any) => {
    rows.push({
      category: item.depth1 || '기타',
      shop_name: item.depth2 || '전체',
      today: { actual: item.salesAmount || 0, lastYear: 0, growthRate: 0 },
      mtd: { actual: 0, lastYear: 0, growthRate: 0 },
      ytd: { actual: 0, lastYear: 0, growthRate: 0 }
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
      const cat = g.depth1 || '기타';
      hqTodayMap[cat] = (hqTodayMap[cat] || 0) + (g.salesAmount || 0);
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
    }
  };
};

export const transformExecutiveData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  if (c.gridData) {
    c.gridData.forEach((g: any) => {
      const cat = g.depth1 || '기타';
      hqGroups[cat] = (hqGroups[cat] || 0) + (g.salesAmount || 0);
      details.push({
        depth_2_shop: g.depth2 || '전체',
        sales_amount: g.salesAmount || 0
      });
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
