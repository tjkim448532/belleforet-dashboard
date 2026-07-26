async function testRemoveAPI6() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // 1. Fetch ONLY API 7 for 2-day range 2026-07-23 ~ 2026-07-24
  const res7 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  const list7 = res7.data || res7;

  // Find Grand Total
  const gt = list7.find(r => r.isGrandTotal || r.channelName === '전체 합계');
  console.log('=== API 7 Grand Total (Range 2026-07-23 ~ 2026-07-24) ===');
  console.log('Grand Total:', {
    targetDate: res7.targetDate,
    isRangeQuery: res7.isRangeQuery,
    rooms: gt?.mtdRooms,
    revenue: gt?.mtdRevenue
  });

  // Group by Segment from API 7 detail rows!
  const segGroups = {};
  list7.forEach(item => {
    if (item.isGrandTotal || item.isChannelSubtotal) return;
    const seg = item.segmentName || '기타';
    if (!segGroups[seg]) segGroups[seg] = { rooms: 0, revenue: 0 };
    segGroups[seg].rooms += item.mtdRooms || 0;
    segGroups[seg].revenue += item.mtdRevenue || 0;
  });

  console.log('\n=== API 7 Segment Aggregations (Range 2026-07-23 ~ 2026-07-24) ===');
  Object.entries(segGroups).forEach(([seg, val]) => {
    console.log(`- ${seg}: ${val.rooms}실 | ${val.revenue.toLocaleString()}원 | ADR: ${val.rooms > 0 ? Math.round(val.revenue / val.rooms).toLocaleString() : 0}원/실`);
  });
}

testRemoveAPI6().catch(console.error);
