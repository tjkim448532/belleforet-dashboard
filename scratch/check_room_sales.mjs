async function checkRoomChannelSales() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  
  // 1. Single day query date=2026-07-24
  const res1 = await fetch('https://belleforet-data.vercel.app/api/v5/report/room-channel-sales?date=2026-07-24', { headers });
  const json1 = await res1.json();
  const list1 = json1.data || json1;

  console.log('=== Single Day (date=2026-07-24) Subtotals ===');
  if (Array.isArray(list1)) {
    list1.filter(r => r.isSegmentSubtotal || r.isGrandTotal).forEach(r => {
      console.log(`[Subtotal] seg="${r.segmentName}" | todayRooms=${r.todayRooms} | todayRev=${r.todayRevenue?.toLocaleString()} | mtdRooms=${r.mtdRooms} | mtdRev=${r.mtdRevenue?.toLocaleString()}`);
    });
  }

  // 2. Same day range query startDate=2026-07-24&endDate=2026-07-24
  const res2 = await fetch('https://belleforet-data.vercel.app/api/v5/report/room-channel-sales?startDate=2026-07-24&endDate=2026-07-24', { headers });
  const json2 = await res2.json();
  const list2 = json2.data || json2;

  console.log('=== Same Day Range (2026-07-24 ~ 2026-07-24) Subtotals ===');
  if (Array.isArray(list2)) {
    list2.filter(r => r.isSegmentSubtotal || r.isGrandTotal).forEach(r => {
      console.log(`[Subtotal] seg="${r.segmentName}" | todayRooms=${r.todayRooms} | todayRev=${r.todayRevenue?.toLocaleString()} | mtdRooms=${r.mtdRooms} | mtdRev=${r.mtdRevenue?.toLocaleString()}`);
    });
  }
}

checkRoomChannelSales().catch(console.error);
