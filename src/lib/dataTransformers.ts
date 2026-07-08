import type { CoreDataState } from '../contexts/CoreDataContext';

export interface MatrixRow {
  category: string;
  category_code?: string;
  shop_name: string;
  today: { actual: number; lastYear: number; growthRate: number };
  mtd: { actual: number; lastYear: number; growthRate: number };
  ytd: { actual: number; lastYear: number; growthRate: number };
  isSubtotal?: boolean;
}

const calcGrowth = (actual: number, ly: number) => {
  if (!ly) return actual ? 100 : 0;
  return ((actual - ly) / Math.abs(ly)) * 100;
};

export const transformMatrixData = (core: CoreDataState): MatrixRow[] => {
  if (!core.core || !core.core.gridData) return [];
  const gridData = core.core.gridData;
  const rowMap = new Map<string, MatrixRow>();

  gridData.forEach((item: any) => {
    // 백엔드에서 더 이상 서브토탈 데이터를 주지 않는다고 했으나 여전히 섞여 들어오는 경우가 있음
    const isBackendSubtotalRow = item.depth3 === '전체' || item.shop_name === '전체' || item.shop_name === '합계';
    // NET, VAT, SVC, Grand Total 등은 영업장이 아니라 백엔드의 합계행이므로 반드시 필터링!
    const isTaxOrTotalRow = ['NET', 'VAT', 'SVC', 'GRAND TOTAL', 'TOTAL'].includes(String(item.shop_name || '').toUpperCase());
    
    if (isBackendSubtotalRow || isTaxOrTotalRow) return;

    let categoryCode = item.category_code || 'OTHER';
    let categoryName = item.category_name || '기타영업';

    let shopName = item.shop_name ?? item.shopName ?? item.facility_name ?? item.name ?? (item.depth3 ? (item.depth3 === '전체' ? (item.depth2 ?? '알수없음') : item.depth3) : '알수없음');
    
    // 1. '- Posting' 병합 처리
    shopName = shopName.replace(/-\s*posting/i, '').trim();

    // 2. 띄어쓰기 및 미세 명칭 차이 병합 처리
    shopName = shopName.replace(/\s+/g, '');
    if (shopName.includes('놀이동산')) {
      shopName = '놀이동산';
    }

    const shopCategoryMap: Record<string, { code: string, name: string }> = {
      // GOLF
      '그린피': { code: 'GOLF', name: '골프장' },
      '카트대여': { code: 'GOLF', name: '골프장' },
      '캐디피': { code: 'GOLF', name: '골프장' },
      '프로샵': { code: 'GOLF', name: '골프장' },
      '대여품': { code: 'GOLF', name: '골프장' },
      '골프': { code: 'GOLF', name: '골프장' },
      
      // FNB (식음업장)
      '조식': { code: 'FNB', name: '식음업장' },
      '브리스킷346': { code: 'FNB', name: '식음업장' },
      '브리스킷': { code: 'FNB', name: '식음업장' },
      '얼룩말카페': { code: 'FNB', name: '식음업장' },
      '밤밤테이블': { code: 'FNB', name: '식음업장' },
      '남도예담': { code: 'FNB', name: '식음업장' },
      '앵무새촌': { code: 'FNB', name: '식음업장' },
      '클럽하우스-레스토랑': { code: 'FNB', name: '식음업장' },
      '클럽하우스-스타트하우스': { code: 'FNB', name: '식음업장' },
      '레스토랑': { code: 'FNB', name: '식음업장' },
      '스타트하우스': { code: 'FNB', name: '식음업장' },
      '쿠치나': { code: 'FNB', name: '식음업장' },
      '핏스탑': { code: 'FNB', name: '식음업장' },
      '딜라이트': { code: 'FNB', name: '식음업장' },
      '밤밤트럭': { code: 'FNB', name: '식음업장' },
      '썸머트럭(현장)': { code: 'FNB', name: '식음업장' },
      '푸드코트': { code: 'FNB', name: '식음업장' },
      '치킨': { code: 'FNB', name: '식음업장' },
      '맥주': { code: 'FNB', name: '식음업장' },
      '바비큐': { code: 'FNB', name: '식음업장' },
      '라운지': { code: 'FNB', name: '식음업장' },
      '미디어-기프트샵': { code: 'FNB', name: '식음업장' },
      'BHC(멕시카나)': { code: 'FNB', name: '식음업장' },
      'CU편의점': { code: 'FNB', name: '식음업장' },
      '네네치킨': { code: 'FNB', name: '식음업장' },
      '투썸플레이스': { code: 'FNB', name: '식음업장' },
      
      // TICKET (티켓업장)
      '마리나클럽': { code: 'TICKET', name: '티켓업장' },
      '사계절썰매장': { code: 'TICKET', name: '티켓업장' },
      '썰매': { code: 'TICKET', name: '티켓업장' },
      '놀이동산': { code: 'TICKET', name: '티켓업장' },
      '익스트림루지': { code: 'TICKET', name: '티켓업장' },
      '루지': { code: 'TICKET', name: '티켓업장' },
      '벨포레목장': { code: 'TICKET', name: '티켓업장' },
      '벨포레목장(계열)': { code: 'TICKET', name: '티켓업장' },
      '목장': { code: 'TICKET', name: '티켓업장' },
      '미디어아트센터': { code: 'TICKET', name: '티켓업장' },
      '미디어아트': { code: 'TICKET', name: '티켓업장' },
      '짚라인': { code: 'TICKET', name: '티켓업장' },
      '썸머랜드(입장)': { code: 'TICKET', name: '티켓업장' },
      '썸머랜드': { code: 'TICKET', name: '티켓업장' },
      '온라인티켓': { code: 'TICKET', name: '티켓업장' },
      '온라인티켓 기타': { code: 'TICKET', name: '티켓업장' },
      '기타티켓': { code: 'TICKET', name: '티켓업장' },
      '기타티켓(패키지)': { code: 'TICKET', name: '티켓업장' },
      '마운틴카트': { code: 'TICKET', name: '티켓업장' },
      
      // MOTO (모토아레나)
      '모토아레나': { code: 'MOTO', name: '모토아레나' },
      '모토아레나렌탈샵': { code: 'MOTO', name: '모토아레나' },
      
      // ROOM (객실)
      '객실': { code: 'ROOM', name: '객실' },
      '콘도': { code: 'ROOM', name: '객실' },
      'ROOM OTHER': { code: 'ROOM', name: '객실' },
      '벨포레 콘도': { code: 'ROOM', name: '객실' },
      
      // BANQUET (연회)
      '연회장': { code: 'BANQUET', name: '연회' },
      '벨포레홀': { code: 'BANQUET', name: '연회' },
      '연회': { code: 'BANQUET', name: '연회' },
      '세미나': { code: 'BANQUET', name: '연회' },
      '대관': { code: 'BANQUET', name: '연회' }
    };

    // 1:1 매핑 시도, 실패 시 부분 일치(fallback) 혹은 'OTHER' 유지
    const mapped = shopCategoryMap[shopName];
    if (mapped) {
      categoryCode = mapped.code;
      categoryName = mapped.name;
    } else {
      // 1:1 매핑 실패 시, 일부 키워드 폴백
      if (shopName.includes('티켓')) { categoryCode = 'TICKET'; categoryName = '티켓업장'; }
      else if (shopName.includes('식당') || shopName.includes('카페') || shopName.includes('식음')) { categoryCode = 'FNB'; categoryName = '식음업장'; }
    }

    const t_act = Number(item.today_actual ?? item.actual ?? item.today_sales ?? item.salesAmount ?? item.revenue) || 0;
    const t_ly = Number(item.today_ly ?? item.ly_actual ?? item.today_last_year ?? item.lastYear) || 0;
    const m_act = Number(item.mtd_actual ?? item.mtdActual ?? item.mtd_sales) || 0;
    const m_ly = Number(item.mtd_ly ?? item.mtdLy ?? item.mtd_last_year) || 0;
    const y_act = Number(item.ytd_actual ?? item.ytdActual ?? item.ytd_sales) || 0;
    const y_ly = Number(item.ytd_ly ?? item.ytdLy ?? item.ytd_last_year) || 0;

    const key = `${categoryCode}_${shopName}`;

    if (rowMap.has(key)) {
      const existing = rowMap.get(key)!;
      existing.today.actual += t_act;
      existing.today.lastYear += t_ly;
      existing.today.growthRate = calcGrowth(existing.today.actual, existing.today.lastYear);
      
      existing.mtd.actual += m_act;
      existing.mtd.lastYear += m_ly;
      existing.mtd.growthRate = calcGrowth(existing.mtd.actual, existing.mtd.lastYear);
      
      existing.ytd.actual += y_act;
      existing.ytd.lastYear += y_ly;
      existing.ytd.growthRate = calcGrowth(existing.ytd.actual, existing.ytd.lastYear);
    } else {
      rowMap.set(key, {
        category: categoryName,
        category_code: categoryCode,
        shop_name: shopName,
        today: { actual: t_act, lastYear: t_ly, growthRate: calcGrowth(t_act, t_ly) },
        mtd: { actual: m_act, lastYear: m_ly, growthRate: calcGrowth(m_act, m_ly) },
        ytd: { actual: y_act, lastYear: y_ly, growthRate: calcGrowth(y_act, y_ly) },
        isSubtotal: false
      });
    }
  });

  return Array.from(rowMap.values()).filter(row => {
    // 제로(0) 필터링: 금일, 누계, 전년 모두 0원인 쓰레기 행은 렌더링에서 제외
    const hasToday = row.today.actual > 0 || row.today.lastYear > 0;
    const hasMtd = row.mtd.actual > 0 || row.mtd.lastYear > 0;
    const hasYtd = row.ytd.actual > 0 || row.ytd.lastYear > 0;
    return hasToday || hasMtd || hasYtd;
  });
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

  if (c.rooms && Array.isArray(c.rooms)) {
    c.rooms.forEach((r: any) => {
      const rt = r.roomType || '기타';
      if (rt === '전체' || rt === '소계' || rt === '합계') return;

      dynamicDailyCapacity += Number(r.total_capacity || 0); // Assuming total_capacity is per-room or omitted
      
      const qty = Number(r.sales_qty || r.roomsSold || 0);
      const weightedQty = qty;
      
      totalProductsSold += qty;
      hybridOccupiedRooms += weightedQty;
      
      if (rt.includes('16평')) {
        sold16 += qty;
      } else if (rt.includes('35평')) {
        sold35 += qty;
      } else if (rt.includes('51평')) {
        sold51 += qty;
      }
    });
  } else if (c.roomTypeBreakdown) {
      c.roomTypeBreakdown.forEach((rt: any) => {
        dynamicDailyCapacity += Number(rt.total_capacity || 0);
        
        const qty = Number(rt.sales_qty || rt.qty || rt.visitors || 0);
        const weightedQty = qty;
        
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
    rooms: c.rooms || [],
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: {
      reservedTeams: c.golfSummary?.reserved_teams || c.golfSummary?.reservedTeams || 0,
      visitedTeams: c.golfSummary?.visited_teams || c.golfSummary?.visitedTeams || 0,
      visitedPlayers: c.golfSummary?.visited_players || c.golfSummary?.visitedPlayers || 0,
      avgGreenFee: c.golfSummary?.avg_green_fee || c.golfSummary?.avgGreenFee || 0,
      ly_avgGreenFee: c.golfSummary?.ly_avg_green_fee || c.golfSummary?.ly_avgGreenFee || 0,
      memberAvgGreenFee: c.golfSummary?.member_avg_green_fee || c.golfSummary?.memberAvgGreenFee || 0,
      nonMemberAvgGreenFee: c.golfSummary?.non_member_avg_green_fee || c.golfSummary?.nonMemberAvgGreenFee || 0
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
      rooms_sold: c.resortSummary?.sales_qty || c.resortSummary?.rooms_sold || 0,
      golf_visited_players: c.golfSummary?.visited_players || c.golfSummary?.visitedPlayers || 0,
      golf_visited_teams: c.golfSummary?.visited_teams || c.golfSummary?.visitedTeams || 0,
      ytd_goal_pct: c.kpi?.ytd_goal_pct || 0
    },
    revenueData: { summary: summaryList, details }
  };
};

export const CHANNEL_ENUM: Record<string, string> = {
  '기업영업(휴양소)': '기업영업(휴양소)',
  '휴양소': '기업영업(휴양소)',
  '법인': '기업영업(휴양소)',
  '온라인 여행사(OTA)': '온라인 여행사(OTA)',
  '온라인 여행사(자동)': '온라인 여행사(OTA)',
  '야놀자': '온라인 여행사(OTA)',
  '여기어때': '온라인 여행사(OTA)',
  '아고다': '온라인 여행사(OTA)',
  '익스피디아': '온라인 여행사(OTA)',
  '트립닷컴': '온라인 여행사(OTA)',
  '네이버예약': '온라인 여행사(OTA)',
  '카카오메이커스': '온라인 여행사(OTA)',
  '쿠팡': '온라인 여행사(OTA)',
  '단체영업(세미나)': '단체영업(세미나)',
  'MICE': '단체영업(세미나)',
  '워크샵': '단체영업(세미나)',
  '연수': '단체영업(세미나)',
  '수학여행': '단체영업(세미나)',
  '예약실(오프라인)': '예약실(오프라인)',
  '전화': '예약실(오프라인)',
  '메신저': '예약실(오프라인)',
  '분양회원': '예약실(오프라인)',
  '임직원': '예약실(오프라인)',
  '홈페이지(다이렉트)': '홈페이지(다이렉트)',
  'APP': '홈페이지(다이렉트)',
  'WEB': '홈페이지(다이렉트)',
  '자사채널': '홈페이지(다이렉트)'
};

export const normalizeMarketType = (marketName: string) => {
  if (!marketName) return '기타';
  // Check exact match first
  if (CHANNEL_ENUM[marketName]) return CHANNEL_ENUM[marketName];
  // Fallback to substring matching for legacy payloads, but using strict enum
  for (const key of Object.keys(CHANNEL_ENUM)) {
    if (marketName.includes(key)) {
      return CHANNEL_ENUM[key];
    }
  }
  return '기타';
};

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>) => {
  if (!payload) return null;

  // Defensive parsing arrays
  const roomTypeBreakdown = Array.isArray(payload.roomTypeBreakdown) 
    ? payload.roomTypeBreakdown 
    : (Array.isArray(payload.visitorData?.roomTypeBreakdown) ? payload.visitorData.roomTypeBreakdown : []);
  
  // Bug fix: Evaluate roomMarketBreakdown FIRST before channelBreakdown which could be an empty array
  let marketBreakdown = [];
  if (payload.roomMarketBreakdown && Array.isArray(payload.roomMarketBreakdown) && payload.roomMarketBreakdown.length > 0) {
    marketBreakdown = payload.roomMarketBreakdown;
  } else if (payload.channelBreakdown && Array.isArray(payload.channelBreakdown) && payload.channelBreakdown.length > 0) {
    marketBreakdown = payload.channelBreakdown;
  } else if (payload.marketTypeBreakdown && Array.isArray(payload.marketTypeBreakdown)) {
    marketBreakdown = payload.marketTypeBreakdown;
  }

  // Fallbacks for rooms legacy array
  const roomsLegacy = Array.isArray(payload.rooms) ? payload.rooms : [];

  // 1. Calculate Room Occupancy & Sales using Defensive logic
  const roomOccupancyMap: Record<string, { sold: number; cap: number; rev: number; isVirtual?: boolean }> = {
    '16평': { sold: 0, cap: 0, rev: 0 },
    '35평': { sold: 0, cap: 0, rev: 0 },
    '51평': { sold: 0, cap: 0, rev: 0, isVirtual: true },
    '기타': { sold: 0, cap: 0, rev: 0 }
  };

  if (roomsLegacy.length > 0) {
    roomsLegacy.forEach((r: any) => {
      const name = r.roomType || '기타';
      if (name === '전체' || name === '소계' || name === '합계') return;
      const sold = Number(r.sales_qty || r.roomsSold || 0);
      const rev = Number(r.revenue || 0);
      let cap = Number(r.total_capacity || 0);

      if (name.includes('16평')) {
        cap = cap || (masterCapacities?.['16평'] ?? 0);
        roomOccupancyMap['16평'].sold += sold; roomOccupancyMap['16평'].cap += cap; roomOccupancyMap['16평'].rev += rev;
      } else if (name.includes('35평')) {
        cap = cap || (masterCapacities?.['35평'] ?? 0);
        roomOccupancyMap['35평'].sold += sold; roomOccupancyMap['35평'].cap += cap; roomOccupancyMap['35평'].rev += rev;
      } else if (name.includes('51평')) {
        cap = cap || (masterCapacities?.['51평'] ?? 0);
        roomOccupancyMap['51평'].sold += sold; roomOccupancyMap['51평'].cap += cap; roomOccupancyMap['51평'].rev += rev;
      } else {
        roomOccupancyMap['기타'].sold += sold; roomOccupancyMap['기타'].cap += cap; roomOccupancyMap['기타'].rev += rev;
      }
    });
  } else if (roomTypeBreakdown.length > 0) {
    roomTypeBreakdown.forEach((item: any) => {
      const name = item.pyType || item.facility_name || item.shop_name || '기타';
      const sold = Number(item.sales_qty || item.qty || item.rooms_sold || 0);
      const rev = Number(item.today_actual ?? item.revenue) || 0;
      let cap = Number(item.total_capacity || 0);

      if (name.includes('16평')) {
        cap = cap || (masterCapacities?.['16평'] ?? 0);
        roomOccupancyMap['16평'].sold += sold; roomOccupancyMap['16평'].cap += cap; roomOccupancyMap['16평'].rev += rev;
      } else if (name.includes('35평')) {
        cap = cap || (masterCapacities?.['35평'] ?? 0);
        roomOccupancyMap['35평'].sold += sold; roomOccupancyMap['35평'].cap += cap; roomOccupancyMap['35평'].rev += rev;
      } else if (name.includes('51평')) {
        cap = cap || (masterCapacities?.['51평'] ?? 0);
        roomOccupancyMap['51평'].sold += sold; roomOccupancyMap['51평'].cap += cap; roomOccupancyMap['51평'].rev += rev;
      } else {
        roomOccupancyMap['기타'].sold += sold; roomOccupancyMap['기타'].cap += cap; roomOccupancyMap['기타'].rev += rev;
      }
    });
  }

  // 2. Channel & Market Data (Applying SSOT and Enum mapping)
  const channelMap: Record<string, { rev: number; sold: number }> = {};
  
  if (marketBreakdown.length > 0) {
    marketBreakdown.forEach((item: any) => {
      const rawChannel = item.segment || item.channel_name || item.shop_name || '기타';
      const normalizedChannel = normalizeMarketType(rawChannel);
      const revenue = Number(item.today_actual ?? item.revenue) || 0;
      const sold = Number(item.sales_qty || item.qty || item.rooms_sold || 0);

      if (!channelMap[normalizedChannel]) channelMap[normalizedChannel] = { rev: 0, sold: 0 };
      channelMap[normalizedChannel].rev += revenue;
      channelMap[normalizedChannel].sold += sold;
    });
  }

  const channelAdrData = Object.keys(channelMap).map(k => ({
    channel: k,
    roomsSold: channelMap[k].sold,
    totalRevenue: channelMap[k].rev,
    adr: channelMap[k].sold > 0 ? Math.round(channelMap[k].rev / channelMap[k].sold) : 0
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 3. Rate Type Data
  const rateBreakdown = Array.isArray(payload.rateTypeBreakdown) ? payload.rateTypeBreakdown : [];
  const rateMap: Record<string, { rev: number; sold: number }> = {};
  
  if (roomsLegacy.length > 0) {
    roomsLegacy.forEach((r: any) => {
      const rt = r.rateType || '기타';
      if (rt === '전체' || rt === '소계' || rt === '합계') return;
      if (!rateMap[rt]) rateMap[rt] = { rev: 0, sold: 0 };
      rateMap[rt].rev += Number(r.revenue || 0);
      rateMap[rt].sold += Number(r.sales_qty || r.roomsSold || 0);
    });
  } else if (rateBreakdown.length > 0) {
    rateBreakdown.forEach((item: any) => {
      const rt = item.shop_name || '기타';
      const revenue = Number(item.today_actual ?? item.revenue) || 0;
      const sold = Number(item.sales_qty || item.qty || item.rooms_sold || 0);
      if (!rateMap[rt]) rateMap[rt] = { rev: 0, sold: 0 };
      rateMap[rt].rev += revenue;
      rateMap[rt].sold += sold;
    });
  }

  const rateAdrData = Object.keys(rateMap).map(k => ({
    rateType: k,
    roomsSold: rateMap[k].sold,
    totalRevenue: rateMap[k].rev,
    adr: rateMap[k].sold > 0 ? Math.round(rateMap[k].rev / rateMap[k].sold) : 0
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // SSOT Principle for Lodging Stats
  let summaryRevenue = 0;
  let summaryRoomsSold = 0;
  let summaryTotalCapacity = 0;
  
  const resortSummary = payload.roomSummary || payload.resortSummary;
  if (resortSummary) {
    summaryRevenue = Number(resortSummary.totalRoomRevenue ?? resortSummary.today_actual ?? resortSummary.lodging_revenue) || 0;
    summaryRoomsSold = Number(resortSummary.totalRoomsSold ?? resortSummary.sales_qty ?? resortSummary.rooms_sold) || 0;
    summaryTotalCapacity = Number(resortSummary.total_capacity) || 0;
  }

  // Fallback to local reduce if SSOT is missing or 0
  if (summaryRevenue === 0 && summaryRoomsSold === 0) {
    summaryRevenue = Object.values(roomOccupancyMap).reduce((sum, g) => sum + g.rev, 0);
    summaryRoomsSold = Object.values(roomOccupancyMap).reduce((sum, g) => sum + g.sold, 0);
  }

  const lodgingStats = {
    revenue: summaryRevenue,
    roomsSold: summaryRoomsSold,
    totalCapacity: summaryTotalCapacity,
    adr: summaryRoomsSold > 0 ? Math.round(summaryRevenue / summaryRoomsSold) : 0
  };

  return {
    success: payload.success || true,
    date: payload.date,
    ytd: { actual: payload.ytd?.actual || 0, ly_actual: payload.ytd?.ly_actual || 0 },
    today: { actual: payload.today?.actual || 0, ly_actual: payload.today?.ly_actual || 0 },
    roomOccupancyMap,
    channelAdrData,
    rateAdrData,
    lodgingStats,
    rawRooms: roomsLegacy, // Keep raw available for any edge case
    rawRoomTypeBreakdown: roomTypeBreakdown
  };
};
