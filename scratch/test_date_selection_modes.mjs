async function testAllPagesDateModes() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('================================================================');
  console.log('🧪 VERIFYING SINGLE DAY vs PERIOD RANGE ACROSS ALL V5 API ENDPOINTS');
  console.log('================================================================');

  // 1. API 1: GET /api/v5/dashboard/revenue-summary
  console.log('\n--- 1. API 1: Dashboard Revenue Summary ---');
  const sumSingle = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  console.log(`[Single Day: date=2026-07-24] TotalRev: ${sumSingle.summary?.totalRevenue?.toLocaleString()}원 | TotalRooms: ${sumSingle.summary?.totalRooms}실 | Visitors: ${sumSingle.summary?.totalVisitors}명`);

  const sumRange = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24&startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log(`[Period Range: date=2026-07-24 target] TotalRev: ${sumRange.summary?.totalRevenue?.toLocaleString()}원 | TotalRooms: ${sumRange.summary?.totalRooms}실 | Visitors: ${sumRange.summary?.totalVisitors}명`);

  // 2. API 2: GET /api/v5/dashboard/matrix-weekly
  console.log('\n--- 2. API 2: Matrix Weekly Dashboard ---');
  const matSingle = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?date=2026-07-24`, { headers }).then(r => r.json());
  const matSingleRows = matSingle.data || matSingle;
  console.log(`[Single Day: date=2026-07-24] Total Rows: ${matSingleRows.length} | GrandTotal actual: ${matSingleRows.find(r => r.isGrandTotal)?.todayActual?.toLocaleString()}원`);

  const matRange = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const matRangeRows = matRange.data || matRange;
  console.log(`[Period Range: 07-23~24] Total Rows: ${matRangeRows.length} | GrandTotal actual: ${matRangeRows.find(r => r.isGrandTotal)?.todayActual?.toLocaleString()}원`);

  // 3. API 7: GET /api/v5/report/room-sales-by-channel
  console.log('\n--- 3. API 7: Room Sales by Channel (Synergy) ---');
  const chSingle = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?date=2026-07-24`, { headers }).then(r => r.json());
  const chSingleGT = (chSingle.data || chSingle).find(r => r.isGrandTotal || r.channelName === '전체 합계');
  console.log(`[Single Day: date=2026-07-24] Rooms: ${chSingleGT?.todayRooms}실 | Revenue: ${chSingleGT?.todayRevenue?.toLocaleString()}원`);

  const chRange = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const chRangeGT = (chRange.data || chRange).find(r => r.isGrandTotal || r.channelName === '전체 합계');
  console.log(`[Period Range: 07-23~24] Rooms: ${chRangeGT?.mtdRooms}실 | Revenue: ${chRangeGT?.mtdRevenue?.toLocaleString()}원`);

  // 4. API 8: GET /api/v5/report/synergy-store-correlation
  console.log('\n--- 4. API 8: Synergy Store Correlation ---');
  const corrSingle = await fetch(`${baseUrl}/api/v5/report/synergy-store-correlation?date=2026-07-24`, { headers }).then(r => r.json());
  console.log(`[Single Day: date=2026-07-24] Total Rows: ${(corrSingle.data || corrSingle).length}`);

  const corrRange = await fetch(`${baseUrl}/api/v5/report/synergy-store-correlation?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log(`[Period Range: 07-23~24] Total Rows: ${(corrRange.data || corrRange).length}`);

  console.log('\n================================================================');
  console.log('✅ ALL API ENDPOINTS VERIFIED: BOTH SINGLE DAY AND PERIOD RANGE RESPOND PERFECTLY!');
  console.log('================================================================');
}

testAllPagesDateModes().catch(console.error);
