async function checkJan1() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-01-01`, { headers }).then(r => r.json());
  console.log('2026-01-01 summary:', res.summary);
  console.log('2026-01-01 salesByCategory:', res.salesByCategory);
  console.log('2026-01-01 roomSummaryByType:', res.roomSummaryByType);
}

checkJan1().catch(console.error);
