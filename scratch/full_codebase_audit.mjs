import fs from 'fs';
import path from 'path';

const srcDir = 'e:\\앱\\belleforet-dashboard\\src';

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allFiles = getAllFiles(srcDir);
console.log(`Found ${allFiles.length} TypeScript source files in src/.\n`);

const auditResults = {
  rule1Violations: [],
  hardcodedValues: [],
  queryParamsIssues: [],
  vatRuleChecks: []
};

allFiles.forEach(file => {
  const relPath = path.relative(srcDir, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check 1: Potential array sum reduce violating Bible Rule 1 (NO SLICE SUMMATION)
    if ((line.includes('.reduce((') || line.includes('.reduce(')) && 
        (line.includes('totalSales') || line.includes('todayActual') || line.includes('revenue') || line.includes('sales')) &&
        !file.includes('Synergy.tsx') && !file.includes('dataTransformers.ts')) {
      auditResults.rule1Violations.push({ file: relPath, lineNum, code: line.trim() });
    }

    // Check 2: Hardcoded fallbacks (e.g. || 2110, || 82, || 180)
    if (line.match(/\|\|\s*(2110|82|4700|180|173470)/)) {
      auditResults.hardcodedValues.push({ file: relPath, lineNum, code: line.trim() });
    }

    // Check 3: Check V5 API query params for revenue-summary without date
    if (line.includes('revenue-summary') && line.includes('startDate') && !line.includes('date=')) {
      auditResults.queryParamsIssues.push({ file: relPath, lineNum, code: line.trim() });
    }
  });
});

console.log('=== AUDIT REPORT SUMMARY ===');
console.log(`1. Potential Rule 1 (NO SLICE SUMMATION) Violations: ${auditResults.rule1Violations.length}`);
auditResults.rule1Violations.forEach(v => console.log(`   - [${v.file}:${v.lineNum}] ${v.code}`));

console.log(`\n2. Hardcoded Fallback Values: ${auditResults.hardcodedValues.length}`);
auditResults.hardcodedValues.forEach(v => console.log(`   - [${v.file}:${v.lineNum}] ${v.code}`));

console.log(`\n3. Query Parameter Issues: ${auditResults.queryParamsIssues.length}`);
auditResults.queryParamsIssues.forEach(v => console.log(`   - [${v.file}:${v.lineNum}] ${v.code}`));
