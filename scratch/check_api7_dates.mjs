async function checkAPI7Dates() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('=== API 7: GET /api/v5/report/room-sales-by-channel ===');
  
  // 1. Single Day date=2026-07-24
  const res1 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?date=2026-07-24`, { headers }).then(r => r.json());
  const list1 = res1.data || res1;
  console.log('--- Single Day (date=2026-07-24) ---');
  list1.forEach(r => {
    if (r.isChannelSubtotal || r.isGrandTotal) {
      console.log(`[API 7 1-day] channel="${r.channelName}" | todayRooms=${r.todayRooms} | todayRev=${r.todayRevenue?.toLocaleString()} | mtdRooms=${r.mtdRooms} | mtdRev=${r.mtdRevenue?.toLocaleString()}`);
    }
  });

  // 2. 2-day period range (startDate=2026-07-23&endDate=2026-07-24)
  const res2 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const list2 = res2.data || res2;
  console.log('\n--- 2-Day Range (2026-07-23 ~ 2026-07-24) ---');
  list2.forEach(r => {
    if (r.isChannelSubtotal || r.isGrandTotal) {
      console.log(`[API 7 2-day] channel="${r.channelName}" | todayRooms=${r.todayRooms} | todayRev=${r.todayRevenue?.toLocaleString()} | mtdRooms=${r.mtdRooms} | mtdRev=${r.mtdRevenue?.toLocaleString()}`);
    }
  });
}

checkAPI7Dates().catch(console.error);
