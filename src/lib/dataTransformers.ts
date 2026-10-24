import type { CoreDataState } from '../contexts/CoreDataContext';

export const parseNum = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const num = Number(val.replace(/,/g, '').trim());
    return isNaN(num) ? 0 : num;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export interface TransformedHomeData {
  success: boolean;
  date: string;
  kpiMetrics: {
    totalOcc: number;
    totalADR: number;
    revPAR: number;
    trevPAR: number;
    trevPOR: number;
    days: number;
    raw: {
      totalRoomRev: number;
      totalRoomsSold: number;
      totalInventory: number;
      totalResortRevGross: number;
      totalRoomCap: number;
      totalVisitors: number;
    };
  };
  ytd: {
    actual: number;
    ly_actual: number;
    gross: number;
    ly_gross: number;
    ly_day: number;
  };
  mtd: {
    actual: number;
    ly_actual: number;
    gross: number;
    ly_gross: number;
    ly_day: number;
    roomsSold?: number;
    ly_roomsSold?: number;
    roomsGrowth?: number | null;
    roomsDiff?: number;
  };
  today: {
    actual: number;
    ly_actual: number;
    gross: number;
    ly_gross: number;
    ly_day: number;
  };
  hq_today: Array<{ hq: string; actual: number; qty: number }>;
  store_today: Array<{ shop_name: string; actual: number; qty: number }>;
  rooms: any[];
  roomTypeBreakdown: any[];
  golfSummary: {
    reservedTeams: number;
    visitedTeams: number;
    canceledTeams: number;
    pendingTeams: number;
    visitedPlayers: number;
    avgGreenFee: number;
    ly_avgGreenFee: number;
    directAvgGreenFee?: number;
    otaAvgGreenFee?: number;
    memberAvgGreenFee?: number;
    nonMemberAvgGreenFee?: number;
    memberPlayers?: number;
    nonMemberPlayers?: number;
  };
  golfFacilityBreakdown: any[];
  qa_metrics: any;
}

