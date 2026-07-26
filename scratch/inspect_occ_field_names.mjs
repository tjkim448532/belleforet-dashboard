async function inspectOccFieldNames() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Fetching revenue-summary for single day and range...');
  const resSingle = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  const resRange = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-26`, { headers }).then(r => r.json());

  console.log('\n=== Single Day Payload Keys ===');
  const singlePayload = resSingle.data || resSingle;
  console.log('Keys:', Object.keys(singlePayload));
  console.log('Summary:', singlePayload.summary);

  console.log('\n=== Period Range Payload ===');
  const rangePayload = resRange.data || resRange;
  if (Array.isArray(rangePayload)) {
    console.log('Array length:', rangePayload.length);
    console.log('First item summary:', rangePayload[0].summary);
  } else {
    console.log('Keys:', Object.keys(rangePayload));
    console.log('Summary:', rangePayload.summary);
  }
}

inspectOccFieldNames().catch(console.error);
