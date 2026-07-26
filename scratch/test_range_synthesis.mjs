async function testRangeSynthesis() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const startDate = '2026-07-01';
  const endDate = '2026-07-26';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`, { headers }).then(r => r.json());
  let corePayload = res.data || res;

  if (Array.isArray(corePayload)) {
    const dailyArray = corePayload;
    const latestDay = dailyArray[dailyArray.length - 1] || dailyArray[0] || {};
    const firstDay = dailyArray[0] || {};

    let totalRev = 0;
    let totalRooms = 0;
    let totalVisitors = 0;
    let todayLyRev = 0;

    const categoryMap = {};
    const roomTypeMap = {};

    dailyArray.forEach((dayItem) => {
      const s = dayItem.summary || {};
      totalRev += Number(s.totalRevenue || dayItem.totalRevenue || 0);
      totalRooms += Number(s.totalRooms || dayItem.totalRooms || 0);
      totalVisitors += Number(s.totalVisitors || dayItem.totalVisitors || 0);
      todayLyRev += Number(s.todayLyRevenue || s.lyRevenue || dayItem.todayLyRevenue || 0);

      // Categories
      if (dayItem.salesByCategory && Array.isArray(dayItem.salesByCategory)) {
        dayItem.salesByCategory.forEach((cat) => {
          const code = cat.categoryCode || cat.category_code || 'OTHER';
          const name = cat.categoryName || cat.category_name || code;
          const amt = Number(cat.todayActual || cat.totalSales || cat.sales || cat.revenue || 0);
          if (!categoryMap[code]) {
            categoryMap[code] = { code, name, actual: 0 };
          }
          categoryMap[code].actual += amt;
        });
      }

      // Room Types
      if (dayItem.roomSummaryByType && Array.isArray(dayItem.roomSummaryByType)) {
        dayItem.roomSummaryByType.forEach((rt) => {
          const type = rt.room_type || rt.roomType || '기타';
          const sold = Number(rt.rooms_sold || rt.roomsSold || 0);
          const rev = Number(rt.revenue || 0);
          if (!roomTypeMap[type]) {
            roomTypeMap[type] = { type, sold: 0, rev: 0 };
          }
          roomTypeMap[type].sold += sold;
          roomTypeMap[type].rev += rev;
        });
      }
    });

    const salesByCategory = Object.values(categoryMap).map(c => ({
      categoryCode: c.code,
      categoryName: c.name,
      todayActual: c.actual,
      totalSales: c.actual
    }));

    const roomSummaryByType = Object.values(roomTypeMap).map(rt => ({
      roomType: rt.type,
      roomsSold: rt.sold,
      revenue: rt.rev
    }));

    corePayload = {
      isRangeQuery: true,
      startDate,
      endDate,
      summary: {
        totalRevenue: totalRev,
        totalRooms: totalRooms,
        totalVisitors: totalVisitors,
        totalRoomCap: (firstDay.summary?.totalRoomCap || 180) * dailyArray.length,
        ytdRevenue: latestDay.summary?.ytdRevenue || 0,
        ytdLyRevenue: latestDay.summary?.ytdLyRevenue || 0,
        todayLyRevenue: todayLyRev,
        totalGolfTeams: dailyArray.reduce((acc, d) => acc + Number(d.summary?.totalGolfTeams || 0), 0),
        totalGolfVisitors: dailyArray.reduce((acc, d) => acc + Number(d.summary?.totalGolfVisitors || 0), 0),
      },
      salesByCategory,
      salesByFacility: [],
      roomSummaryByType,
      dailyTrends: dailyArray,
      weather: latestDay.weather || null
    };
  }

  console.log('--- Synthesized Period Payload (2026-07-01 ~ 2026-07-26) ---');
  console.log('Total Revenue:', corePayload.summary.totalRevenue.toLocaleString(), '원');
  console.log('Total Rooms:', corePayload.summary.totalRooms, '실');
  console.log('Total Visitors:', corePayload.summary.totalVisitors.toLocaleString(), '명');
  console.log('Total Capacity:', corePayload.summary.totalRoomCap, '실');
  console.log('Occ Rate:', ((corePayload.summary.totalRooms / corePayload.summary.totalRoomCap) * 100).toFixed(1), '%');
  console.log('Sales By Category:', corePayload.salesByCategory);
  console.log('Room Summary By Type:', corePayload.roomSummaryByType);
}

testRangeSynthesis().catch(console.error);
