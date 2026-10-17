const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'archive') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
console.log('Total TSX files scanned:', files.length);

const issues = {
  tableOverflow: [],
  tableAlignment: [],
  truncateWithoutTitle: [],
  badgeSquash: [],
  tooltipAlignRight: [],
  boxHeightMismatch: []
};

files.forEach(fp => {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative('.', fp);

  // 1. Table overflow-x-auto check
  lines.forEach((line, idx) => {
    if (/<table[\s>]/.test(line) && !line.includes('//')) {
      const start = Math.max(0, idx - 15);
      const prevContext = lines.slice(start, idx + 1).join(' ');
      if (!prevContext.includes('overflow-x-auto') && !prevContext.includes('overflow-auto')) {
        issues.tableOverflow.push({ file: relPath, line: idx + 1, text: line.trim() });
      }
    }
  });

  // 2. Truncate without title
  lines.forEach((line, idx) => {
    if (line.includes('truncate') && !line.includes('//')) {
      // Check if current line or adjacent lines (up to 3) have title=
      const context = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)).join(' ');
      if (!context.includes('title=') && !context.includes('title =') && (line.includes('<span') || line.includes('<div') || line.includes('<td') || line.includes('<p') || line.includes('<h'))) {
        issues.truncateWithoutTitle.push({ file: relPath, line: idx + 1, text: line.trim() });
      }
    }
  });

  // 3. MetricExplainerTooltip align="right" check
  lines.forEach((line, idx) => {
    if (line.includes('MetricExplainerTooltip') && line.includes('align="right"')) {
      issues.tooltipAlignRight.push({ file: relPath, line: idx + 1, text: line.trim() });
    }
  });

  // 3.5 Card fixed height check (h-[...px] on card containers without min-h- or overflow-)
  lines.forEach((line, idx) => {
    if (/className=[\"'][^\"']*(\s|^)h-\[\d+px\]/.test(line) && !line.includes('//')) {
      if ((line.includes('rounded') || line.includes('bg-white') || line.includes('p-4') || line.includes('p-5') || line.includes('p-6')) &&
          !line.includes('ReactECharts') && !line.includes('min-h-') && !line.includes('overflow-') &&
          !line.includes('w-[') && !line.includes('w-6') && !line.includes('w-8') && !line.includes('w-10') && !line.includes('w-12') &&
          !line.includes('<button') && !line.includes('<input') && !line.includes('<img')) {
        issues.boxHeightMismatch.push({ file: relPath, line: idx + 1, text: line.trim() });
      }
    }
  });

  // 4. Detailed table column alignment analysis
  // Find table blocks and inspect thead th vs tbody td alignments
  let inTable = false;
  let inThead = false;
  let inTbody = false;
  let theadAlignments = [];
  let currentTableLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/<table[\s>]/.test(l)) {
      inTable = true;
      currentTableLine = i + 1;
      theadAlignments = [];
    }
    if (inTable && /<thead[\s>]/.test(l)) {
      inThead = true;
    }
    if (inThead) {
      if (/<th[\s>]/.test(l)) {
        let tagStr = l;
        let k = i;
        while (!/(?<!=)>/.test(tagStr) && k + 1 < lines.length) {
          k++;
          tagStr += ' ' + lines[k];
        }
        let align = 'center';
        if (tagStr.includes('text-right')) align = 'right';
        else if (tagStr.includes('text-left')) align = 'left';
        else if (tagStr.includes('text-center')) align = 'center';
        theadAlignments.push({ index: theadAlignments.length, align, text: tagStr.trim(), line: i + 1 });
      }
      if (l.includes('</thead>')) {
        inThead = false;
      }
    }
    if (inTable && /<tbody[\s>]/.test(l)) {
      inTbody = true;
    }
    if (inTbody && /<tr[\s>]/.test(l) && theadAlignments.length > 0) {
      // Read following td cells in this tr
      let rowTds = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('</tr>') && !lines[j].includes('</tbody>')) {
        if (/<td[\s>]/.test(lines[j])) {
          let tagStr = lines[j];
          let k = j;
          while (!/(?<!=)>/.test(tagStr) && k + 1 < lines.length) {
            k++;
            tagStr += ' ' + lines[k];
          }
          let align = 'left';
          if (tagStr.includes('text-right')) align = 'right';
          else if (tagStr.includes('text-center')) align = 'center';
          else if (tagStr.includes('text-left')) align = 'left';
          rowTds.push({ index: rowTds.length, align, text: tagStr.trim(), line: j + 1 });
        }
        j++;
      }
      // Compare alignments
      if (rowTds.length > 0 && rowTds.length === theadAlignments.length) {
        for (let col = 0; col < theadAlignments.length; col++) {
          const th = theadAlignments[col];
          const td = rowTds[col];
          if (th.align !== td.align) {
            issues.tableAlignment.push({
              file: relPath,
              tableLine: currentTableLine,
              colIndex: col + 1,
              thLine: th.line,
              thAlign: th.align,
              tdLine: td.line,
              tdAlign: td.align,
              thText: th.text,
              tdText: td.text
            });
          }
        }
        // Only check first data row per table to avoid spam
        inTbody = false;
      }
    }
    if (inTable && l.includes('</table>')) {
      inTable = false;
      inThead = false;
      inTbody = false;
      theadAlignments = [];
    }
  }
});

console.log('=== UI 전수 감사 결과 통계 ===');
console.log('1. 테이블 overflow-x-auto 누락 (화면 잘림 위험):', issues.tableOverflow.length);
console.log('2. 오와 열 불일치 (th와 td 정렬 mismatch):', issues.tableAlignment.length);
console.log('3. 텍스트 말줄임(truncate)에 title 누락 (글자 확인 불가):', issues.truncateWithoutTitle.length);
console.log('4. 툴팁 align="right" (화면 왼쪽 배치 시 잘림 위험):', issues.tooltipAlignRight.length);
console.log('5. 카드 고정 높이 h-[...px] (텍스트 넘침/잘림 위험):', issues.boxHeightMismatch.length);

fs.writeFileSync('scripts/ui-audit-summary.json', JSON.stringify(issues, null, 2));
console.log('\n상세 결과가 scripts/ui-audit-summary.json 에 저장되었습니다.');
