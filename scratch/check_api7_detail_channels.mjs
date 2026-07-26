async function checkApi7DetailChannels() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const rows = res.data || res;

  console.log('Total API 7 rows:', Array.isArray(rows) ? rows.length : 0);
  if (Array.isArray(rows)) {
    const channelNames = new Set(rows.map(r => r.channelName));
    const segmentNames = new Set(rows.map(r => r.segmentName));
    console.log('Distinct channelName values:', Array.from(channelNames));
    console.log('Distinct segmentName values:', Array.from(segmentNames));

    console.log('\nSample rows:');
    rows.slice(0, 15).forEach((r, i) => {
      console.log(`Row ${i}: channelName="${r.channelName}", segmentName="${r.segmentName}", rooms=${r.mtdRooms || r.todayRooms}, rev=${r.mtdRevenue || r.todayRevenue}`);
    });
  }
}

checkApi7DetailChannels().catch(console.error);