export const transformHomeData = (core: CoreDataState): TransformedHomeData | null => {
  if (!core.core) return null;
  const c = core.core;
  
  const hqTodayMap: Record<string, number> = {};
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    c.salesByCategory.forEach((m: any) => {
      const cat = m.categoryCode || '기타업장';
      hqTodayMap[cat] = parseNum(m.totalSales || 0);
    });
  }
  
  const hqToday = Object.keys(hqTodayMap).map(key => ({
    hq: key,
    actual: hqTodayMap[key],
    qty: 0
  })).filter(h => h.actual > 0);

  const storeToday: { shop_name: string; actual: number; qty: number }[] = [];
  if (c.salesByFacility && Array.isArray(c.salesByFacility)) {
    c.salesByFacility.forEach((m: any) => {
      storeToday.push({
        shop_name: m.shopName || m.facilityName || '알수없음',
        actual: parseNum(m.totalSales || 0),
        qty: parseNum(m.visitors || m.totalVisitors || 0)
      });
    });
  }

  let totalRoomRev = 0;
  if (c.salesByCategory && Array.isArray(c.salesByCategory)) {
    const roomCat = c.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) totalRoomRev = parseNum(roomCat.totalSales || roomCat.todayActual || 0);
  }
  
  const totalResortRevGross = parseNum(c.summary?.totalRevenue || 0);
  const totalRoomsSold = parseNum(c.summary?.totalRooms || 0);
  const totalVisitors = parseNum(c.summary?.totalVisitors || 0);
  
  const isRange = Boolean(c.isRangeQuery || (c.startDate && c.endDate && c.startDate !== c.endDate));
  const safeDays = isRange ? Math.max(1, c.resortSummary?.days || c.days || (Array.isArray(c.dailyTrends) ? c.dailyTrends.length : 1)) : 1;
  // [SSOT Pure Consumer] 백엔드가 내려준 완성된 가용 객실 총수 우선 수용
  const physicalRoomInventory = parseNum(c.summary?.availableRooms || c.summary?.totalPhysicalKeys || 0);
  // [Pax Decoupling] 투숙객 인원 정원 SSOT
  const totalGuestCapacity = parseNum(c.summary?.totalRoomCap || 0);

  // [SSOT 무관용 원칙] 백엔드가 사전 산출한 ADR, RevPAR, TrevPAR 우선 바인딩
  const backendADR = parseNum(c.summary?.totalADR || c.summary?.adr || 0);
  const backendRevPAR = parseNum(c.summary?.revPAR || 0);
  const backendTrevPAR = parseNum(c.summary?.trevPar ?? c.summary?.trevPAR ?? 0);
  const backendTrevPOR = parseNum(c.summary?.trevPOR || 0);
  const backendOcc = parseNum(c.summary?.totalOcc || c.summary?.occRate || 0);

  // [SSOT 무결성 원칙 완벽 준수 (Zero-Proxy)] 
  // 백엔드가 데이터를 안 줬다고 프론트엔드가 자체 연산으로 가짜 숫자(Mocking)를 만들어내는 행위 영구 금지
  const kpiMetrics = {
    totalOcc: backendOcc,
    totalADR: backendADR,
    revPAR: backendRevPAR,
    trevPAR: backendTrevPAR,
    trevPOR: backendTrevPOR,
    days: safeDays,
    raw: {
      totalRoomRev,
      totalRoomsSold,
      totalInventory: physicalRoomInventory,
      totalResortRevGross,
      totalRoomCap: physicalRoomInventory,
      totalGuestCapacity: totalGuestCapacity,
      totalVisitors
    }
  };

  const actualRev = parseNum(c.summary?.totalRevenue || 0);
  const lyRev = parseNum(c.summary?.todayLyRevenue || 0);
  const ytdRev = parseNum(c.summary?.ytdActual || c.summary?.ytdRevenue || 0);
  const ytdLyRev = parseNum(c.summary?.ytdLy || 0);
  const mtdRev = parseNum(c.summary?.mtdRevenue || c.summary?.mtdActual || 0);
  const mtdLyRev = parseNum(c.summary?.mtdLy || 0);

  const roomSub = (c.gridData && Array.isArray(c.gridData))
    ? c.gridData.find((r: any) => r.isSubtotal && r.categoryCode === 'ROOM')
    : null;
  const roomCat = (c.salesByCategory && Array.isArray(c.salesByCategory))
    ? c.salesByCategory.find((x: any) => x.categoryCode === 'ROOM')
    : null;

  const mtdRoomsSold = parseNum(c.summary?.mtdRooms || roomSub?.mtdVisitors || roomCat?.mtdVisitors || roomSub?.mtdRooms || 0);
  const lyMtdRoomsSold = parseNum(c.summary?.mtdRoomsLy || c.summary?.lyMtdRooms || roomSub?.mtdLyVisitors || roomCat?.mtdLyVisitors || roomSub?.lyMtdVisitors || 0);
  const mtdRoomsDiff = c.summary?.mtdRoomsDiff !== undefined ? parseNum(c.summary.mtdRoomsDiff) : (roomSub?.mtdRoomsDiff !== undefined ? parseNum(roomSub.mtdRoomsDiff) : undefined);
  const mtdRoomsGrowth = c.summary?.mtdRoomsGrowth ?? roomSub?.growthRate ?? null;

  return {
    success: true,
    date: c.date || '',
    kpiMetrics,
    ytd: { 
      actual: ytdRev, 
      ly_actual: ytdLyRev,
      gross: ytdRev,
      ly_gross: ytdLyRev,
      ly_day: ytdLyRev
    },
    mtd: {
      actual: mtdRev,
      ly_actual: mtdLyRev,
      gross: mtdRev,
      ly_gross: mtdLyRev,
      ly_day: mtdLyRev,
      roomsSold: mtdRoomsSold,
      ly_roomsSold: lyMtdRoomsSold,
      roomsGrowth: mtdRoomsGrowth,
      roomsDiff: mtdRoomsDiff
    },
    today: { 
      actual: actualRev, 
      ly_actual: lyRev,
      gross: actualRev,
      ly_gross: lyRev,
      ly_day: lyRev
    },
    hq_today: hqToday,
    store_today: storeToday,
    rooms: c.rooms || [],
    roomTypeBreakdown: c.roomTypeBreakdown || [],
    golfSummary: (() => {
      const visited = parseNum(c.summary?.totalGolfTeams || 0);
      const canceled = parseNum(c.summary?.totalGolfCanceledTeams || 0);
      const reserved = parseNum(c.summary?.totalGolfReservedTeams || 0);
      const visitedPlayers = parseNum(c.summary?.totalGolfVisitors || 0);
      
      return {
        reservedTeams: reserved,
        visitedTeams: visited,
        canceledTeams: canceled,
        pendingTeams: parseNum(c.summary?.totalGolfPendingTeams || 0),
        visitedPlayers: visitedPlayers,
        avgGreenFee: parseNum(c.summary?.golfAvgGreenFee || 0),
        ly_avgGreenFee: 0,
        directAvgGreenFee: parseNum(c.summary?.golfDirectAvgGreenFee || 0),
        otaAvgGreenFee: parseNum(c.summary?.golfOtaAvgGreenFee || 0),
        memberAvgGreenFee: parseNum(c.summary?.golfMemberAvgGreenFee || 0),
        nonMemberAvgGreenFee: parseNum(c.summary?.golfNonMemberAvgGreenFee || 0),
        memberPlayers: parseNum(c.summary?.golfMemberPlayers || 0),
        nonMemberPlayers: parseNum(c.summary?.golfNonMemberPlayers || 0),
      };
    })(),
    golfFacilityBreakdown: c.golfFacilityBreakdown || [],
    qa_metrics: c.qaMetrics || null
  };
};

