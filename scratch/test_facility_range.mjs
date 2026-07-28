async function testFacilityRange() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary for range 2026-07-01 ~ 2026-07-27...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('Range salesByFacility items for Leisure/Ticket/Moto:');
  (data.salesByFacility || []).filter(f => f.categoryCode === 'TICKET' || f.categoryCode === 'MOTO' || f.categoryCode === 'LEISURE').forEach(f => {
    console.log(`Facility: ${f.shopName || f.facilityName} | Sales: ${f.totalSales} | Visitors/Qty: ${f.totalVisitors || f.visitors || f.qty || 0}`);
  });
}

testFacilityRange().catch(console.error);
