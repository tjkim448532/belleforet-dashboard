async function testAdrRange() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('1. Checking revenue-summary roomSummaryByType for 2026-07-01 ~ 2026-07-29...');
  const res1 = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-29&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data1 = res1.data || res1;
  console.log('roomSummaryByType:', data1.roomSummaryByType);

  console.log('\n2. Checking room-sales-by-channel for 2026-07-01 ~ 2026-07-29...');
  const res2 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-29&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data2 = res2.data || res2;
  console.log('room-sales-by-channel sample items:', (Array.isArray(data2) ? data2.slice(0, 5) : data2));
}

testAdrRange().catch(console.error);
