import { secureFetcher } from './secureFetcher';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
  mtd: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
  ytd: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
}

const formatYMD = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fetchMatrixData = async (startDateStr: string, isWeeklyMode: boolean = false): Promise<MatrixRow[]> => {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
  
  const target = new Date(startDateStr + "T00:00:00");

  const calcLY = (date: Date) => {
    const ly = new Date(date);
    if (isWeeklyMode) {
      ly.setDate(ly.getDate() - 364);
    } else {
      ly.setFullYear(ly.getFullYear() - 1);
    }
    return ly;
  };

  const d1 = formatYMD(target);
  const d2 = formatYMD(calcLY(target));

  const mtdStart = new Date(target);
  mtdStart.setDate(1);
  const d3_start = formatYMD(mtdStart);
  const d3_end = formatYMD(target);

  const d4_start = formatYMD(calcLY(mtdStart));
  const d4_end = formatYMD(calcLY(target));

  const ytdStart = new Date(target);
  ytdStart.setMonth(0);
  ytdStart.setDate(1);
  const d5_start = formatYMD(ytdStart);
  const d5_end = formatYMD(target);

  const d6_start = formatYMD(calcLY(ytdStart));
  const d6_end = formatYMD(calcLY(target));

  const fetcher = async (s: string, e: string) => {
    try {
      const json = await secureFetcher(`${API_BASE}/api/v3/dashboard/revenue-summary?startDate=${s}&endDate=${e}`);
      return json.data || json;
    } catch (err) {
      console.warn(`Fallback to empty for ${s}~${e} due to API error:`, err);
      return null;
    }
  };

  const [t, tLY, m, mLY, y, yLY] = await Promise.all([
    fetcher(d1, d1),
    fetcher(d2, d2),
    fetcher(d3_start, d3_end),
    fetcher(d4_start, d4_end),
    fetcher(d5_start, d5_end),
    fetcher(d6_start, d6_end)
  ]);

  const shopMap = new Map<string, MatrixRow>();

  const addData = (payload: any, period: 'today' | 'mtd' | 'ytd', type: 'actual' | 'lastYear') => {
    if (!payload) return;
    
    const grid = payload.gridData || [];
    const golfBreakdown = payload.golfFacilityBreakdown || [];
    const roomBreakdown = payload.roomTypeBreakdown || [];

    const hasGolfBreakdown = golfBreakdown.length > 0;
    const hasRoomBreakdown = roomBreakdown.length > 0;

    grid.forEach((item: any) => {
      let shop = item.depth2 || item.depth1 || '기타업장';
      let cat = item.depth1 || '기타';

      if (cat === 'GOLF') cat = '레저';
      if (cat === 'ROOM') cat = '숙박';
      if (cat === 'FNB') cat = '식음';
      
      // If we have breakdowns for this category, skip the aggregate row
      if (hasGolfBreakdown && shop.includes('티켓')) return;
      if (hasRoomBreakdown && shop.includes('객실')) return;

      if (!shopMap.has(shop)) {
        shopMap.set(shop, {
          category: cat,
          shop_name: shop,
          today: { actual: 0, lastYear: 0, growthRate: 0 },
          mtd: { actual: 0, lastYear: 0, growthRate: 0 },
          ytd: { actual: 0, lastYear: 0, growthRate: 0 }
        });
      }
      shopMap.get(shop)![period][type] += (item.salesAmount || 0);
    });

    golfBreakdown.forEach((item: any) => {
      let shop = item.facility_name;
      let cat = '레저';
      if (!shopMap.has(shop)) {
        shopMap.set(shop, {
          category: cat,
          shop_name: shop,
          today: { actual: 0, lastYear: 0, growthRate: 0 },
          mtd: { actual: 0, lastYear: 0, growthRate: 0 },
          ytd: { actual: 0, lastYear: 0, growthRate: 0 }
        });
      }
      shopMap.get(shop)![period][type] += (item.sales_amount || 0);
    });

    roomBreakdown.forEach((item: any) => {
      let shop = item.room_type;
      let cat = '숙박';
      if (!shopMap.has(shop)) {
        shopMap.set(shop, {
          category: cat,
          shop_name: shop,
          today: { actual: 0, lastYear: 0, growthRate: 0 },
          mtd: { actual: 0, lastYear: 0, growthRate: 0 },
          ytd: { actual: 0, lastYear: 0, growthRate: 0 }
        });
      }
      shopMap.get(shop)![period][type] += (item.room_revenue || 0);
    });
  };

  addData(t, 'today', 'actual');
  addData(tLY, 'today', 'lastYear');
  addData(m, 'mtd', 'actual');
  addData(mLY, 'mtd', 'lastYear');
  addData(y, 'ytd', 'actual');
  addData(yLY, 'ytd', 'lastYear');

  const netData = Array.from(shopMap.values()).map(r => {
    const calcGrowth = (act: number, ly: number) => {
      if (ly === 0) return 0;
      return ((act - ly) / Math.abs(ly)) * 100;
    };
    
    r.today.growthRate = calcGrowth(r.today.actual, r.today.lastYear);
    r.mtd.growthRate = calcGrowth(r.mtd.actual, r.mtd.lastYear);
    r.ytd.growthRate = calcGrowth(r.ytd.actual, r.ytd.lastYear);
    return r;
  });

  return netData;
};
