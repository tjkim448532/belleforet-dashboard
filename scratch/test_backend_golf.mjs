async function testBackendGolf() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary with cache buster...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('Summary keys:', Object.keys(data.summary || {}));
  console.log('totalGolfTeams:', data.summary?.totalGolfTeams);
  console.log('totalGolfReservedTeams:', data.summary?.totalGolfReservedTeams);
  console.log('totalGolfCanceledTeams:', data.summary?.totalGolfCanceledTeams);
}

testBackendGolf().catch(console.error);
