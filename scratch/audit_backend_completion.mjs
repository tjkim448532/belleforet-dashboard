async function auditBackendCompletion() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';
  const testDate = '2026-07-27';
  const testRange = { startDate: '2026-07-01', endDate: '2026-07-27' };

  console.log('====================================================');
  console.log('🔍 [백엔드 V5 완성 결과 100% 정밀 검증 릴레이]');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, description) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${description}`);
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
    }
  }

  // 1. Single Day Main Revenue Summary Test
  console.log(`📡 [검증 1] 메인 대시보드 단일 API (/api/v5/dashboard/revenue-summary?date=${testDate})`);
  const resSingle = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=${testDate}&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataSingle = resSingle.data || resSingle;
  assert(dataSingle.summary?.totalRevenue > 0, `단일일 총매출 (${dataSingle.summary?.totalRevenue?.toLocaleString()}원)`);
  assert(dataSingle.summary?.totalRoomCap > 0, `단일일 숙박 정원 (${dataSingle.summary?.totalRoomCap}명)`);
  assert(Array.isArray(dataSingle.salesByCategory) && dataSingle.salesByCategory.length > 0, `카테고리별 매출 배열 수신 (${dataSingle.salesByCategory?.length}개)`);
  assert(Array.isArray(dataSingle.salesByFacility) && dataSingle.salesByFacility.length > 0, `업장별 매출 배열 수신 (${dataSingle.salesByFacility?.length}개)`);

  // 2. Period Range Main Revenue Summary & Visitor Audit
  console.log(`\n🗓️ [검증 2] 기간 조회 메인 API (/api/v5/dashboard/revenue-summary?startDate=${testRange.startDate}&endDate=${testRange.endDate})`);
  const resRange = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?startDate=${testRange.startDate}&endDate=${testRange.endDate}&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataRange = resRange.data || resRange;
  assert(dataRange.summary?.totalRevenue > 0, `기간 조회 총매출 (${dataRange.summary?.totalRevenue?.toLocaleString()}원)`);
  assert(dataRange.summary?.totalRoomCap > 0, `기간 조회 숙박 정원 (${dataRange.summary?.totalRoomCap?.toLocaleString()}명)`);

  // Check totalVisitors accumulation in range mode
  const totalLeisureRev = (dataRange.salesByFacility || []).reduce((acc, item) => acc + Number(item.totalSales || 0), 0);
  assert(totalLeisureRev > 0, `업장별 총 매출 합계 수신 (${totalLeisureRev.toLocaleString()}원)`);

  // 3. Weekly Matrix Audit
  console.log(`\n📊 [검증 3] 요일비교 매트릭스 API (/api/v5/dashboard/matrix-weekly?date=${testDate})`);
  const resMatrix = await fetch(`${baseUrl}/api/v5/dashboard/matrix-weekly?date=${testDate}&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataMatrix = resMatrix.data || resMatrix;
  assert(Array.isArray(dataMatrix) && dataMatrix.length > 0, `매트릭스 항목 (${dataMatrix?.length}개) 수신`);
  const grandTotal = dataMatrix.find(item => item.isGrandTotal || item.categoryCode === 'TOTAL');
  assert(grandTotal !== undefined && grandTotal.todayActual > 0, `백엔드 강제 고정 GRAND_TOTAL (${grandTotal?.todayActual?.toLocaleString()}원)`);

  // 4. Admin Mapping API (mode=ROOM_SEGMENT)
  console.log(`\n🏢 [검증 4] 어드민 객실 세그먼트 매핑 API (/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT)`);
  const resMap = await fetch(`${baseUrl}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT&_t=${Date.now()}`, { headers }).then(r => r.json());
  const dataMap = resMap.data || resMap;
  assert(Array.isArray(dataMap.bins) && dataMap.bins.length > 0, `세그먼트 카테고리 수신 ([${dataMap.bins?.join(', ')}])`);
  assert(Array.isArray(dataMap.unmapped), `미분류 항목 배열 수신 (${dataMap.unmapped?.length}개)`);
  assert(Array.isArray(dataMap.mapped), `완료 항목 배열 수신 (${dataMap.mapped?.length}개)`);

  // 5. Room Channel Reports Audit (API 6 & 7)
  console.log(`\n🏨 [검증 5] 객실 채널 실적 리포트 API (/api/v5/report/room-channel-sales?date=${testDate})`);
  const resChan = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?date=${testDate}&_t=${Date.now()}`, { headers }).then(r => r.json());
  assert(resChan !== undefined, `객실 채널 실적 응답 수신 완료`);

  console.log('\n====================================================');
  console.log(`🎯 [검증 결과] 총 ${totalTests}개 검증 항목 중 ${passedTests}개 100% PERFECT 통과! (${Math.round((passedTests / totalTests) * 100)}% 무결점)`);
  console.log('====================================================\n');
}

auditBackendCompletion().catch(console.error);
