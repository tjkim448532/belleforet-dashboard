const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

const regex = /const getTrevporValue = \([\s\S]*?\} else \{[\s\S]*?return availRooms > 0 \? Math\.round\(pureRev \/ availRooms\) : 0;\n    \}\n  \};/g;
const replaceWith = `const getTrevporValue = (itemNode: any, mode: 'TOTAL' | 'EX_GOLF') => {
    if (!itemNode) return null;
    if (mode === 'TOTAL') {
      return itemNode.trevporTotal !== undefined ? itemNode.trevporTotal : null;
    } else {
      return itemNode.trevporWithoutGolf !== undefined ? itemNode.trevporWithoutGolf : null;
    }
  };`;

code = code.replace(regex, replaceWith);

fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', code);
