async function testLiveUserQuery() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Fetching revenue-summary for 2026-07-02 ~ 2026-07-26...');
  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-02&endDate=2026-07-26&_t=${Date.now()}`, { headers }).then(r => r.json());
  
  console.log('Res root keys:', Array.isArray(res) ? `Array[${res.length}]` : Object.keys(res));
  let corePayload = res.data || res;
  console.log('corePayload type:', Array.isArray(corePayload) ? `Array[${corePayload.length}]` : typeof corePayload);

  if (Array.isArray(corePayload)) {
    console.log('Sample element keys:', Object.keys(corePayload[0]));
    console.log('Element 0 date:', corePayload[0].date);
    console.log('Element 0 summary:', corePayload[0].summary);
  } else {
    console.log('Payload summary:', corePayload.summary);
  }
}

testLiveUserQuery().catch(console.error);
