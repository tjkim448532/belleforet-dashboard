async function testFinalSynergyMath() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // 1. Single Day 2026-07-24
  const res1 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?date=2026-07-24`, { headers }).then(r => r.json());
  const list1 = res1.data || res1;
  const gt1 = list1.find(r => r.isGrandTotal || r.channelName === '전체 합계');
  
  const sumRes1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  const cats1 = sumRes1.data?.salesByCategory || sumRes1.salesByCategory || [];
  const ancillary1 = cats1.reduce((sum, c) => c.categoryCode !== 'ROOM' ? sum + Number(c.totalSales || 0) : sum, 0);

  console.log('=== FINAL MATH 1: Single Day 2026-07-24 ===');
  console.log(`- Rooms: ${gt1.todayRooms}실 | Room Net Rev: ${gt1.todayRevenue?.toLocaleString()}원`);
  console.log(`- Ancillary Sales (Golf+FNB+Ticket): ${ancillary1.toLocaleString()}원`);
  console.log(`- RevPAS: ${Math.round((gt1.todayRevenue + ancillary1) / gt1.todayRooms).toLocaleString()}원/실`);

  // 2. 2-Day Range 2026-07-23 ~ 2026-07-24
  const res2 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const list2 = res2.data || res2;
  const gt2 = list2.find(r => r.isGrandTotal || r.channelName === '전체 합계');

  const sumRes2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  const cats2 = sumRes2.data?.salesByCategory || sumRes2.salesByCategory || [];
  const ancillary1Day2 = cats2.reduce((sum, c) => c.categoryCode !== 'ROOM' ? sum + Number(c.totalSales || 0) : sum, 0);
  const ancillary2Days = ancillary1Day2 * 2; // 2 days period

  console.log('\n=== FINAL MATH 2: 2-Day Range (2026-07-23 ~ 2026-07-24) ===');
  console.log(`- Period Rooms: ${gt2.mtdRooms}실 | Period Room Net Rev: ${gt2.mtdRevenue?.toLocaleString()}원`);
  console.log(`- Period Ancillary Sales (2 Days): ${ancillary2Days.toLocaleString()}원`);
  console.log(`- Period RevPAS: ${Math.round((gt2.mtdRevenue + ancillary2Days) / gt2.mtdRooms).toLocaleString()}원/실`);
}

testFinalSynergyMath().catch(console.error);
