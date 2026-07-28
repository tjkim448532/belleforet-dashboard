async function testMatrixRange() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/dashboard/matrix-weekly for single day 2026-07-27...');
  const resSingle = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataSingle = resSingle.data || resSingle;
  const grandSingle = dataSingle.find(item => item.isGrandTotal);

  console.log('Single day GRAND_TOTAL:', {
    categoryName: grandSingle?.categoryName,
    todayActual: grandSingle?.todayActual,
    todayLy: grandSingle?.todayLy,
    mtdActual: grandSingle?.mtdActual,
    ytdActual: grandSingle?.ytdActual
  });

  console.log('\nTesting GET /api/v5/dashboard/matrix-weekly for period range 2026-07-01 ~ 2026-07-27...');
  const resRange = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataRange = resRange.data || resRange;
  const grandRange = dataRange.find(item => item.isGrandTotal);

  console.log('Range GRAND_TOTAL:', {
    categoryName: grandRange?.categoryName,
    todayActual: grandRange?.todayActual,
    todayLy: grandRange?.todayLy,
    mtdActual: grandRange?.mtdActual,
    ytdActual: grandRange?.ytdActual
  });
}

testMatrixRange().catch(console.error);
