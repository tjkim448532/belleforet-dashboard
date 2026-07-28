import fs from 'fs';

const content = fs.readFileSync('e:/앱/belleforet-dashboard/src/pages/Home.tsx', 'utf8');
const lines = content.split('\n');

let braceStack = [];
let parenStack = [];

lines.forEach((line, index) => {
  const lineNo = index + 1;
  for (let col = 0; col < line.length; col++) {
    const char = line[col];
    if (char === '{') braceStack.push(lineNo);
    if (char === '}') braceStack.pop();
    if (char === '(') parenStack.push(lineNo);
    if (char === ')') parenStack.pop();
  }
});

console.log('Unclosed braces opened at lines:', braceStack);
console.log('Unclosed parens opened at lines:', parenStack);
