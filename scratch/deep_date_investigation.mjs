async function deepInvestigateAPIDates() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('====================================================');
  console.log('1. TEST API: GET /api/v5/report/room-channel-sales');
  console.log('====================================================');

  // Test A: Single day date=2026-07-24
  const res1A = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?date=2026-07-24`, { headers }).then(r => r.json());
  console.log('--- Test 1A (date=2026-07-24) ---');
  console.log('TargetDate/isRangeQuery:', res1A.targetDate, res1A.isRangeQuery);
  const gt1A = (res1A.data || res1A).find((r) => r.isGrandTotal || r.segmentName === '전체 합계');
  console.log('GrandTotal 1A:', gt1A);

  // Test B: 2-day period range (startDate=2026-07-23&endDate=2026-07-24)
  const res1B = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('--- Test 1B (startDate=2026-07-23&endDate=2026-07-24) ---');
  console.log('TargetDate/isRangeQuery:', res1B.targetDate, res1B.isRangeQuery);
  const gt1B = (res1B.data || res1B).find((r) => r.isGrandTotal || r.segmentName === '전체 합계');
  console.log('GrandTotal 1B:', gt1B);

  // Test C: MTD period range (startDate=2026-07-01&endDate=2026-07-24)
  const res1C = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?startDate=2026-07-01&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('--- Test 1C (startDate=2026-07-01&endDate=2026-07-24) ---');
  console.log('GrandTotal 1C:', (res1C.data || res1C).find((r) => r.isGrandTotal || r.segmentName === '전체 합계'));

  console.log('\n====================================================');
  console.log('2. TEST API: GET /api/v5/dashboard/revenue-summary');
  console.log('====================================================');

  const res2A = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=2026-07-24`, { headers }).then(r => r.json());
  console.log('Summary 2A (date=2026-07-24):', res2A.data?.summary || res2A.summary);
  console.log('SalesByCategory 2A:', res2A.data?.salesByCategory || res2A.salesByCategory);

  const res2B = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=2026-07-23&endDate=2026-07-24`, { headers }).then(r => r.json());
  console.log('Summary 2B (startDate=2026-07-23&endDate=2026-07-24):', res2B.data?.summary || res2B.summary);
  console.log('SalesByCategory 2B:', res2B.data?.salesByCategory || res2B.salesByCategory);
}

deepInvestigateAPIDates().catch(console.error);
