async function inspectVercelAdminMapping() {
  const targetUrl = 'https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping';
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };

  console.log('====================================================');
  console.log(`📡 [Vercel 백엔드 URL 검사] ${targetUrl}`);
  console.log('====================================================\n');

  try {
    const res = await fetch(targetUrl, { headers });
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);

    const text = await res.text();
    console.log(`Response length: ${text.length} bytes`);
    console.log('\n--- First 500 characters of response ---');
    console.log(text.substring(0, 500));
    console.log('----------------------------------------');

    // Also test API endpoints if HTML page
    const apiUrl1 = 'https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT';
    console.log(`\nTesting Vercel API endpoint: ${apiUrl1}`);
    const apiRes1 = await fetch(apiUrl1, { headers });
    console.log(`API Status: ${apiRes1.status}`);
    const apiText1 = await apiRes1.text();
    console.log(`API response preview: ${apiText1.substring(0, 300)}`);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

inspectVercelAdminMapping();
