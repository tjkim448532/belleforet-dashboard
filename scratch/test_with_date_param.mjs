async function testWithDateParam() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing with date & startDate & endDate:');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-06-30&startDate=2026-01-01&endDate=2026-06-30`, { headers }).then(r => r.json());
  console.log('Root Keys:', Array.isArray(res) ? `Array[${res.length}]` : Object.keys(res));
  if (!Array.isArray(res)) {
    console.log('Summary:', res.summary);
  }
}

testWithDateParam().catch(console.error);
