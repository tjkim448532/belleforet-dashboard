async function checkAllV5Endpoints() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const endpoints = [
    '/api/v5/dashboard/revenue-summary?date=2026-07-24',
    '/api/v5/dashboard/matrix-weekly?date=2026-07-24',
    '/api/v5/report/daily-sales?date=2026-07-24',
    '/api/v5/report/room-channel-sales?date=2026-07-24',
    '/api/v5/report/room-sales-by-channel?date=2026-07-24',
    '/api/v5/report/synergy-store-correlation?startDate=2026-07-01&endDate=2026-07-26'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep}`, { headers }).then(r => r.json());
      const payload = res.data || res;
      console.log(`\n=== Endpoint: ${ep} ===`);
      console.log('Is Array?', Array.isArray(payload), 'Length:', Array.isArray(payload) ? payload.length : 'N/A');
      if (Array.isArray(payload) && payload.length > 0) {
        console.log('Keys:', Object.keys(payload[0]));
        console.log('Sample item:', JSON.stringify(payload[0]));
      } else if (payload && typeof payload === 'object') {
        console.log('Keys:', Object.keys(payload));
      }
    } catch (e) {
      console.error(`Failed ${ep}:`, e.message);
    }
  }
}

checkAllV5Endpoints().catch(console.error);
