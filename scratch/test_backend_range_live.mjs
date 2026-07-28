async function testBackendRangeLive() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary for range 2026-07-20 ~ 2026-07-27 with cache buster...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-20&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  console.log('Range Summary:', data.summary);
  console.log('Range totalGolfTeams:', data.summary?.totalGolfTeams);
  console.log('Range totalGolfReservedTeams:', data.summary?.totalGolfReservedTeams);
  console.log('Range totalGolfCanceledTeams:', data.summary?.totalGolfCanceledTeams);
}

testBackendRangeLive().catch(console.error);
