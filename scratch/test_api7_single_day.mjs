async function testAPI7SingleDay() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // Single Day date=2026-07-24
  const res7 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?date=2026-07-24`, { headers }).then(r => r.json());
  const list7 = res7.data || res7;

  const gt = list7.find(r => r.isGrandTotal || r.channelName === '전체 합계');
  console.log('=== API 7 Single Day (2026-07-24) Grand Total ===');
  console.log('Grand Total:', {
    targetDate: res7.targetDate,
    isRangeQuery: res7.isRangeQuery,
    rooms: gt?.todayRooms,
    revenue: gt?.todayRevenue
  });

  const segGroups = {};
  list7.forEach(item => {
    if (item.isGrandTotal || item.isChannelSubtotal) return;
    const seg = item.segmentName || '기타';
    if (!segGroups[seg]) segGroups[seg] = { rooms: 0, revenue: 0 };
    segGroups[seg].rooms += item.todayRooms || 0;
    segGroups[seg].revenue += item.todayRevenue || 0;
  });

  console.log('\n=== API 7 Segment Aggregations for Single Day (2026-07-24) ===');
  Object.entries(segGroups).forEach(([seg, val]) => {
    console.log(`- ${seg}: ${val.rooms}실 | ${val.revenue.toLocaleString()}원 | ADR: ${val.rooms > 0 ? Math.round(val.revenue / val.rooms).toLocaleString() : 0}원/실`);
  });
}

testAPI7SingleDay().catch(console.error);
