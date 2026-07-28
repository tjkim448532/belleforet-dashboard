async function testAllDatesGolf() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const dates = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27'];
  for (const d of dates) {
    const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=${d}&_t=${Date.now()}`, { headers }).then(r => r.json());
    const s = res.summary || res.data?.summary || {};
    console.log(`Date: ${d} | totalGolfTeams: ${s.totalGolfTeams} | Reserved: ${s.totalGolfReservedTeams} | Canceled: ${s.totalGolfCanceledTeams}`);
  }
}

testAllDatesGolf().catch(console.error);
