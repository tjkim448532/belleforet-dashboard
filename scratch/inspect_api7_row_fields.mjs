async function inspectApi7RowFields() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const rows = res.data || res;

  if (Array.isArray(rows) && rows.length > 0) {
    console.log('API 7 Row Keys:', Object.keys(rows[0]));
    console.log('\nSample non-zero rows:');
    rows.filter(r => (r.mtdRooms || r.todayRooms || 0) > 0).slice(0, 10).forEach((r, i) => {
      console.log(`[Non-zero Row ${i}]`, JSON.stringify(r));
    });
  }
}

inspectApi7RowFields().catch(console.error);
