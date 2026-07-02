import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

export const transformMatrixData = (core: CoreDataState, _isWeeklyMode = false): MatrixRow[] => {
  if (!core.matrix) return [];
  
  // The backend's /api/dashboard/matrix returns the full matrix array (or we wrap it if needed).
  // Assuming it returns an array of MatrixRow or an object containing the array.
  const matrixData = Array.isArray(core.matrix) ? core.matrix : (core.matrix.data || core.matrix.gridData || []);
  
  // Assuming the backend matrix API already provides today, mtd, ytd with actual and lastYear.
  // If isWeeklyMode is true, the backend matrix API should handle it if we pass a weekly flag, 
  // but since we only pass ?date=..., we will assume the backend returns standard LY.
  // (We may need to adjust if the backend returns different structures).
  return matrixData as MatrixRow[];
};

export const transformHomeData = (core: CoreDataState) => {
  if (!core.core || !core.summary) return null;
  const c = core.core;
  const s = core.summary;

  const getMetric = (metric: any, period: 'today' | 'mtd' | 'ytd', field: 'actual' | 'ly_date' | 'ly_day') => {
    return metric?.[period]?.[field] || 0;
  };

  const ts = {
    golf_revenue: getMetric(c.golf_revenue, 'today', 'actual'),
    room_revenue: getMetric(c.room_revenue, 'today', 'actual'),
    food_revenue: getMetric(c.fnb_revenue, 'today', 'actual'),
    other_revenue: getMetric(c.other_revenue, 'today', 'actual') + getMetric(c.ticket_revenue, 'today', 'actual'),
    rooms_sold: getMetric(c.rooms_sold, 'today', 'actual'),
    golf_visited_teams: getMetric(c.golf_visited_teams, 'today', 'actual'),
    golf_visited_players: getMetric(c.golf_visited_players, 'today', 'actual'),
    total_gross: getMetric(c.total_net, 'today', 'actual')
  };

  const hqToday = [
    { hq: '골프', actual: ts.golf_revenue, qty: ts.golf_visited_teams },
    { hq: '숙박', actual: ts.room_revenue, qty: ts.rooms_sold },
    { hq: '식음', actual: ts.food_revenue, qty: 0 },
    { hq: '레저/기타', actual: ts.other_revenue, qty: 0 }
  ].filter(h => h.actual > 0 || h.qty > 0);

  const weeklyTrend = (s.weeklyTrend || []).map((wt: any) => {
    const dateObj = new Date(wt.date);
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
    return {
      day: dayName,
      fullDate: wt.date,
      this_week: wt.total_gross,
      last_week: 0
    };
  });

  const adrTableRooms = s.adrTable?.reduce((acc: number, cur: any) => acc + (cur.roomsSold || 0), 0) || 0;
  const adrTableRev = s.adrTable?.reduce((acc: number, cur: any) => acc + (cur.totalRevenue || 0), 0) || 0;

  return {
    success: true,
    date: c.targetDate || '',
    ytd: { 
      actual: getMetric(c.total_net, 'ytd', 'actual'), 
      ly_actual: getMetric(c.total_net, 'ytd', 'ly_date'),
      ly_day: getMetric(c.total_net, 'ytd', 'ly_day') 
    },
    today: { 
      actual: getMetric(c.total_net, 'today', 'actual'), 
      ly_actual: getMetric(c.total_net, 'today', 'ly_date'),
      ly_day: getMetric(c.total_net, 'today', 'ly_day') 
    },
    hq_today: hqToday,
    store_today: [],
    adr: adrTableRooms > 0 ? Math.round(adrTableRev / adrTableRooms) : 0,
    avg_green_fee: s.golfSummary?.avgGreenFee || 0,
    weekly_trend: weeklyTrend,
    golfSummary: {
      reservedTeams: s.golfSummary?.reservedTeams || 0,
      visitedTeams: ts.golf_visited_teams,
      visitedPlayers: ts.golf_visited_players,
      avgGreenFee: s.golfSummary?.avgGreenFee || 0,
      memberAvgGreenFee: s.golfSummary?.memberAvgGreenFee || 0,
      nonMemberAvgGreenFee: s.golfSummary?.nonMemberAvgGreenFee || 0
    }
  };
};

export const transformExecutiveData = (core: CoreDataState) => {
  if (!core.core || !core.matrix) return null;
  const c = core.core;
  
  // Matrix data returns array of shop level performance
  const grid = Array.isArray(core.matrix) ? core.matrix : (core.matrix.data || core.matrix.gridData || []);
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  grid.forEach((item: any) => {
    const cat = item.depth1 || '기타';
    if (!hqGroups[cat]) hqGroups[cat] = 0;
    hqGroups[cat] += item.salesAmount || 0;
    
    details.push({
      depth_2_shop: item.depth2 || '알수없음',
      sales_amount: item.salesAmount || 0
    });
  });
  
  const summary = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: c.total_net?.today?.actual || 0,
      dod_growth: 0,
      rooms_sold: c.rooms_sold?.today?.actual || 0,
      golf_visited_players: c.golf_visited_players?.today?.actual || 0,
      golf_visited_teams: c.golf_visited_teams?.today?.actual || 0
    },
    revenueData: { summary, details }
  };
};
