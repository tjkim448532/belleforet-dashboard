async function testPieGrouping() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27`, { headers }).then(r => r.json());
  const data = res.data || res;

  const getHqName = (item) => {
    const code = String(item.categoryCode || item.category_code || item.category || '').toUpperCase();
    const rawName = String(item.categoryName || item.category_name || item.categoryCode || '').trim();

    if (code === 'ROOM' || code === '객실' || rawName.includes('콘도') || rawName.includes('객실')) return '콘도본부';
    if (code === 'GOLF' || code === '골프' || rawName.includes('골프')) return '골프본부';
    if (code === 'FNB' || code === '식음' || rawName.includes('식음') || rawName.includes('F&B')) return 'F&B본부';
    if (code === 'TICKET' || code === '티켓' || code === 'LEISURE' || rawName.includes('레저') || rawName.includes('티켓')) return '레저본부';
    if (code === 'MOTO' || rawName.includes('모토')) return '모토아레나';
    if (code === 'GOODS' || rawName.includes('굿즈')) return '벨포레굿즈';
    if (code === 'PARKING' || rawName.includes('주차')) return '주차관제';
    if (code === 'PROMOTION' || rawName.includes('기획전')) return '기획전';
    if (code === 'UNEARNED' || rawName.includes('미사용')) return '미사용 티켓';
    return '기타업장';
  };

  const hqMap = {};
  (data.salesByCategory || []).forEach(item => {
    const hqName = getHqName(item);
    const value = Number(item.todayActual || item.totalSales || item.sales || item.revenue || 0);
    if (value > 0) {
      hqMap[hqName] = (hqMap[hqName] || 0) + value;
    }
  });

  const pieData = Object.entries(hqMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  console.log('Grouped Pure HQ Pie Data:', pieData);
}

testPieGrouping().catch(console.error);
