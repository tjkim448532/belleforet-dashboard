async function inspectRevenueSummaryArray() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  console.log('Is Array?', Array.isArray(res.data || res));
  const items = res.data || res;

  if (Array.isArray(items)) {
    console.log('Total days in response:', items.length);
    let revSum = 0;
    let roomSum = 0;
    let visitorSum = 0;

    items.forEach(day => {
      const s = day.summary || {};
      revSum += Number(s.totalRevenue || 0);
      roomSum += Number(s.totalRooms || 0);
      visitorSum += Number(s.totalVisitors || 0);
    });

    console.log('\n--- Aggregated Range Totals from revenue-summary array ---');
    console.log('Period Total Revenue:', revSum.toLocaleString(), '원');
    console.log('Period Total Rooms:', roomSum, '실');
    console.log('Period Total Visitors:', visitorSum, '명');

    // Compare with matrix-weekly total
    const mat = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
    const matRows = mat.data || mat;
    const gt = matRows.find(r => r.isGrandTotal);
    console.log('\n--- Matrix Weekly Period Total ---');
    console.log('Matrix Grand Total Actual:', gt?.todayActual?.toLocaleString(), '원');
  }
}

inspectRevenueSummaryArray().catch(console.error);
