async function testBackendLiveUpdate() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('Response Keys:', Object.keys(data));
  console.log('isRangeQuery:', data.isRangeQuery);
  console.log('Summary:', data.summary);
  console.log('salesByCategory sample:', Array.isArray(data.salesByCategory) ? data.salesByCategory.slice(0, 3) : typeof data.salesByCategory);
  console.log('roomSummaryByType sample:', Array.isArray(data.roomSummaryByType) ? data.roomSummaryByType.slice(0, 3) : typeof data.roomSummaryByType);
}

testBackendLiveUpdate().catch(console.error);
