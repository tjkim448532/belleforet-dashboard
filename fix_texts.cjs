const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

// 1. Chart tooltip
code = code.replace(/TrevPAR \$\{isOngoingMonth/g, 'TrevPOR ${isOngoingMonth');
code = code.replace(/175실 기준/g, '판매객실 기준 (SSOT)');

// 2. Y-axis label
code = code.replace(/name: '객실당 총매출 \(TrevPAR\)',/g, "name: '판매객실당 총매출 (TrevPOR)',");

// 3. KPI Highlights
code = code.replace(/2026년 평균 TrevPAR/g, '2026년 평균 TrevPOR');

// 4. Infrastructure badge
code = code.replace(/175실 <span className="text-xs font-normal text-slate-500">\(일평균 총자산 잣대\)<\/span>/g, '판매객실 <span className="text-xs font-normal text-slate-500">(실측 투숙객 기준)</span>');

// 5. Help box description
code = code.replace(/💡 객실당 총매출 \(TrevPAR: Total Revenue Per Available Room\)이란\?/g, '💡 판매객실당 총매출 (TrevPOR: Total Revenue Per Occupied Room)이란?');
code = code.replace(/특정 월의 투숙률 편차에 구애받지 않고, 벨포레의 <strong>전체 보유 객실\(175실\) 인프라 1실이 벌어들인 월평균 총매출<\/strong>입니다\. 리조트 전체 자산의 실질 생산성을 12개월 동일 잣대\(Apple-to-Apple\)로 전년 대비 성장률을 분석합니다\./g, '백엔드 마트(SSOT)가 1원 단위로 정제한 공식 지표로, <strong>해당 월에 실제 판매된 객실 1실당 창출한 리조트 전체 총매출</strong>입니다. 프론트엔드의 가상 연산 없이 순수 백엔드 완제품을 직결하여 무결성을 보장합니다.');

// 6. Loading text
code = code.replace(/12개월 월별 객실당 총매출\(TrevPAR\) 지표를 집계하고 있습니다\.\.\./g, '12개월 월별 판매객실당 총매출(TrevPOR) 지표를 집계하고 있습니다...');

// 7. Right top badge on chart
code = code.replace(/175실 인프라 고정 기준/g, 'SSOT 실측 객실 기준');

// 8. Bottom chart title
code = code.replace(/월별 TrevPAR 부문 기여도/g, '월별 TrevPOR 부문 기여도');

// 9. Comments
code = code.replace(/12개월 전년 vs 올해 TrevPAR 성장 트렌드/g, '12개월 전년 vs 올해 TrevPOR 성장 트렌드');

fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', code);