export interface TransformedResortData {
  success: boolean;
  date?: string;
  ytd: { actual: number; lyActual: number };
  today: { actual: number; lyActual: number };
  roomSummaryByType?: any[];
  roomOccupancyMap: Record<string, {
    sold: number;
    cap: number;
    rev: number;
    adr?: number;
    occupancyRate?: number;
    fixedCapacity?: number;
    dynamicCapacity?: number;
    dynamicOccupancyRate?: number;
    isVirtual?: boolean;
    lySold?: number | null;
    lyCap?: number | null;
    lyRev?: number | null;
    lyAdr?: number | null;
    lyRate?: number | null;
    rateDiff?: number | null;
    soldDiff?: number | null;
    revenueDiff?: number | null;
    adrDiff?: number | null;
    revGrowth?: number | null;
  }>;
  channelAdrData: Array<{
    channel: string;
    roomsSold: number;
    totalRevenue: number;
    adr: number;
    lySold?: number | null;
    lyRev?: number | null;
    lyAdr?: number | null;
    soldDiff?: number | null;
    revDiff?: number | null;
    revGrowth?: number | null;
    adrDiff?: number | null;
  }>;
  marketTypeAdrData: Array<{
    marketType: string;
    roomsSold: number;
    totalRevenue: number;
    adr: number;
    lySold?: number | null;
    lyRev?: number | null;
    lyAdr?: number | null;
    soldDiff?: number | null;
    revDiff?: number | null;
    revGrowth?: number | null;
    adrDiff?: number | null;
  }>;
  rateAdrData: Array<{
    marketType: string;
    roomsSold: number;
    totalRevenue: number;
    adr: number;
    lySold?: number | null;
    lyRev?: number | null;
    lyAdr?: number | null;
    soldDiff?: number | null;
    revDiff?: number | null;
    revGrowth?: number | null;
    adrDiff?: number | null;
  }>;
  summary?: any;
  lodgingStats: {
    revenue: number;
    lyRevenue?: number;
    revenueDiff?: number | null;
    revenueGrowth?: number;
    roomsSold: number;
    lyRoomsSold?: number;
    roomsDiff?: number | null;
    roomsGrowth?: number;
    totalCapacity: number;
    totalRoomInventory?: number;
    totalGuestCapacity?: number;
    guestCapacity?: number;
    adr: number;
    lyAdr?: number | null;
    adrDiff?: number | null;
    adrGrowth?: number | null;
    physicalOccRate?: number;
    lyPhysicalOccRate?: number | null;
    physicalOccDiff?: number | null;
    standardOccRate?: number;
    connectingOccRate?: number;
    remainingOccRate?: number;
    weekdayRevenue?: number;
    lyWeekdayRevenue?: number;
    weekdayRevenueDiff?: number | null;
    weekdayRevenueGrowth?: number | null;
    weekendRevenue?: number;
    lyWeekendRevenue?: number;
    weekendRevenueDiff?: number | null;
    weekendRevenueGrowth?: number | null;
    weekdayRoomsSold?: number;
    lyWeekdayRoomsSold?: number;
    weekdayRoomsDiff?: number | null;
    weekdayRoomsGrowth?: number | null;
    weekendRoomsSold?: number;
    lyWeekendRoomsSold?: number;
    weekendRoomsDiff?: number | null;
    weekendRoomsGrowth?: number | null;
    weekdayAdr?: number;
    lyWeekdayAdr?: number;
    weekdayAdrDiff?: number | null;
    weekdayAdrGrowth?: number | null;
    weekendAdr?: number;
    lyWeekendAdr?: number;
    weekendAdrDiff?: number | null;
    weekendAdrGrowth?: number | null;
    weekdayOcc?: number;
    weekendOcc?: number;
  };
}

