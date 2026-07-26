async function testRevenueSummaryParams() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // 1. date=2026-07-24
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  console.log('1. date=2026-07-24 -> success:', res1.success, 'cats:', res1.data?.salesByCategory?.length || res1.salesByCategory?.length);

  // 2. date=2026-07-24&startDate=2026-07-23&endDate=2026-07-24
  const res2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24&startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('2. date=2026-07-24&startDate=2026-07-23&endDate=2026-07-24 -> success:', res2.success, 'cats:', res2.data?.salesByCategory?.length || res2.salesByCategory?.length);
}

testRevenueSummaryParams().catch(console.error);
