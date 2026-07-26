async function checkBibleSsotKeys() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const resRange = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());
  const data = resRange.data || resRange;
  console.log('Range Data type:', typeof data, Array.isArray(data) ? `Array length ${data.length}` : Object.keys(data));
  if (Array.isArray(data) && data.length > 0) {
    console.log('Sample item keys:', Object.keys(data[0]));
    console.log('Sample item summary:', data[0].summary);
  } else {
    console.log('Range keys:', Object.keys(data));
  }
}

checkBibleSsotKeys().catch(console.error);
