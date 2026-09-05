const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

// 1. getTrevparValue 함수를 getTrevporValue로 교체 및 프론트엔드 계산 룰 삭제
const oldGetTrevparValue = `  // Helper to extract exact TrevPAR (Total Revenue per Available 175 Rooms)
  const getTrevparValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF', year: number, month: number) => {
    if (!itemNode) return null;
    const days = getDaysInMonth(year, month);
    const availRooms = itemNode.availableRooms || (175 * days);
    
    if (mode === 'TOTAL') {
      if (itemNode.trevparTotal !== undefined && itemNode.trevparTotal !== null) return itemNode.trevparTotal;
      return availRooms > 0 ? Math.round(Number(itemNode.totalRevenue || 0) / availRooms) : 0;
    } else {
      if (itemNode.trevparWithoutGolf !== undefined && itemNode.trevparWithoutGolf !== null) return itemNode.trevparWithoutGolf;
      const pureRev = Number(itemNode.netRevenueWithoutGolf ?? (Number(itemNode.totalRevenue || 0) - Number(itemNode.golfRevenue || 0)));
      return availRooms > 0 ? Math.round(pureRev / availRooms) : 0;
    }
  };`;

const newGetTrevporValue = `  // SSOT 1:1 완제품 바인딩 (Zero-Proxy 원칙에 따라 프론트엔드 자체 연산 전면 철폐)
  const getTrevporValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF') => {
    if (!itemNode) return null;
    if (mode === 'TOTAL') {
      return itemNode.trevporTotal !== undefined ? itemNode.trevporTotal : null;
    } else {
      return itemNode.trevporWithoutGolf !== undefined ? itemNode.trevporWithoutGolf : null;
    }
  };`;

code = code.replace(oldGetTrevparValue, newGetTrevporValue);

// 2. tyTrevpar, lyTrevpar 변수 할당 교체
code = code.replace(/const tyTrevpar = getTrevparValue\(ty, metricMode, ty\.year, ty\.month\);/g, "const tyTrevpar = getTrevporValue(ty, metricMode);");
code = code.replace(/const lyTrevpar = getTrevparValue\(ly, metricMode, ly\.year, ly\.month\);/g, "const lyTrevpar = getTrevporValue(ly, metricMode);");
code = code.replace(/const tyTrevpar = getTrevparValue\(item\.ty, metricMode, data\.baseYear, item\.month\);/g, "const tyTrevpar = getTrevporValue(item.ty, metricMode);");
code = code.replace(/const lyTrevpar = getTrevparValue\(item\.ly, metricMode, data\.compareYear, item\.month\);/g, "const lyTrevpar = getTrevporValue(item.ly, metricMode);");

// 3. diffAmount와 growthRate 계산 로직을 백엔드 필드 직접 참조로 교체
const oldDiffGrowth = `                    const diffAmount = (tyTrevpar !== null && lyTrevpar !== null) ? (tyTrevpar - lyTrevpar) : null;
                    const growthRate = (tyTrevpar !== null && lyTrevpar !== null && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;`;

const newDiffGrowth = `                    // 백엔드 완제품 필드 직접 바인딩 (Zero-Proxy)
                    const diffAmount = metricMode === 'TOTAL' ? item.diffTotalAmount : item.diffWithoutGolfAmount;
                    const growthRate = metricMode === 'TOTAL' ? item.growthTotalRate : item.growthWithoutGolfRate;`;

code = code.replace(oldDiffGrowth, newDiffGrowth);

// 4. 차트 시리즈 렌더링 시에도 백엔드 필드 참조
const oldChartData = `      const tyT = getTrevparValue(ty, metricMode, data.baseYear, d.month);
      const lyT = getTrevparValue(ly, metricMode, data.compareYear, d.month);
      
      tyValues.push(tyT !== null ? tyT : 0);
      lyValues.push(lyT !== null ? lyT : 0);

      if (tyT !== null && lyT !== null && lyT > 0) {
        growthRates.push(Number((((tyT - lyT) / lyT) * 100).toFixed(1)));
      } else {
        growthRates.push(null);
      }`;

const newChartData = `      const tyT = getTrevporValue(ty, metricMode);
      const lyT = getTrevporValue(ly, metricMode);
      
      tyValues.push(tyT !== null ? tyT : 0);
      lyValues.push(lyT !== null ? lyT : 0);

      // 백엔드가 제공한 증감률 완제품을 직접 사용
      growthRates.push(metricMode === 'TOTAL' ? d.growthTotalRate : d.growthWithoutGolfRate);`;

code = code.replace(oldChartData, newChartData);

// 5. 텍스트 라벨 (TrevPAR -> TrevPOR) 및 가이드 문구 수정
code = code.replace(/객실당 총매출 \(TrevPAR\) 월별 전년 vs 올해 비교 분석/g, "판매객실당 총매출 (TrevPOR) 월별 전년 vs 올해 비교 분석");
code = code.replace(/175실 고정 인프라 기준/g, "SSOT 완제품 바인딩 (Zero-Proxy)");
code = code.replace(/상단 주요 지표와 100% 동일한 기준 \(리조트 총매출 ÷ 전체 175실\)/g, "프론트엔드 임의 연산을 배제하고 백엔드가 응답한 완제품(TrevPOR) 지표 그대로를 출력합니다.");
code = code.replace(/2025년 TrevPAR/g, "2025년 TrevPOR");
code = code.replace(/2026년 TrevPAR/g, "2026년 TrevPOR");
code = code.replace(/12개월 TrevPAR 성장 트렌드/g, "12개월 TrevPOR 성장 트렌드");

fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', code);
