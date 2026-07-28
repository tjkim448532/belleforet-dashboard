async function testPeriodAdr() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('dailyTrends count:', data.dailyTrends?.length);
  if (Array.isArray(data.dailyTrends) && data.dailyTrends.length > 0) {
    const firstTrend = data.dailyTrends[0];
    console.log('firstTrend keys:', Object.keys(firstTrend));
    console.log('firstTrend roomSummaryByType:', firstTrend.roomSummaryByType);
  }
}

testPeriodAdr().catch(console.error);
