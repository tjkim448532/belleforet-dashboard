async function testCoreDataContextQuery() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // 1. CoreDataContext current query: date=2026-07-24&startDate=2026-07-01&endDate=2026-07-24
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24&startDate=2026-07-01&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('=== TEST 1: date=2026-07-24&startDate=2026-07-01&endDate=2026-07-24 ===');
  console.log('Success:', res1.success);
  console.log('Data keys:', Object.keys(res1.data || res1));
  console.log('Summary:', (res1.data || res1).summary);
  console.log('SalesByCategory:', (res1.data || res1).salesByCategory);

  // 2. Pure date query: date=2026-07-24
  const res2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  console.log('\n=== TEST 2: date=2026-07-24 ===');
  console.log('Success:', res2.success);
  console.log('Data keys:', Object.keys(res2.data || res2));
  console.log('Summary:', (res2.data || res2).summary);
  console.log('SalesByCategory:', (res2.data || res2).salesByCategory);
}

testCoreDataContextQuery().catch(console.error);
