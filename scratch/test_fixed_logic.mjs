async function testFixedSynergyLogic() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // Test 1: Single Day 2026-07-24
  const roomRes1 = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?date=2026-07-24`, { headers }).then(r => r.json());
  const summaryRes1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());

  const roomList1 = roomRes1.data || roomRes1;
  const gt1 = roomList1.find(r => r.isGrandTotal);
  const cats1 = summaryRes1.data?.salesByCategory || summaryRes1.salesByCategory || [];
  
  const golf1 = Number(cats1.find(x => x.categoryCode === 'GOLF')?.totalSales || 0);
  const fnb1 = Number(cats1.find(x => x.categoryCode === 'FNB')?.totalSales || 0);
  const ticket1 = Number(cats1.find(x => x.categoryCode === 'TICKET')?.totalSales || 0);

  console.log('=== FIX TEST 1: Single Day 2026-07-24 ===');
  console.log(`- Rooms: ${gt1.todayRooms}실 | Revenue: ${gt1.todayRevenue?.toLocaleString()}원`);
  console.log(`- Ancillary Synergy Sales (Golf+FNB+Ticket): ${(golf1 + fnb1 + ticket1).toLocaleString()}원 (Golf:${golf1.toLocaleString()}, FNB:${fnb1.toLocaleString()}, Ticket:${ticket1.toLocaleString()})`);

  // Test 2: 2-day period range 2026-07-23 ~ 2026-07-24
  const roomRes2 = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const summaryRes2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());

  const roomList2 = roomRes2.data || roomRes2;
  const gt2 = roomList2.find(r => r.isGrandTotal);
  const cats2 = summaryRes2.data?.salesByCategory || summaryRes2.salesByCategory || [];
  
  const golf2 = Number(cats2.find(x => x.categoryCode === 'GOLF')?.totalSales || 0);
  const fnb2 = Number(cats2.find(x => x.categoryCode === 'FNB')?.totalSales || 0);
  const ticket2 = Number(cats2.find(x => x.categoryCode === 'TICKET')?.totalSales || 0);

  console.log('\n=== FIX TEST 2: Range 2026-07-23 ~ 2026-07-24 ===');
  console.log(`- Period Rooms: ${gt2.mtdRooms}실 | Period Revenue: ${gt2.mtdRevenue?.toLocaleString()}원`);
  console.log(`- Ancillary Synergy Sales (Golf+FNB+Ticket): ${(golf2 + fnb2 + ticket2).toLocaleString()}원`);
}

testFixedSynergyLogic().catch(console.error);
