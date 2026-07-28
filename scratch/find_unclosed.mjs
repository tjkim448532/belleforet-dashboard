import fs from 'fs';

const content = fs.readFileSync('e:/앱/belleforet-dashboard/src/pages/Home.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
let openParens = 0;

lines.forEach((line, index) => {
  for (const char of line) {
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
  }
  if (openBraces < 0 || openParens < 0) {
    console.log(`Line ${index + 1}: Negative balance! Braces: ${openBraces}, Parens: ${openParens} | Content: ${line.trim()}`);
  }
});

console.log(`Final balance -> Braces: ${openBraces}, Parens: ${openParens}`);
