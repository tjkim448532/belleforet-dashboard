async function testAPI7Mapping() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // 2-day range (2026-07-23 ~ 2026-07-24)
  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const list = res.data || res;

  const isMultiDayRange = true;

  const gt = list.find(r => r.isGrandTotal || r.channelName === '전체 합계');
  const totalRooms = isMultiDayRange ? gt.mtdRooms : gt.todayRooms;
  const totalRevenue = isMultiDayRange ? gt.mtdRevenue : gt.todayRevenue;

  console.log('=== API 7 (room-sales-by-channel) Grand Total for 2-Day Range ===');
  console.log(`Total Rooms: ${totalRooms}실 | Total Revenue: ${totalRevenue?.toLocaleString()}원 | ADR: ${Math.round(totalRevenue / totalRooms).toLocaleString()}원/실`);

  console.log('\n=== Channel Subtotals for 2-Day Range ===');
  list.filter(r => r.isChannelSubtotal && !r.isGrandTotal).forEach(s => {
    const rCount = isMultiDayRange ? s.mtdRooms : s.todayRooms;
    const rRev = isMultiDayRange ? s.mtdRevenue : s.todayRevenue;
    console.log(`- ${s.channelName}: ${rCount}실 | ${rRev?.toLocaleString()}원 | ADR: ${rCount > 0 ? Math.round(rRev / rCount).toLocaleString() : 0}원/실`);
  });
}

testAPI7Mapping().catch(console.error);
