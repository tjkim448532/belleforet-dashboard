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
      // 52주(364일) 전: 요일 동일 비교
      ly.setDate(ly.getDate() - 364);
    } else {
      // 정확히 1년 전
      ly.setFullYear(ly.getFullYear() - 1);
    }
    return ly;
  };

  // 1. today
  const d1 = formatYMD(target);
  const d2 = formatYMD(calcLY(target));

  // 2. mtd
  const mtdStart = new Date(target);
  mtdStart.setDate(1);
  const d3_start = formatYMD(mtdStart);
  const d3_end = formatYMD(target);

  const d4_start = formatYMD(calcLY(mtdStart));
  const d4_end = formatYMD(calcLY(target));

  // 3. ytd
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
      const payload = json.data || json;
      return payload.gridData || [];
    } catch (err) {
      console.warn(`Fallback to empty for ${s}~${e} due to API error:`, err);
      return [];
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

  const addData = (grid: any[], period: 'today' | 'mtd' | 'ytd', type: 'actual' | 'lastYear') => {
    grid.forEach(item => {
      // 렌더링 호환성을 위해 이름 매핑
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
      record[period][type] += item.salesAmount;
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
      if (ly === 0) return 0; // Prevent Infinity
      return ((act - ly) / Math.abs(ly)) * 100;
    };
    
    r.today.growthRate = calcGrowth(r.today.actual, r.today.lastYear);
    r.mtd.growthRate = calcGrowth(r.mtd.actual, r.mtd.lastYear);
    r.ytd.growthRate = calcGrowth(r.ytd.actual, r.ytd.lastYear);
    return r;
  });

  return netData;
};
