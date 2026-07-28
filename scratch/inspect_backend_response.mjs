async function inspectResponse() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const data = res.data || res;
  
  console.log('Type of response:', Array.isArray(data) ? 'Array' : typeof data);
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    console.log('First day item keys:', Object.keys(data[0] || {}));
    console.log('First day roomSummaryByType:', data[0]?.roomSummaryByType);
  } else {
    console.log('Object keys:', Object.keys(data));
    console.log('roomSummaryByType:', data.roomSummaryByType);
  }
}

inspectResponse().catch(console.error);
