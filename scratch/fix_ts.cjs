const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/Home.tsx');
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `{dynamicHqToday.map((entry, index) => (`,
  `{dynamicHqToday.map((_, index) => (`
);

content = content.replace(
  `formatter={(value) => formatCurrency(value)}`,
  `formatter={(value: any) => formatCurrency(Number(value))}`
);

fs.writeFileSync(file, content);
console.log('Fixed TS errors in Home.tsx');
