const fs = require('fs');
let code = fs.readFileSync('src/lib/secureFetcher.ts', 'utf8');

const oldRegexBlock = `            // 금액/지표 관련 필드명 매칭
            if (key.match(/(revenue|actual|ly|growth|diff|amount|fee|ratio|trevpar|occ|rooms|gross)/i) && !key.toLowerCase().includes('date')) {
                if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(\`[Type Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' MUST be a strict Number. Received: \${value === null ? 'null' : typeof value} ('\${value}')\`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(\`[NaN Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' is NaN.\`);
                }
            }`;

const newRegexBlock = `            // 금액/지표 관련 필드명 매칭
            if (key.match(/(revenue|actual|ly|growth|diff|amount|fee|ratio|trevpar|occ|rooms|gross)/i) && !key.toLowerCase().includes('date')) {
                if (typeof value === 'object' && value !== null) {
                    // 객체나 배열인 경우 구조적 노드이므로 숫자 타입 강제 예외 처리 (하위 탐색으로 위임)
                } else if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(\`[Type Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' MUST be a strict Number. Received: \${value === null ? 'null' : typeof value} ('\${value}')\`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(\`[NaN Error] 📍 \${currentVenue || 'Unknown'} ➔ Field '\${key}' is NaN.\`);
                }
            }`;

code = code.replace(oldRegexBlock, newRegexBlock);

fs.writeFileSync('src/lib/secureFetcher.ts', code);
