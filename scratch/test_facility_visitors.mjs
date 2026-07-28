async function testFacilityVisitors() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary?date=2026-07-27...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('salesByFacility items:');
  (data.salesByFacility || []).forEach(f => {
    console.log(`Facility: ${f.shopName || f.facilityName} | Code: ${f.categoryCode} | Sales: ${f.totalSales} | Visitors/Qty: ${f.totalVisitors || f.visitors || f.qty || 0}`);
  });

  console.log('\nChecking daily-sales report for 2026-07-27...');
  const resReport = await fetch(`${baseUrl}/api/v5/report/daily-sales?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataReport = resReport.data || resReport;
  console.log('daily-sales report items count:', Array.isArray(dataReport) ? dataReport.length : 'not array');
  if (Array.isArray(dataReport)) {
    dataReport.slice(0, 10).forEach(item => {
      console.log(`Report item: ${item.shopName || item.facilityName || item.categoryName} | Sales: ${item.todayActual} | Qty/Visitors: ${item.todayQty || item.visitors || 0}`);
    });
  }
}

testFacilityVisitors().catch(console.error);
