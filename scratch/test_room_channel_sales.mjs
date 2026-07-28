async function testRoomChannelSales() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-27`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  if (Array.isArray(data)) {
    let r16 = { rev: 0, sold: 0 }, r35 = { rev: 0, sold: 0 }, r51 = { rev: 0, sold: 0 };
    data.forEach(item => {
      if (item.isChannelSubtotal || item.isGrandTotal) return;
      const type = item.roomType || item.room_type || '';
      const rev = Number(item.todayRevenue || item.revenue || item.netRevenue || item.roomRevenue || 0);
      const sold = Number(item.todayRooms || item.roomsSold || item.rooms_sold || 0);
      if (type.includes('16평')) { r16.rev += rev; r16.sold += sold; }
      else if (type.includes('35평')) { r35.rev += rev; r35.sold += sold; }
      else if (type.includes('51평')) { r51.rev += rev; r51.sold += sold; }
    });
    console.log('16평 Sold:', r16.sold, '| Rev:', r16.rev, '| ADR:', r16.sold > 0 ? Math.round(r16.rev / r16.sold) : 0);
    console.log('35평 Sold:', r35.sold, '| Rev:', r35.rev, '| ADR:', r35.sold > 0 ? Math.round(r35.rev / r35.sold) : 0);
    console.log('51평 Sold:', r51.sold, '| Rev:', r51.rev, '| ADR:', r51.sold > 0 ? Math.round(r51.rev / r51.sold) : 0);
  }
}

testRoomChannelSales().catch(console.error);
