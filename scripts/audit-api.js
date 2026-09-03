// scripts/audit-api.js
// Native fetch is available in Node 24

const API_BASE = process.env.VITE_API_BASE_URL || 'https://belleforet-data.vercel.app';
const ENDPOINTS = [
    { 
        url: `${API_BASE}/api/v6/dashboard/revenue-by-org?startDate=2026-09-01&endDate=2026-09-03`, 
        name: 'V6 대시보드 경영조직도 메인 API' 
    }
];

// 마스터에 정의된 표준 영업장 갯수
const MASTER_VENUE_COUNT = 38; 

async function runAudit() {
    console.log('단위 테스트 시작: 프론트엔드 API 전수 검사 (V6 공식 명세서 100% 준수)\n' + '-'.repeat(70));
    let hasError = false;

    for (const api of ENDPOINTS) {
        console.log(`[Testing] ${api.name}\nURL: ${api.url}`);
        try {
            // 프론트엔드 환경과 동일하게 인증 헤더 부여
            const res = await fetch(api.url, {
                headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
            });
            
            // 1. HTTP Status 검증
            if (!res.ok) {
                console.error(`  ❌ [FAIL] HTTP Status: ${res.status}`);
                hasError = true;
                continue;
            }
            
            const json = await res.json();
            
            // 응답 스키마 최상단 상태 코드 확인
            if (json.status !== 200 || json.message !== "SUCCESS") {
                console.error(`  ❌ [FAIL] API 응답 상태 코드가 200 SUCCESS가 아닙니다. 수신: ${json.status} ${json.message}`);
                hasError = true;
            }

            const data = json.data;
            if (!data) {
                console.error(`  ❌ [FAIL] data 객체가 응답에 존재하지 않습니다.`);
                hasError = true;
                continue;
            }

            // 2. 최상단 필수 키값 (SSOT 롤업) 검증
            if (typeof data.grandTotal !== 'number' || isNaN(data.grandTotal)) {
                console.error(`  ❌ [FAIL] 최상위 grandTotal(총합계) 필드가 없거나 숫자가 아닙니다.`);
                hasError = true;
            }
            
            if (!data.period || !data.period.startDate || !data.period.endDate) {
                console.error(`  ❌ [FAIL] period.startDate 또는 period.endDate 필드가 누락되었습니다.`);
                hasError = true;
            }

            // 3. 본부별 데이터 및 0원 영업장 누락/타입 검증
            let venueCount = 0;
            const divisions = data.divisions;
            
            if (!Array.isArray(divisions)) {
                console.error(`  ❌ [FAIL] divisions 배열이 존재하지 않습니다.`);
                hasError = true;
                continue;
            }

            divisions.forEach(div => {
                // 본부 소계 검증
                if (typeof div.subtotal !== 'number' || isNaN(div.subtotal)) {
                    console.error(`  ❌ [FAIL] ${div.orgDivision || '알수없는본부'}의 subtotal 값이 누락되었거나 숫자가 아닙니다.`);
                    hasError = true;
                }

                if (Array.isArray(div.venues)) {
                    div.venues.forEach(venue => {
                        venueCount++;
                        // 필드 검사
                        if (!venue.venueName || !venue.categoryCode || !venue.ticketGroup) {
                            console.error(`  ❌ [FAIL] 필수 텍스트 필드 누락 발생: ${JSON.stringify(venue)}`);
                            hasError = true;
                        }
                        // 금액 타입 엄격 검사
                        if (typeof venue.revenue !== 'number' || isNaN(venue.revenue)) {
                            console.error(`  ❌ [FAIL] 데이터 타입 오류: ${venue.venueName}의 revenue 값이 숫자가 아님`);
                            hasError = true;
                        }
                    });
                } else {
                    console.error(`  ❌ [FAIL] ${div.orgDivision} 하위에 venues 배열이 누락되었습니다.`);
                    hasError = true;
                }
            });

            // 4. 영업장 총 갯수 검증 (0원 스킵 버그 적발)
            // 명세서 상 "프론트엔드는 응답에 존재하는 데이터만 순회하며 렌더링하면 됩니다" 라고 명시되어 있으나,
            // 본 QA 스크립트는 백엔드가 강제로 0원 데이터를 누락시켰는지 검증하는 용도임
            if (venueCount < MASTER_VENUE_COUNT) {
                console.error(`  ❌ [FAIL] 영업장 누락 발생. 예상: ${MASTER_VENUE_COUNT}개, 실제 수신: ${venueCount}개 (0원 데이터 스킵 오류 또는 본부 누락 의심)`);
                hasError = true;
            } else if (venueCount > MASTER_VENUE_COUNT) {
                console.error(`  ❌ [FAIL] 유령 영업장 노출. 예상: ${MASTER_VENUE_COUNT}개, 실제 수신: ${venueCount}개 ('캔디피' 등 미분류 잔존 의심)`);
                hasError = true;
            } else {
                console.log(`  ✅ [PASS] 표준 영업장 ${MASTER_VENUE_COUNT}개 전수 수신 완료 (유령 데이터 없음)`);
            }

            if (!hasError) console.log(`  ✅ [PASS] 모든 검증 통과 (V6 공식 명세서 100% 일치)`);

        } catch (err) {
            console.error(`  ❌ [FAIL] Network/Parse Error: ${err.message}`);
            hasError = true;
        }
        console.log('-'.repeat(70));
    }

    if (hasError) {
        console.error('🚨 API 무결성 검증 실패. V6 명세서와 불일치하거나 데이터가 누락되었습니다.');
        process.exit(1);
    } else {
        console.log('✅ 전 구간 API 데이터 무결성 검증 완료.');
        process.exit(0);
    }
}

runAudit();
