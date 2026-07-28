async function testGolfFields() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Fetching revenue-summary for single day...');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  const data1 = res1.data || res1;
  console.log('Single day summary keys:', Object.keys(data1.summary || {}));
  console.log('Single day summary content:', data1.summary);

  console.log('\nFetching daily-sales report...');
  const res2 = await fetch(`${baseUrl}/api/v5/report/daily-sales?date=2026-07-24`, { headers }).then(r => r.json());
  const data2 = res2.data || res2;
  console.log('daily-sales data keys:', Object.keys(data2 || {}));
  if (Array.isArray(data2)) {
    const golfItem = data2.find(x => x.categoryCode === 'GOLF' || x.teamName?.includes('골프') || x.shopName?.includes('골프'));
    console.log('Golf item in daily-sales:', golfItem);
  }
}

testGolfFields().catch(console.error);
