const https = require('https');
const apis = [
  { name: 'Overview', url: 'https://belleforet-data.vercel.app/api/v6/dashboard/overview?date=2026-09-02' },
  { name: 'Matrix', url: 'https://belleforet-data.vercel.app/api/v6/dashboard/revenue-by-org?startDate=2026-09-02&endDate=2026-09-02' },
  { name: 'Efficiency', url: 'https://belleforet-data.vercel.app/api/v6/report/monthly-room-efficiency?date=2026-09-02' }
];

apis.forEach(api => {
  https.get(api.url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`[${api.name}] Status: ${res.statusCode}`);
        if(api.name === 'Overview') console.log('Overview Summary keys:', Object.keys(json.summary).join(', '));
      } catch(e) { console.log(`[${api.name}] JSON Parse Error`); }
    });
  });
});
