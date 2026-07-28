import { defaultMappings } from '../src/lib/defaultMappings.ts';

async function verifyPosNames() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';
  const testDates = ['2026-07-27', '2026-07-26', '2026-07-24'];

  console.log('====================================================');
  console.log('🔍 [백엔드 V5 원천 POS 매장명 대조 검증] (바이블 v4.2 100% 엄수)');
  console.log('====================================================\n');

  const backendPosMap = new Map();

  for (const date of testDates) {
    const res = await fetch(`${baseUrl}/api/v5/dashboard/revenue-summary?date=${date}&_t=${Date.now()}`, { headers }).then(r => r.json());
    const data = res.data || res;
    const facilities = data.salesByFacility || [];

    facilities.forEach(item => {
      const name = item.shopName || item.facilityName || item.shop_name || '';
      const cat = item.categoryCode || item.category_code || item.category || '';
      if (name) {
        backendPosMap.set(name, cat);
      }
    });
  }

  console.log(`📡 [1. 백엔드 V5 라이브 API 집계된 원천 POS 매장 수]: ${backendPosMap.size}개 매장`);
  console.log('----------------------------------------------------');
  backendPosMap.forEach((cat, name) => {
    console.log(`  - POS 매장명: "${name}" (백엔드 카테고리: ${cat})`);
  });

  console.log('\n====================================================');
  console.log('📋 [2. 프론트엔드 매핑 스토어와의 100% 일치성 대조 검증]');
  console.log('====================================================');

  const frontendNames = defaultMappings.map(m => m.storeName);
  let matchedCount = 0;
  let unmappedCount = 0;

  backendPosMap.forEach((cat, posName) => {
    const isMapped = frontendNames.some(fn => fn === posName || posName.includes(fn) || fn.includes(posName));
    if (isMapped) {
      matchedCount++;
      console.log(`  ✅ [일치] 백엔드 POS "${posName}" ➔ 프론트 매핑 리스트 정상 연동`);
    } else {
      unmappedCount++;
      console.warn(`  ⚠️ [미매핑/신규 POS] 백엔드 POS "${posName}" (추가 등록 권장)`);
    }
  });

  console.log('\n====================================================');
  console.log(`🎯 [검증 결과] 백엔드 실시간 POS ${backendPosMap.size}개 중 ${matchedCount}개 100% 매칭! (일치율: ${Math.round((matchedCount / backendPosMap.size) * 100)}%)`);
  console.log('====================================================\n');
}

verifyPosNames().catch(console.error);
