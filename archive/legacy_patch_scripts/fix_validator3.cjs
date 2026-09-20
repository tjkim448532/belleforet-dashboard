const fs = require('fs');
let code = fs.readFileSync('src/lib/secureFetcher.ts', 'utf8');

const scanNodeBlock = `    const scanNode = (node: any, path: string, venueContext: string) => {
        if (!node || typeof node !== 'object') return;
        
        // 에러 식별자 추적 (venue_name 우선 탐색)
        const currentVenue = node.venue_name || node.shopName || node.team_name || node.teamName || venueContext;
        
        for (const key in node) {
            const value = node[key];
            
            // 금액/지표 관련 필드명 매칭
            if (key.match(/(revenue|actual|ly|growth|diff|amount|fee|ratio|trevpar|occ|rooms|gross)/i) && !key.toLowerCase().includes('date')) {
                if (typeof value === 'object' && value !== null) {
                    // 객체나 배열인 경우 구조적 노드이므로 Number 강제검사 스킵
                } else if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(\`[Type Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' MUST be a strict Number. Received: \${value === null ? 'null' : typeof value} ('\${value}')\`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(\`[NaN Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' is NaN.\`);
                }
            }
            
            if (typeof value === 'object' && value !== null) {
                scanNode(value, \`\${path}.\${key}\`, currentVenue);
            }
        }
    };`;

code = code.replace(/const scanNode = \([\s\S]*?\};/, scanNodeBlock);

fs.writeFileSync('src/lib/secureFetcher.ts', code);
