const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

// 1. replace getTrevporValue exactly
const regexOldGetTrevparValue = /const getTrevporValue = \([\s\S]*?\} else \{[\s\S]*?return availRooms > 0 \? Math\.round\(pureRev \/ availRooms\) : 0;\n    \}\n  \};/;
const newGetTrevporValue = `const getTrevporValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF') => {
    if (!itemNode) return null;
    if (mode === 'TOTAL') {
      return itemNode.trevporTotal !== undefined ? itemNode.trevporTotal : null;
    } else {
      return itemNode.trevporWithoutGolf !== undefined ? itemNode.trevporWithoutGolf : null;
    }
  };`;
code = code.replace(regexOldGetTrevparValue, newGetTrevporValue);

// 2. Fix the growth tooltips in chart
const oldGrowthTooltip = `const growth = (tyTrevpar && lyTrevpar && lyTrevpar > 0) ? Number((((tyTrevpar - lyTrevpar) / lyTrevpar) * 100).toFixed(1)) : null;`;
const newGrowthTooltip = `const growth = metricMode === 'TOTAL' ? monthItem.growthTotalRate : monthItem.growthWithoutGolfRate;`;
code = code.replace(oldGrowthTooltip, newGrowthTooltip);

fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', code);
