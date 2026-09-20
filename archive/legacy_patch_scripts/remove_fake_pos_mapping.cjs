const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', 'utf8');

const startMarker = '          {/* 🏷️ 매출 비중 6대 부문별 소속 영업장(POS 매장) 전수 안내 가이드 (맨 밑 전수 열거) */}';
const endMarker = '          </div>'; // We need to be careful with endMarker to slice out precisely this div

const lines = code.split('\n');
let startIndex = -1;
let endIndex = -1;
let divDepth = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('매출 비중 6대 부문별 소속 영업장(POS 매장) 전수 안내 가이드 (맨 밑 전수 열거)')) {
    startIndex = i;
    divDepth = 0; // We assume the next line starts the main div
    continue;
  }
  
  if (startIndex !== -1) {
    if (lines[i].includes('<div')) {
      const matches = lines[i].match(/<div/g);
      divDepth += matches ? matches.length : 0;
    }
    if (lines[i].includes('</div')) {
      const matches = lines[i].match(/<\/div/g);
      divDepth -= matches ? matches.length : 0;
    }
    
    if (divDepth === 0 && lines[i].includes('</div>')) {
      endIndex = i;
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  // Replace the block with an empty string or a simple comment
  lines.splice(startIndex, (endIndex - startIndex) + 1, 
    '          {/* [Zero-Proxy 핫픽스] 프론트엔드 단의 하드코딩된 거짓 매핑 테이블(POS 기준표) 삭제됨. Admin API 실시간 바인딩 작업 예정. */}'
  );
  fs.writeFileSync('src/components/dashboard/MonthlyTrevporChart.tsx', lines.join('\n'));
  console.log('Successfully removed the hardcoded POS mapping block.');
} else {
  console.log('Failed to find block boundaries. Start:', startIndex, 'End:', endIndex);
}
