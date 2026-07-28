async function testChannelSalesFields() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Fetching room-sales-by-channel with startDate=2026-07-01&endDate=2026-07-29...');
  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-29&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  if (Array.isArray(data)) {
    const activeItem = data.find(x => Number(x.todayRooms || x.periodRooms || x.roomsSold || x.rooms || x.mtdRooms || 0) > 0 || Number(x.todayRevenue || x.periodRevenue || x.revenue || x.mtdRevenue || 0) > 0);
    console.log('Active item in room-sales-by-channel:', activeItem);
    
    // Check all keys in active items
    const allActive = data.filter(x => (Number(x.todayRooms || 0) > 0 || Number(x.mtdRooms || 0) > 0 || Number(x.roomsSold || 0) > 0 || Number(x.periodRooms || 0) > 0));
    console.log(`Found ${allActive.length} active items.`);
    if (allActive.length > 0) {
      console.log('Sample active item:', allActive[0]);
    }
  }
}

testChannelSalesFields().catch(console.error);
