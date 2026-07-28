async function findGolfCancellations() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('1. Checking GET /api/v5/dashboard/matrix-weekly?date=2026-07-24...');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?date=2026-07-24`, { headers }).then(r => r.json());
  const data1 = res1.data || res1;
  if (Array.isArray(data1)) {
    const golfItem = data1.find(x => x.categoryCode === 'GOLF' || x.teamName?.includes('골프'));
    console.log('Matrix Weekly Golf Item:', golfItem);
  }

  console.log('\n2. Checking GET /api/v5/report/daily-sales?date=2026-07-24...');
  const res2 = await fetch(`${baseUrl}/api/v5/report/daily-sales?date=2026-07-24`, { headers }).then(r => r.json());
  console.log('daily-sales keys:', Object.keys(res2.data || res2));
}

findGolfCancellations().catch(console.error);
