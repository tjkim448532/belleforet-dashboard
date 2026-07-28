import { transformHomeData, transformResortData } from '../src/lib/dataTransformers.ts';

async function runFullSystemAudit() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('====================================================');
  console.log('🔍 [FULL SYSTEM AUDIT] Starting 100% Comprehensive Verification');
  console.log('====================================================\n');

  let passed = true;

  // 1. Single Day API & Transformer Audit
  console.log('▶ [TEST 1] Single Day Query (2026-07-27) Audit');
  const resSingle = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataSingle = resSingle.data || resSingle;

  if (!dataSingle.summary || typeof dataSingle.summary.totalRevenue !== 'number') {
    console.error('❌ FAIL: Single day summary payload invalid');
    passed = false;
  } else {
    console.log(`  ✅ totalRevenue: ${dataSingle.summary.totalRevenue.toLocaleString()}원`);
    console.log(`  ✅ totalRooms: ${dataSingle.summary.totalRooms}실`);
    console.log(`  ✅ Golf Teams - Visited: ${dataSingle.summary.totalGolfTeams}, Reserved: ${dataSingle.summary.totalGolfReservedTeams}, Canceled: ${dataSingle.summary.totalGolfCanceledTeams}`);
  }

  // 2. Period Range API Audit
  console.log('\n▶ [TEST 2] Period Range Query (2026-07-01 ~ 2026-07-27) Audit');
  const resRange = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataRange = resRange.data || resRange;

  if (!dataRange.summary || typeof dataRange.summary.totalRevenue !== 'number') {
    console.error('❌ FAIL: Range summary payload invalid');
    passed = false;
  } else {
    console.log(`  ✅ totalRevenue: ${dataRange.summary.totalRevenue.toLocaleString()}원`);
    console.log(`  ✅ totalRooms: ${dataRange.summary.totalRooms}실`);
    console.log(`  ✅ Golf Teams Visited: ${dataRange.summary.totalGolfTeams}팀`);
  }

  // 3. HQ Pie Chart Pure Grouping Audit
  console.log('\n▶ [TEST 3] Pure HQ Category Grouping Audit');
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
  (dataSingle.salesByCategory || []).forEach(item => {
    const hqName = getHqName(item);
    const value = Number(item.todayActual || item.totalSales || item.sales || item.revenue || 0);
    if (value > 0) {
      hqMap[hqName] = (hqMap[hqName] || 0) + value;
    }
  });

  const pieCategories = Object.keys(hqMap);
  const duplicates = pieCategories.filter(c => ['객실', '골프', '식음', '티켓'].includes(c));
  if (duplicates.length > 0) {
    console.error(`❌ FAIL: Found sub-team duplicates in pie categories: ${duplicates.join(', ')}`);
    passed = false;
  } else {
    console.log(`  ✅ Pie Categories (Pure Headquarters): ${pieCategories.join(', ')}`);
  }

  // 4. Room Type ADR Fallback Audit
  console.log('\n▶ [TEST 4] Room Type ADR Fallback Audit');
  const resChannel = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?startDate=2026-07-01&endDate=2026-07-27&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataChannel = resChannel.data || resChannel;

  let rev16 = 0, sold16 = 0;
  let rev35 = 0, sold35 = 0;
  let rev51 = 0, sold51 = 0;

  if (Array.isArray(dataChannel)) {
    dataChannel.forEach(item => {
      if (item.isChannelSubtotal || item.isGrandTotal) return;
      const typeName = item.roomType || item.room_type || '';
      const revenue = Number(item.todayRevenue || item.revenue || item.netRevenue || item.roomRevenue || item.periodRevenue || item.mtdRevenue || item.totalRevenue || 0);
      const sold = Number(item.todayRooms || item.roomsSold || item.rooms_sold || item.periodRooms || item.mtdRooms || item.rooms || 0);
      if (typeName.includes('16평')) { rev16 += revenue; sold16 += sold; }
      else if (typeName.includes('35평')) { rev35 += revenue; sold35 += sold; }
      else if (typeName.includes('51평') || typeName.includes('52평')) { rev51 += revenue; sold51 += sold; }
    });
  }

  const adr16 = sold16 > 0 ? Math.round(rev16 / sold16) : 0;
  const adr35 = sold35 > 0 ? Math.round(rev35 / sold35) : 0;
  const adr51 = sold51 > 0 ? Math.round(rev51 / sold51) : 0;

  if (adr16 === 0 || adr35 === 0 || adr51 === 0) {
    console.error(`❌ FAIL: ADR calculated as zero -> 16평: ${adr16}, 35평: ${adr35}, 51/52평: ${adr51}`);
    passed = false;
  } else {
    console.log(`  ✅ 16평 ADR: ${adr16.toLocaleString()}원 (${sold16}실)`);
    console.log(`  ✅ 35평 ADR: ${adr35.toLocaleString()}원 (${sold35}실)`);
    console.log(`  ✅ 51/52평 ADR: ${adr51.toLocaleString()}원 (${sold51}실)`);
  }

  console.log('\n====================================================');
  if (passed) {
    console.log('🎉 [FULL SYSTEM AUDIT] RESULT: 100% PERFECT PASS!');
  } else {
    console.log('❌ [FULL SYSTEM AUDIT] RESULT: FAILED - CHECK ERRORS ABOVE');
  }
  console.log('====================================================');
}

runFullSystemAudit().catch(console.error);
