const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

// 1. getTrevparValue 함수를 getTrevporValue로 교체 및 프론트엔드 계산 룰 삭제
const regexGetTrevpar = /const getTrevparValue = \([\s\S]*?\} else \{[\s\S]*?return availRooms > 0 \? Math\.round\(pureRev \/ availRooms\) : 0;\n    \}\n  \};/g;
code = code.replace(regexGetTrevpar, `const getTrevporValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF') => {
    if (!itemNode) return null;
    if (mode === 'TOTAL') {
      return itemNode.trevporTotal !== undefined ? itemNode.trevporTotal : null;
    } else {
      return itemNode.trevporWithoutGolf !== undefined ? itemNode.trevporWithoutGolf : null;
    }
  };`);

// 2. tyTrevpar, lyTrevpar 변수 할당 교체
code = code.replace(/getTrevparValue\(([^,]+),\s*([^,]+),\s*[^,]+,\s*[^)]+\)/g, 'getTrevporValue($1, $2)');
code = code.replace(/getTrevparValue/g, 'getTrevporValue');

// 3. diffAmount와 growthRate 계산 로직을 백엔드 필드 직접 참조로 교체
const regexDiffGrowthTable = /const diffAmount = \([\s\S]*?\n\s*const growthRate = \([\s\S]*?toFixed\(1\)\) : null;/;
code = code.replace(regexDiffGrowthTable, `// 백엔드 완제품 필드 직접 바인딩 (Zero-Proxy)
                    const diffAmount = metricMode === 'TOTAL' ? item.diffTotalAmount : item.diffWithoutGolfAmount;
                    const growthRate = metricMode === 'TOTAL' ? item.growthTotalRate : item.growthWithoutGolfRate;`);

fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', code);
