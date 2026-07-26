async function checkApi7Channels() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const rows = res.data || res;

  console.log('API 7 Rows Count:', Array.isArray(rows) ? rows.length : 0);
  if (Array.isArray(rows)) {
    rows.forEach((r, idx) => {
      console.log(`[Row ${idx}] channelName: "${r.channelName}", channel_name: "${r.channel_name}", segmentName: "${r.segmentName}", channelGroup: "${r.channelGroup}", shopName: "${r.shopName}"`);
    });
  }
}

checkApi7Channels().catch(console.error);
