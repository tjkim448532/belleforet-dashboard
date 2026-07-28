async function testBackendGolfHotfix() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary for single day 2026-07-24...');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data1 = res1.data || res1;
  console.log('Single Day Summary:', data1.summary);
  console.log('Single Day totalGolfTeams:', data1.summary?.totalGolfTeams);
  console.log('Single Day totalGolfReservedTeams:', data1.summary?.totalGolfReservedTeams);
  console.log('Single Day totalGolfCanceledTeams:', data1.summary?.totalGolfCanceledTeams);

  console.log('\nTesting GET /api/v5/dashboard/revenue-summary for range 2026-07-01 ~ 2026-07-27...');
  const res2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data2 = res2.data || res2;
  console.log('Range Summary:', data2.summary);
  console.log('Range totalGolfTeams:', data2.summary?.totalGolfTeams);
  console.log('Range totalGolfReservedTeams:', data2.summary?.totalGolfReservedTeams);
  console.log('Range totalGolfCanceledTeams:', data2.summary?.totalGolfCanceledTeams);
}

testBackendGolfHotfix().catch(console.error);
