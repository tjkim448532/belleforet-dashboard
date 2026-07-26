async function debugBackendResponse() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-01-01&endDate=2026-06-30`, { headers }).then(r => r.json());
  console.log('Root Keys:', Object.keys(res));
  if (res.data) {
    console.log('res.data type:', typeof res.data, 'Array?', Array.isArray(res.data));
    console.log('res.data sample:', JSON.stringify(res.data).slice(0, 300));
  } else {
    console.log('res sample:', JSON.stringify(res).slice(0, 300));
  }
}

debugBackendResponse().catch(console.error);
