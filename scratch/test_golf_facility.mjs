async function testGolfFacility() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/revenue-summary?date=2026-07-27...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  const golfFacilities = (data.salesByFacility || []).filter(x => x.categoryCode === 'GOLF' || x.categoryCode === '골프');
  console.log('Golf Facilities raw items:', golfFacilities);
}

testGolfFacility().catch(console.error);
