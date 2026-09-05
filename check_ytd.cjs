const https = require('https');
https.get('https://belleforet-data.vercel.app/api/v6/dashboard/revenue-by-org?startDate=2026-09-02&endDate=2026-09-02', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('Grand Total YTD Actual:', j.data.grandTotal.ytdActual.toLocaleString());
      console.log('Grand Total YTD LY:', j.data.grandTotal.ytdLy.toLocaleString());
      j.data.divisions.forEach(d => {
        console.log(`[${d.orgDivision}] YTD Actual: ${d.divisionSubtotal.ytdActual.toLocaleString()} | YTD LY: ${d.divisionSubtotal.ytdLy.toLocaleString()}`);
      });
    } catch(e) {}
  });
});
