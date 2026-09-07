const fs = require('fs');
const file = 'src/pages/Home.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('주요 레저/어트랙션 티켓 판매건수', '주요 레저/어트랙션 이용객 수');
content = content.replace(/>건<\/span>/g, '>명</span>');

fs.writeFileSync(file, content, 'utf8');