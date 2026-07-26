async function inspectRawFields() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  // Query 2026-07-23 ~ 2026-07-24
  const res6 = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('=== API 6 RAW JSON (room-channel-sales) for 2026-07-23 ~ 2026-07-24 ===');
  console.log(JSON.stringify(res6, null, 2).slice(0, 1500));

  const res7 = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('=== API 7 RAW JSON (room-sales-by-channel) for 2026-07-23 ~ 2026-07-24 ===');
  console.log(JSON.stringify(res7, null, 2).slice(0, 1500));
}

inspectRawFields().catch(console.error);