export const transformResortData = (payload: any, masterCapacities?: Record<string, number>): TransformedResortData | null => {
  if (!payload) return null;

  const roomOccupancyMap: TransformedResortData['roomOccupancyMap'] = {};
  if (masterCapacities && Object.keys(masterCapacities).length > 0) {
    Object.entries(masterCapacities).forEach(([k, v]) => {
      roomOccupancyMap[k] = { sold: 0, cap: parseNum(v), rev: 0 };
    });
  }

  // 🚨 [Pure Consumer / Fail-Stop] 백엔드가 정제해주는 roomSummaryByType 의 값만을 1:1 매핑
  if (payload.roomSummaryByType && Array.isArray(payload.roomSummaryByType) && payload.roomSummaryByType.length > 0) {
    payload.roomSummaryByType.forEach((item: any) => {
      const typeName = item.roomType || '미분류';
      const sold = parseNum(item.roomsSold || 0);
      const rev = parseNum(item.totalSales || item.revenue || 0);
      const fixedCap = parseNum(item.fixedCapacity || item.capacity || item.totalRooms || 0);
      const cap = fixedCap > 0 ? fixedCap : (roomOccupancyMap[typeName]?.cap ?? 0);
      const occupancyRate = item.fixedOccupancyRate !== undefined && item.fixedOccupancyRate !== null ? parseNum(item.fixedOccupancyRate) : (item.rate !== undefined && item.rate !== null ? parseNum(item.rate) : undefined);
      const dynamicCapacity = parseNum(item.dynamicCapacity || item.capacity || 0);
      const dynamicOccupancyRate = parseNum(item.dynamicOccupancyRate ?? item.rate ?? 0);
      const adr = item.adr !== undefined && item.adr !== null ? parseNum(item.adr) : undefined;

      roomOccupancyMap[typeName] = {
        sold,
        rev,
        cap,
        adr,
        occupancyRate,
        fixedCapacity: cap,
        dynamicCapacity,
        dynamicOccupancyRate,
        lySold: item.lyRoomsSold !== undefined && item.lyRoomsSold !== null ? parseNum(item.lyRoomsSold) : null,
        lyCap: item.lyFixedCapacity !== undefined && item.lyFixedCapacity !== null ? parseNum(item.lyFixedCapacity) : null,
        lyRev: item.lyRevenue !== undefined && item.lyRevenue !== null ? parseNum(item.lyRevenue) : null,
        lyAdr: item.lyAdr !== undefined && item.lyAdr !== null ? parseNum(item.lyAdr) : null,
        lyRate: item.lyFixedOccupancyRate !== undefined && item.lyFixedOccupancyRate !== null ? parseNum(item.lyFixedOccupancyRate) : (item.lyRate !== undefined && item.lyRate !== null ? parseNum(item.lyRate) : null),
        rateDiff: item.rateDiff !== undefined && item.rateDiff !== null ? Number(item.rateDiff) : null,
        soldDiff: item.soldDiff !== undefined && item.soldDiff !== null ? parseNum(item.soldDiff) : null,
        revenueDiff: item.revenueDiff !== undefined && item.revenueDiff !== null ? parseNum(item.revenueDiff) : null,
        adrDiff: item.adrDiff !== undefined && item.adrDiff !== null ? parseNum(item.adrDiff) : null,
        revGrowth: item.revGrowth !== undefined && item.revGrowth !== null ? Number(item.revGrowth) : null,
      };
    });
  }

  const channelAdrData: TransformedResortData['channelAdrData'] = [];
  if (payload.salesByChannel && Array.isArray(payload.salesByChannel)) {
    const channelSubtotals = payload.salesByChannel.filter((item: any) => item.isChannelSubtotal);
    const sourceRows = channelSubtotals.length > 0 
      ? channelSubtotals 
      : payload.salesByChannel.filter((item: any) => !item.isGrandTotal && !item.isSegmentSubtotal);

    sourceRows.forEach((item: any) => {
      const sold = parseNum(item.rangeRooms ?? item.todayRooms ?? item.roomsSold ?? item.rooms ?? 0);
      const rev = parseNum(item.rangeRevenue ?? item.todayRevenue ?? item.totalSales ?? item.revenue ?? 0);
      const adr = parseNum(item.rangeAdr ?? item.todayAdr ?? item.adr ?? 0);
      const channelName = item.channelName || item.channel || '기타';
      
      if (sold > 0 || rev > 0) {
        channelAdrData.push({
          channel: channelName,
          roomsSold: sold,
          totalRevenue: rev,
          adr: adr,
          lySold: item.lyRoomsSold !== undefined ? parseNum(item.lyRoomsSold) : (item.todayLyRooms !== undefined ? parseNum(item.todayLyRooms) : null),
          lyRev: item.lyTotalRevenue !== undefined ? parseNum(item.lyTotalRevenue) : (item.todayLyRevenue !== undefined ? parseNum(item.todayLyRevenue) : null),
          lyAdr: item.lyAdr !== undefined ? parseNum(item.lyAdr) : null,
          soldDiff: item.soldDiff !== undefined && item.soldDiff !== null ? parseNum(item.soldDiff) : null,
          revDiff: item.revDiff !== undefined && item.revDiff !== null ? parseNum(item.revDiff) : null,
          revGrowth: item.revGrowth ?? item.revenueGrowth ?? null,
          adrDiff: item.adrDiff !== undefined && item.adrDiff !== null ? parseNum(item.adrDiff) : null,
        });
      }
    });
  }

  const marketTypeAdrData: TransformedResortData['marketTypeAdrData'] = [];
  if (payload.salesBySegment && Array.isArray(payload.salesBySegment)) {
    const segmentSubtotals = payload.salesBySegment.filter((item: any) => item.isSegmentSubtotal);
    const sourceRows = segmentSubtotals.length > 0
      ? segmentSubtotals
      : payload.salesBySegment.filter((item: any) => !item.isGrandTotal && !item.isChannelSubtotal);

    sourceRows.forEach((item: any) => {
      const sold = parseNum(item.rangeRooms ?? item.todayRooms ?? item.roomsSold ?? item.rooms ?? 0);
      const rev = parseNum(item.rangeRevenue ?? item.todayRevenue ?? item.totalSales ?? item.revenue ?? 0);
      const adr = parseNum(item.rangeAdr ?? item.todayAdr ?? item.adr ?? 0);
      const marketName = item.rateName || item.segmentName || item.marketType || '기타';

      if (sold > 0 || rev > 0) {
        marketTypeAdrData.push({
          marketType: marketName,
          roomsSold: sold,
          totalRevenue: rev,
          adr: adr,
          lySold: item.lyRoomsSold !== undefined ? parseNum(item.lyRoomsSold) : (item.todayLyRooms !== undefined ? parseNum(item.todayLyRooms) : null),
          lyRev: item.lyTotalRevenue !== undefined ? parseNum(item.lyTotalRevenue) : (item.todayLyRevenue !== undefined ? parseNum(item.todayLyRevenue) : null),
          lyAdr: item.lyAdr !== undefined ? parseNum(item.lyAdr) : null,
          soldDiff: item.soldDiff !== undefined && item.soldDiff !== null ? parseNum(item.soldDiff) : null,
          revDiff: item.revDiff !== undefined && item.revDiff !== null ? parseNum(item.revDiff) : null,
          revGrowth: item.revGrowth ?? item.revenueGrowth ?? null,
          adrDiff: item.adrDiff !== undefined && item.adrDiff !== null ? parseNum(item.adrDiff) : null,
        });
      }
    });
  }

  let summaryRevenue = 0;
  // 1. matrix-weekly 객실 소계 우선 참조 (SSOT)
  if (payload.matrix && Array.isArray(payload.matrix)) {
    const roomSub = payload.matrix.find((r: any) => r.isSubtotal && r.categoryCode === 'ROOM');
    if (roomSub) summaryRevenue = parseNum(roomSub.todayActual || roomSub.rangeActual || roomSub.ytdActual || 0);
  }
  // 2. salesByCategory fallback
  if (!summaryRevenue && payload.salesByCategory && Array.isArray(payload.salesByCategory)) {
    const roomCat = payload.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) summaryRevenue = parseNum(roomCat.totalSales || roomCat.todayActual || 0);
  }
  // 3. channel grand total fallback
  if (!summaryRevenue && payload.salesByChannel && Array.isArray(payload.salesByChannel)) {
    const chGrand = payload.salesByChannel.find((x: any) => x.isGrandTotal);
    if (chGrand) summaryRevenue = parseNum(chGrand.ytdRevenue || chGrand.todayRevenue || chGrand.mtdRevenue || 0);
  }
  
  const ls = payload.lodgingStats || {};

  const summaryRoomsSold = parseNum(ls.roomsSold || payload.summary?.totalRooms || 0);
  const physicalRoomCap = parseNum(ls.totalCapacity || payload.summary?.availableRooms || payload.summary?.totalPhysicalKeys || 0);
  const guestCap = parseNum(payload.summary?.totalRoomCap || 0);

  let lyRevenue = 0;
  let lyRoomsSold = 0;
  let revenueGrowth = 0;

  if (payload.salesByCategory && Array.isArray(payload.salesByCategory)) {
    const roomCat = payload.salesByCategory.find((x: any) => x.categoryCode === 'ROOM');
    if (roomCat) {
      lyRevenue = parseNum(roomCat.todayLy || 0);
      lyRoomsSold = parseNum(roomCat.todayLyVisitors || roomCat.lyVisitors || 0);
      revenueGrowth = parseNum(roomCat.todayGrowth || roomCat.growthRate || 0);
    }
  }

  const connectingFromMap = roomOccupancyMap['51평']?.sold || 0;
  const connectingPhysicalRooms = parseNum(payload.summary?.connectingPhysicalRooms || ls.connectingPhysicalRooms || connectingFromMap);
  const standardPhysicalRooms = parseNum(payload.summary?.standardPhysicalRooms || ls.standardPhysicalRooms || 0);
  const totalPhysicalKeysSold = parseNum(payload.summary?.totalPhysicalKeysSold || ls.totalPhysicalKeysSold || 0);

  const lodgingStats: TransformedResortData['lodgingStats'] = {
    revenue: parseNum(ls.revenue || summaryRevenue || payload.summary?.totalRoomRev || 0),
    lyRevenue: ls.lyRevenue !== undefined ? parseNum(ls.lyRevenue) : lyRevenue,
    revenueDiff: ls.revenueDiff !== undefined && ls.revenueDiff !== null ? parseNum(ls.revenueDiff) : null,
    revenueGrowth: ls.revenueGrowth !== undefined ? parseNum(ls.revenueGrowth) : revenueGrowth,
    roomsSold: summaryRoomsSold,
    lyRoomsSold: ls.lyRoomsSold !== undefined ? parseNum(ls.lyRoomsSold) : lyRoomsSold,
    roomsDiff: ls.roomsDiff !== undefined && ls.roomsDiff !== null ? parseNum(ls.roomsDiff) : null,
    roomsGrowth: ls.roomsGrowth !== undefined ? parseNum(ls.roomsGrowth) : undefined,
    totalRoomInventory: physicalRoomCap,
    totalCapacity: physicalRoomCap,
    totalGuestCapacity: guestCap,
    guestCapacity: guestCap,
    adr: parseNum(ls.adr ?? payload.summary?.totalADR ?? payload.summary?.adr ?? payload.summary?.ADR ?? 0),
    lyAdr: ls.lyAdr !== undefined && ls.lyAdr !== null ? parseNum(ls.lyAdr) : null,
    adrDiff: ls.adrDiff !== undefined && ls.adrDiff !== null ? parseNum(ls.adrDiff) : null,
    adrGrowth: ls.adrGrowth !== undefined && ls.adrGrowth !== null ? Number(ls.adrGrowth) : null,
    physicalOccRate: ls.physicalOccRate !== undefined ? parseNum(ls.physicalOccRate) : undefined,
    lyPhysicalOccRate: ls.lyPhysicalOccRate !== undefined && ls.lyPhysicalOccRate !== null ? parseNum(ls.lyPhysicalOccRate) : null,
    physicalOccDiff: ls.physicalOccDiff !== undefined && ls.physicalOccDiff !== null ? Number(ls.physicalOccDiff) : null,
    standardOccRate: ls.standardOccRate !== undefined ? parseNum(ls.standardOccRate) : undefined,
    connectingOccRate: ls.connectingOccRate !== undefined ? parseNum(ls.connectingOccRate) : undefined,
    remainingOccRate: ls.remainingOccRate !== undefined ? parseNum(ls.remainingOccRate) : undefined,
    weekdayRevenue: ls.weekdayRevenue !== undefined ? parseNum(ls.weekdayRevenue) : (payload.summary?.weekdayRoomRev !== undefined ? parseNum(payload.summary.weekdayRoomRev) : undefined),
    lyWeekdayRevenue: ls.lyWeekdayRevenue !== undefined ? parseNum(ls.lyWeekdayRevenue) : undefined,
    weekdayRevenueDiff: ls.weekdayRevenueDiff !== undefined && ls.weekdayRevenueDiff !== null ? parseNum(ls.weekdayRevenueDiff) : null,
    weekdayRevenueGrowth: ls.weekdayRevenueGrowth !== undefined && ls.weekdayRevenueGrowth !== null ? Number(ls.weekdayRevenueGrowth) : null,
    weekendRevenue: ls.weekendRevenue !== undefined ? parseNum(ls.weekendRevenue) : (payload.summary?.weekendRoomRev !== undefined ? parseNum(payload.summary.weekendRoomRev) : undefined),
    lyWeekendRevenue: ls.lyWeekendRevenue !== undefined ? parseNum(ls.lyWeekendRevenue) : undefined,
    weekendRevenueDiff: ls.weekendRevenueDiff !== undefined && ls.weekendRevenueDiff !== null ? parseNum(ls.weekendRevenueDiff) : null,
    weekendRevenueGrowth: ls.weekendRevenueGrowth !== undefined && ls.weekendRevenueGrowth !== null ? Number(ls.weekendRevenueGrowth) : null,
    weekdayRoomsSold: ls.weekdayRoomsSold !== undefined ? parseNum(ls.weekdayRoomsSold) : (payload.summary?.weekdayRoomsCount !== undefined ? parseNum(payload.summary.weekdayRoomsCount) : undefined),
    lyWeekdayRoomsSold: ls.lyWeekdayRoomsSold !== undefined ? parseNum(ls.lyWeekdayRoomsSold) : undefined,
    weekdayRoomsDiff: ls.weekdayRoomsDiff !== undefined && ls.weekdayRoomsDiff !== null ? parseNum(ls.weekdayRoomsDiff) : null,
    weekdayRoomsGrowth: ls.weekdayRoomsGrowth !== undefined && ls.weekdayRoomsGrowth !== null ? Number(ls.weekdayRoomsGrowth) : null,
    weekendRoomsSold: ls.weekendRoomsSold !== undefined ? parseNum(ls.weekendRoomsSold) : (payload.summary?.weekendRoomsCount !== undefined ? parseNum(payload.summary.weekendRoomsCount) : undefined),
    lyWeekendRoomsSold: ls.lyWeekendRoomsSold !== undefined ? parseNum(ls.lyWeekendRoomsSold) : undefined,
    weekendRoomsDiff: ls.weekendRoomsDiff !== undefined && ls.weekendRoomsDiff !== null ? parseNum(ls.weekendRoomsDiff) : null,
    weekendRoomsGrowth: ls.weekendRoomsGrowth !== undefined && ls.weekendRoomsGrowth !== null ? Number(ls.weekendRoomsGrowth) : null,
    weekdayAdr: ls.weekdayAdr !== undefined ? parseNum(ls.weekdayAdr) : (payload.summary?.weekdayADR !== undefined ? parseNum(payload.summary.weekdayADR) : undefined),
    lyWeekdayAdr: ls.lyWeekdayAdr !== undefined ? parseNum(ls.lyWeekdayAdr) : undefined,
    weekdayAdrDiff: ls.weekdayAdrDiff !== undefined && ls.weekdayAdrDiff !== null ? parseNum(ls.weekdayAdrDiff) : null,
    weekdayAdrGrowth: ls.weekdayAdrGrowth !== undefined && ls.weekdayAdrGrowth !== null ? Number(ls.weekdayAdrGrowth) : null,
    weekendAdr: ls.weekendAdr !== undefined ? parseNum(ls.weekendAdr) : (payload.summary?.weekendADR !== undefined ? parseNum(payload.summary.weekendADR) : undefined),
    lyWeekendAdr: ls.lyWeekendAdr !== undefined ? parseNum(ls.lyWeekendAdr) : undefined,
    weekendAdrDiff: ls.weekendAdrDiff !== undefined && ls.weekendAdrDiff !== null ? parseNum(ls.weekendAdrDiff) : null,
    weekendAdrGrowth: ls.weekendAdrGrowth !== undefined && ls.weekendAdrGrowth !== null ? Number(ls.weekendAdrGrowth) : null,
    weekdayOcc: ls.weekdayOcc !== undefined ? parseNum(ls.weekdayOcc) : (payload.summary?.weekdayOcc !== undefined ? parseNum(payload.summary.weekdayOcc) : undefined),
    weekendOcc: ls.weekendOcc !== undefined ? parseNum(ls.weekendOcc) : (payload.summary?.weekendOcc !== undefined ? parseNum(payload.summary.weekendOcc) : undefined)
  };

  return {
    success: payload.success || true,
    date: payload.date,
    ytd: { actual: payload.ytd?.actual || 0, lyActual: payload.ytd?.lyActual || 0 },
    today: { actual: payload.today?.actual || 0, lyActual: payload.today?.lyActual || 0 },
    summary: {
      ...payload.summary,
      connectingPhysicalRooms,
      standardPhysicalRooms,
      totalPhysicalKeysSold,
      totalPhysicalKeys: physicalRoomCap,
      totalRoomInventory: physicalRoomCap
    },
    roomSummaryByType: Array.isArray(payload.roomSummaryByType) ? payload.roomSummaryByType : [],
    roomOccupancyMap,
    channelAdrData,
    marketTypeAdrData,
    rateAdrData: marketTypeAdrData,
    lodgingStats
  };
};
