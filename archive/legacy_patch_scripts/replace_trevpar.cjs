const fs = require('fs');
const path = 'src/components/dashboard/MonthlyTrevporChart.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Text Replacements
code = code.replace(/판매객실당 총매출 \(TrevPOR\)/g, '가용객실당 총매출 (TrevPAR)');
code = code.replace(/판매객실당 총매출\(TrevPOR\)/g, '가용객실당 총매출(TrevPAR)');
code = code.replace(/판매된 객실 1실당 창출한 리조트 전체 총매출입니다./g, '물리적 전체 가용 객실 1실당 창출한 리조트 전체 총매출입니다.');
code = code.replace(/2025년 판매객실/g, '2025년 가용객실');
code = code.replace(/2026년 판매객실/g, '2026년 가용객실');
code = code.replace(/TrevPOR/g, 'TrevPAR');
code = code.replace(/trevpor/g, 'trevpar');
code = code.replace(/판매객실 기준/g, '가용객실 기준');

// 2. Data binding replacements
// itemNode.trevporTotal -> itemNode.trevPar
// itemNode.trevporWithoutGolf -> itemNode.trevParWithoutGolf
code = code.replace(/itemNode\.trevporTotal/g, 'itemNode.trevPar');
code = code.replace(/itemNode\.trevporWithoutGolf/g, 'itemNode.trevParWithoutGolf');
code = code.replace(/item\.ly\?\.roomsSold/g, 'item.ly?.availableRooms');
code = code.replace(/item\.ty\.roomsSold/g, 'item.ty.availableRooms');

fs.writeFileSync(path, code);
console.log('Replacements applied');
