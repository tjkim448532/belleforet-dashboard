import type { CoreDataState, RawPayload } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
}

export const transformMatrixData = (core: CoreDataState, isWeeklyMode = false): MatrixRow[] => {
  if (!core.current || !core.mtd || !core.ytd) return [];

  const shopMap = new Map<string, MatrixRow>();

  const addData = (payload: RawPayload | null, period: 'today' | 'mtd' | 'ytd', type: 'actual' | 'lastYear') => {
    if (!payload || !payload.gridData) return;
    payload.gridData.forEach(item => {
      let shop = item.depth2 || '기타업장';
      let cat = item.depth1 || '기타';
      
      if (!shopMap.has(shop)) {
        shopMap.set(shop, {
          category: cat,
          shop_name: shop,
          today: { actual: 0, lastYear: 0, growthRate: 0 },
          mtd: { actual: 0, lastYear: 0, growthRate: 0 },
          ytd: { actual: 0, lastYear: 0, growthRate: 0 }
        });
      }
      const record = shopMap.get(shop)!;
      record[period][type] += item.salesAmount || 0;
    });
  };

  addData(core.current, 'today', 'actual');
  addData(isWeeklyMode ? core.currentLYWeekly : core.currentLY, 'today', 'lastYear');
  
  addData(core.mtd, 'mtd', 'actual');
  addData(isWeeklyMode ? core.mtdLYWeekly : core.mtdLY, 'mtd', 'lastYear');
  
  addData(core.ytd, 'ytd', 'actual');
  addData(isWeeklyMode ? core.ytdLYWeekly : core.ytdLY, 'ytd', 'lastYear');

  return Array.from(shopMap.values()).map(r => {
    const calcGrowth = (act: number, ly: number) => {
      if (ly === 0) return 0;
      return ((act - ly) / Math.abs(ly)) * 100;
    };
    
    r.today.growthRate = calcGrowth(r.today.actual, r.today.lastYear);
    r.mtd.growthRate = calcGrowth(r.mtd.actual, r.mtd.lastYear);
    r.ytd.growthRate = calcGrowth(r.ytd.actual, r.ytd.lastYear);
    return r;
  });
};

export const transformHomeData = (core: CoreDataState) => {
  if (!core.current) return null;
  const payload = core.current;

  const grid = payload.gridData || [];
  const hqGroups: Record<string, { actual: number, qty: number }> = {};
  grid.forEach((item: any) => {
    const cat = item.depth1 || '기타';
    if (!hqGroups[cat]) hqGroups[cat] = { actual: 0, qty: 0 };
    hqGroups[cat].actual += item.salesAmount;
    hqGroups[cat].qty += item.quantity;
  });

  const ts = payload.todaySummary || {
    golf_revenue: hqGroups['레저']?.actual || hqGroups['골프']?.actual || 0,
    room_revenue: hqGroups['숙박']?.actual || 0,
    food_revenue: hqGroups['식음']?.actual || 0,
    beverage_revenue: 0,
    other_revenue: hqGroups['기타']?.actual || 0,
    rooms_sold: hqGroups['숙박']?.qty || 0,
    golf_visited_teams: payload.golfSummary?.visitedTeams || 0,
    golf_visited_players: payload.golfSummary?.visitedPlayers || 0,
    total_gross: payload.today?.actual || 0
  };
  
  if (ts.total_gross === 0) {
    ts.total_gross = Object.values(hqGroups).reduce((acc, cur) => acc + cur.actual, 0);
  }

  const hqToday = [
    { hq: '골프', actual: ts.golf_revenue, qty: ts.golf_visited_teams || 0 },
    { hq: '숙박', actual: ts.room_revenue, qty: ts.rooms_sold || 0 },
    { hq: '식음', actual: ts.food_revenue + ts.beverage_revenue, qty: 0 },
    { hq: '레저/기타', actual: ts.other_revenue, qty: 0 }
  ].filter(h => h.actual > 0 || h.qty > 0);

  const weeklyTrend = (payload.weeklyTrend || []).map((wt: any) => {
    const dateObj = new Date(wt.date);
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
    return {
      day: dayName,
      fullDate: wt.date,
      this_week: wt.total_gross,
      last_week: 0
    };
  });

  const adrTableRooms = payload.adrTable?.reduce((acc: number, cur: any) => acc + (cur.roomsSold || 0), 0) || 0;
  const adrTableRev = payload.adrTable?.reduce((acc: number, cur: any) => acc + (cur.totalRevenue || 0), 0) || 0;

  const ytdActual = core.ytd?.today?.actual || core.ytd?.gridData?.reduce((acc: number, cur: any) => acc + (cur.salesAmount || 0), 0) || 0;
  const ytdLyActual = core.ytdLY?.today?.actual || core.ytdLY?.gridData?.reduce((acc: number, cur: any) => acc + (cur.salesAmount || 0), 0) || 0;
  const currentLyActual = core.currentLY?.today?.actual || core.currentLY?.gridData?.reduce((acc: number, cur: any) => acc + (cur.salesAmount || 0), 0) || 0;

  return {
    success: true,
    date: payload.targetDate || '',
    ytd: { actual: ytdActual, ly_actual: ytdLyActual },
    today: { actual: ts.total_gross, ly_actual: currentLyActual },
    hq_today: hqToday,
    store_today: [],
    adr: adrTableRooms > 0 ? Math.round(adrTableRev / adrTableRooms) : 0,
    avg_green_fee: payload.golfSummary?.avgGreenFee || 0,
    weekly_trend: weeklyTrend,
    golfSummary: {
      reservedTeams: payload.golfSummary?.reservedTeams || 0,
      visitedTeams: payload.golfSummary?.visitedTeams || ts.golf_visited_teams || 0,
      visitedPlayers: payload.golfSummary?.visitedPlayers || ts.golf_visited_players || 0,
      avgGreenFee: payload.golfSummary?.avgGreenFee || 0,
      memberAvgGreenFee: payload.golfSummary?.memberAvgGreenFee || 0,
      nonMemberAvgGreenFee: payload.golfSummary?.nonMemberAvgGreenFee || 0
    }
  };
};

export const transformExecutiveData = (core: CoreDataState) => {
  if (!core.current) return null;
  const payload = core.current;

  const grid = payload.gridData || [];
  const hqGroups: Record<string, number> = {};
  const details: any[] = [];
  
  grid.forEach((item: any) => {
    const cat = item.depth1 || '기타';
    if (!hqGroups[cat]) hqGroups[cat] = 0;
    hqGroups[cat] += item.salesAmount;
    
    details.push({
      depth_2_shop: item.depth2 || '알수없음',
      sales_amount: item.salesAmount
    });
  });
  
  const summary = Object.keys(hqGroups).map(key => ({
    depth_1_category: key,
    total_sales: hqGroups[key]
  }));
  
  return {
    kpiData: {
      total_revenue_today: payload.today?.actual || payload.todaySummary?.total_gross || 0,
      dod_growth: 0,
      rooms_sold: payload.todaySummary?.rooms_sold || grid.find((g: any) => g.depth1 === '숙박')?.quantity || 0,
      golf_visited_players: payload.golfSummary?.visitedPlayers || payload.todaySummary?.golf_visited_players || 0,
      golf_visited_teams: payload.golfSummary?.visitedTeams || payload.todaySummary?.golf_visited_teams || 0
    },
    revenueData: { summary, details }
  };
};
