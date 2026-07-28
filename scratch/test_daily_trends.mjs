async function testDailyTrends() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  if (Array.isArray(data.dailyTrends) && data.dailyTrends.length > 0) {
    console.log('Sample dailyTrend item keys:', Object.keys(data.dailyTrends[0]));
    console.log('Sample dailyTrend item:', data.dailyTrends[0]);
    
    let sumReserved = 0;
    let sumCanceled = 0;
    let sumVisited = 0;
    data.dailyTrends.forEach(d => {
      sumVisited += Number(d.totalGolfTeams || d.golfTeams || 0);
      sumReserved += Number(d.totalGolfReservedTeams || d.golfReservedTeams || 0);
      sumCanceled += Number(d.totalGolfCanceledTeams || d.golfCanceledTeams || 0);
    });
    console.log(`Summed from dailyTrends -> Visited: ${sumVisited}, Reserved: ${sumReserved}, Canceled: ${sumCanceled}`);
  } else {
    console.log('dailyTrends is empty or not an array:', data.dailyTrends);
  }
}

testDailyTrends().catch(console.error);
