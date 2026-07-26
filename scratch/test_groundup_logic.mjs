async function testGroundUpLogic() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  async function testRun(sDate, eDate, isRange) {
    const isActualRange = isRange && !!eDate && sDate !== eDate;
    const queryParams = isRange && eDate ? `startDate=${sDate}&endDate=${eDate}` : `date=${sDate}`;

    const res7 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?${queryParams}`, { headers }).then(r => r.json());
    const list7 = res7.data || res7;

    const gtRow = list7.find(r => r.isGrandTotal || r.channelName === '전체 합계');
    const totalRooms = isActualRange ? (gtRow?.mtdRooms || 0) : (gtRow?.todayRooms || 0);
    const totalRev = isActualRange ? (gtRow?.mtdRevenue || 0) : (gtRow?.todayRevenue || 0);

    const sumRes = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=${eDate || sDate}`, { headers }).then(r => r.json());
    const cats = sumRes.data?.salesByCategory || sumRes.salesByCategory || [];
    
    // Days multiplier
    const d1 = new Date(sDate);
    const d2 = new Date(eDate || sDate);
    const days = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    const multiplier = isActualRange ? days : 1;

    const golf = Number(cats.find(x => x.categoryCode === 'GOLF')?.totalSales || 0) * multiplier;
    const fnb = Number(cats.find(x => x.categoryCode === 'FNB')?.totalSales || 0) * multiplier;
    const ticket = Number(cats.find(x => x.categoryCode === 'TICKET')?.totalSales || 0) * multiplier;
    const totalAncillary = golf + fnb + ticket;

    // Segment grouping
    const segMap = {};
    list7.forEach(r => {
      if (r.isGrandTotal || r.isChannelSubtotal) return;
      const seg = r.segmentName || '기타';
      if (!segMap[seg]) segMap[seg] = { rooms: 0, revenue: 0 };
      segMap[seg].rooms += isActualRange ? (r.mtdRooms || 0) : (r.todayRooms || 0);
      segMap[seg].revenue += isActualRange ? (r.mtdRevenue || 0) : (r.todayRevenue || 0);
    });

    console.log(`\n=============================================================`);
    console.log(`TEST RANGE: ${sDate} ~ ${eDate || sDate} (${days}일간, isActualRange=${isActualRange})`);
    console.log(`=============================================================`);
    console.log(`- 점유 객실수: ${totalRooms.toLocaleString()}실`);
    console.log(`- 객실 순매출: ${totalRev.toLocaleString()}원 (ADR: ${Math.round(totalRev / totalRooms).toLocaleString()}원/실)`);
    console.log(`- 부대시설 시너지: ${totalAncillary.toLocaleString()}원 (Golf:${golf.toLocaleString()}, FNB:${fnb.toLocaleString()}, Ticket:${ticket.toLocaleString()})`);
    console.log(`- 통합 RevPAS: ${Math.round((totalRev + totalAncillary) / totalRooms).toLocaleString()}원/실`);

    console.log('\n--- 세그먼트별 기여도 ---');
    Object.entries(segMap).forEach(([seg, val]) => {
      if (val.rooms > 0 || val.revenue > 0) {
        const share = ((val.revenue / (totalRev || 1)) * 100).toFixed(1);
        const segAncillary = Math.round(totalAncillary * (val.revenue / (totalRev || 1)));
        console.log(`[${seg}] ${val.rooms}실 | 매출: ${val.revenue.toLocaleString()}원 (${share}%) | 부대시너지: +${segAncillary.toLocaleString()}원`);
      }
    });
  }

  await testRun('2026-07-24', '2026-07-24', false); // Single day
  await testRun('2026-07-23', '2026-07-24', true);  // 2-day range
  await testRun('2026-07-01', '2026-07-24', true);  // July MTD
}

testGroundUpLogic().catch(console.error);
