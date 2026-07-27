async function diagnoseOccCause() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // Test various query dates and ranges
  const testQueries = [
    { name: 'Range 2026-01-01 ~ 2026-07-26 (H1+July)', url: `${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-01-01&endDate=2026-07-26` },
    { name: 'Range 2026-01-01 ~ 2026-06-30 (H1 181 days)', url: `${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-01-01&endDate=2026-06-30` },
    { name: 'Range 2026-07-01 ~ 2026-07-26 (July 26 days)', url: `${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26` },
    { name: 'Single Day 2026-07-24', url: `${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24` },
    { name: 'Single Day 2026-06-15', url: `${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-06-15` },
  ];

  for (const q of testQueries) {
    const res = await fetch(q.url, { headers }).then(r => r.json());
    const data = res.data || res;
    console.log(`\n=== Query: ${q.name} ===`);
    if (Array.isArray(data)) {
      console.log(`Returned Array of ${data.length} items.`);
      // Count total rooms sold & total revenue
      let sumRooms = 0, sumRev = 0, sumTotalRev = 0;
      data.forEach(d => {
        sumRooms += Number(d.summary?.totalRooms || 0);
        const roomCat = d.salesByCategory?.find(x => x.categoryCode === 'ROOM' || x.categoryCode === '객실');
        sumRev += Number(roomCat?.todayActual || roomCat?.totalSales || 0);
        sumTotalRev += Number(d.summary?.totalRevenue || 0);
      });
      const days = data.length;
      const physicalCapacity175 = 175 * days;
      const physicalCapacity180 = 180 * days;
      console.log(`Sum Rooms Sold: ${sumRooms} | Days: ${days}`);
      console.log(`Occ with 175 cap: ${(sumRooms / physicalCapacity175 * 100).toFixed(1)}%`);
      console.log(`Occ with 180 cap: ${(sumRooms / physicalCapacity180 * 100).toFixed(1)}%`);
      console.log(`RevPAR (175): ${Math.round(sumRev / physicalCapacity175).toLocaleString()}원`);
      console.log(`TrevPAR (175): ${Math.round(sumTotalRev / physicalCapacity175).toLocaleString()}원`);
    } else {
      const s = data.summary || {};
      console.log(`Summary:`, s);
      const days = data.dailyTrends?.length || 1;
      const physicalCap175 = 175 * days;
      console.log(`TotalRooms: ${s.totalRooms} | TotalRev: ${s.totalRevenue}`);
      console.log(`Occ with 175 cap (${physicalCap175}): ${(s.totalRooms / physicalCap175 * 100).toFixed(1)}%`);
      console.log(`RevPAR: ${Math.round((s.totalRevenue || 0) / physicalCap175).toLocaleString()}원`);
    }
  }
}

diagnoseOccCause().catch(console.error);
