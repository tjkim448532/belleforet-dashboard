async function testRoomGuests() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('1. Single day summary room capacity fields...');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const s1 = res1.summary || res1.data?.summary || {};
  console.log('Single day s1.totalRoomCap:', s1.totalRoomCap, 's1.totalRooms:', s1.totalRooms);

  console.log('\n2. Range query summary room capacity fields...');
  const res2 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const s2 = res2.summary || res2.data?.summary || {};
  console.log('Range s2.totalRoomCap:', s2.totalRoomCap, 's2.totalRooms:', s2.totalRooms);
}

testRoomGuests().catch(console.error);
