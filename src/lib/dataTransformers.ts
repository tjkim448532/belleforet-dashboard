import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core) return [];
  
  const breakdown = core.core.breakdown || {};
  const rows: MatrixRow[] = [];

  const categoryMap: Record<string, string> = {
    'FNB': '식음',
    'GOLF': '레저',
    'ROOM': '숙박',
    'OTHER': '기타'
  };

  Object.keys(breakdown).forEach(category => {
    const catData = breakdown[category];
    const mappedCategory = categoryMap[category] || '기타';
    if (catData && Array.isArray(catData.shops)) {
      catData.shops.forEach((shop: any) => {
        rows.push({
          category: mappedCategory,
          shop_name: shop.shop_name,
          today: { actual: shop.amount || 0, lastYear: 0, growthRate: 0 },
          mtd: { actual: 0, lastYear: 0, growthRate: 0 },
          ytd: { actual: 0, lastYear: 0, growthRate: 0 }
        });
      });
    }
  });

  return rows;
};

export const transformHomeData = (core: CoreDataState) => {
  if (!core.core) return null;
  const c = core.core;
  
  const summary = c.summary || {};
  const breakdown = c.breakdown || {};

  const mapCategoryName = (key: string) => {
    if (key === 'GOLF') return '골프';
    if (key === 'ROOM') return '숙박';
    if (key === 'FNB') return '식음';
    return '레저/기타';
  };

  const hqToday = Object.keys(breakdown).map(key => ({
    hq: mapCategoryName(key),
    actual: breakdown[key]?.total_amount || 0,
    qty: 0 // Fallback
  })).filter(h => h.actual > 0);

  return {
    success: true,
    date: c.date || '',
    ytd: { 
      actual: summary.ytd_actual || 0, 
      ly_actual: summary.ly_ytd_actual || 0,
      ly_day: 0
    },
    today: { 
      actual: summary.today_actual || 0, 
      ly_actual: summary.ly_today_actual || 0,
      ly_day: 0
    },
    hq_today: hqToday,
    store_today: [] as { shop_name: string; actual: number; qty: number }[],
    adr: 0, // Fallback
    avg_green_fee: 0, // Fallback
    weekly_trend: [], // Fallback
    golfSummary: {
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
  const summary = c.summary || {};
  const breakdown = c.breakdown || {};
  
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  Object.keys(breakdown).forEach(category => {
    const catData = breakdown[category];
    hqGroups[category] = catData?.total_amount || 0;
    
    if (catData && Array.isArray(catData.shops)) {
      catData.shops.forEach((shop: any) => {
        details.push({
          depth_2_shop: shop.shop_name,
          sales_amount: shop.amount || 0
        });
      });
    }
  });
  
  const summaryList = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: summary.today_actual || 0,
      dod_growth: 0,
      rooms_sold: 0,
      golf_visited_players: 0,
      golf_visited_teams: 0
    },
    revenueData: { summary: summaryList, details }
  };
};
