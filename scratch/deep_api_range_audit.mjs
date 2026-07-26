async function auditAllApisRange() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('================================================================');
  console.log('🔬 DEEP V5 BACKEND API PERIOD RANGE BEHAVIOR AUDIT');
  console.log('================================================================');

  // Test 1: revenue-summary with startDate and endDate
  console.log('\n--- 1. revenue-summary with startDate=2026-07-01&endDate=2026-07-26 ---');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data1 = res1.data || res1;
  console.log('Data Type:', Array.isArray(data1) ? 'Array' : typeof data1);
  console.log('Data keys/length:', Array.isArray(data1) ? `Array of ${data1.length} elements` : Object.keys(data1));
  if (Array.isArray(data1) && data1.length > 0) {
    console.log('First element sample keys:', Object.keys(data1[0]));
    console.log('First element sample date:', data1[0].date, 'Revenue:', data1[0].summary?.totalRevenue || data1[0].totalRevenue || data1[0].todayActual);
  }

  // Test 2: matrix-weekly with startDate and endDate
  console.log('\n--- 2. matrix-weekly with startDate=2026-07-01&endDate=2026-07-26 ---');
  const res2 = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data2 = res2.data || res2;
  console.log('Data Type:', Array.isArray(data2) ? 'Array' : typeof data2);
  if (Array.isArray(data2)) {
    const gt = data2.find(r => r.isGrandTotal);
    console.log('Grand Total row:', gt ? { todayActual: gt.todayActual, todayLy: gt.todayLy, categoryName: gt.categoryName } : 'None');
  }

  // Test 3: room-sales-by-channel with startDate and endDate
  console.log('\n--- 3. room-sales-by-channel with startDate=2026-07-01&endDate=2026-07-26 ---');
  const res3 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data3 = res3.data || res3;
  console.log('Data Type:', Array.isArray(data3) ? 'Array' : typeof data3);
  if (Array.isArray(data3)) {
    const gt = data3.find(r => r.isGrandTotal || r.channelName === '전체 합계');
    console.log('Grand Total row:', gt ? { mtdRooms: gt.mtdRooms, mtdRevenue: gt.mtdRevenue } : 'None');
  }

  // Test 4: daily-sales report with startDate and endDate
  console.log('\n--- 4. daily-sales report with startDate=2026-07-01&endDate=2026-07-26 ---');
  const res4 = await fetch(`${baseUrl}/api/v5/report/daily-sales?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data4 = res4.data || res4;
  console.log('Data Type:', Array.isArray(data4) ? 'Array' : typeof data4);
  console.log('Sample keys:', typeof data4 === 'object' ? Object.keys(data4) : 'Array');

  console.log('\n================================================================');
}

auditAllApisRange().catch(console.error);
