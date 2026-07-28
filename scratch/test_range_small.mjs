async function testRangeSmall() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-24&endDate=2026-07-25&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  console.log('Range Summary (24-25):', data.summary);
  console.log('Range totalGolfTeams:', data.summary?.totalGolfTeams);
  console.log('Range totalGolfReservedTeams:', data.summary?.totalGolfReservedTeams);
  console.log('Range totalGolfCanceledTeams:', data.summary?.totalGolfCanceledTeams);
}

testRangeSmall().catch(console.error);
