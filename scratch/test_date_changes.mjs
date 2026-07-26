async function testDateChanges() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const dates = ['2026-07-24', '2026-07-15', '2026-07-01', '2026-06-15', '2026-05-01'];

  for (const d of dates) {
    const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=${d}`, { headers }).then(r => r.json());
    const payload = res.data || res;
    const s = payload.summary || {};
    const roomCat = payload.salesByCategory?.find((x) => x.categoryCode === 'ROOM' || x.categoryCode === '객실');
    const roomSummary = payload.roomSummaryByType;
    
    console.log(`\n=== Date: ${d} ===`);
    console.log(`TotalRev: ${s.totalRevenue?.toLocaleString()} | TotalRooms: ${s.totalRooms} | TotalVisitors: ${s.totalVisitors}`);
    console.log(`salesByCategory ROOM:`, roomCat);
    console.log(`roomSummaryByType:`, roomSummary);
  }
}

testDateChanges().catch(console.error);
