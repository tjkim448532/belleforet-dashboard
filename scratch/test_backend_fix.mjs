async function testBackendFix() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary with cache buster...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('roomSummaryByType length:', data.roomSummaryByType?.length);
  console.log('roomSummaryByType content:', data.roomSummaryByType);
}

testBackendFix().catch(console.error);
