async function checkDates() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const d1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-01`, { headers }).then(r => r.json());
  console.log('2026-07-01 summary:', d1.summary);

  const d26 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-26`, { headers }).then(r => r.json());
  console.log('2026-07-26 summary:', d26.summary);
}

checkDates().catch(console.error);
