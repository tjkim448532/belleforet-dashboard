#!/usr/bin/env node

/**
 * 🚨 [DEAD INTERACTION GUARD] 더미 인터랙션 및 필터 바인딩 누락 자동 차단기
 * 
 * 목적:
 * UI에 버튼, 탭, 드롭다운, 셀렉터 등의 사용자 인터랙션 컨트롤이 존재하여
 * 상태(State)가 변경됨에도 불구하고, 그 상태가 화면의 데이터 수치, 차트, 테이블,
 * 조건부 뷰, 또는 API 파라미터에 바인딩되지 않고 오직 버튼의 활성화 CSS 색상에만
 * 갇혀 있는 '더미 인터랙션(Dead Interaction / Unbound Filter)' 결함을 컴파일/빌드
 * 시점에 물리적으로 전수 적발하여 차단(Exit 1)합니다.
 */

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
const deadViolations = [];

// 검사 제외 파일 (인터랙션 없는 순수 정적 레이아웃 또는 개발 도구)
const EXCLUDED_FILES = [
  'SleepModeModal.tsx' // 단순 수면모드 모달 팝업 상태
];

files.forEach(filePath => {
  const relPath = path.relative('.', filePath);
  const fileName = path.basename(filePath);

  if (EXCLUDED_FILES.includes(fileName)) return;

  const content = fs.readFileSync(filePath, 'utf8');

  // 1. useState 매칭: const [name, setName] = useState...
  const stateRegex = /const\s+\[([a-zA-Z0-9_]+),\s*set([a-zA-Z0-9_]+)\]\s*=\s*useState(?:<([^>]+)>)?\s*\(([^)]*)\)/g;
  let match;

  while ((match = stateRegex.exec(content)) !== null) {
    const stateName = match[1];
    const setterName = 'set' + match[2];
    const initialVal = match[4].trim();

    // 2. 컨트롤 성격의 상태인지 검사 (기간, 탭, 모드, 필터, 정렬, 뷰, 연도, 월, 카테고리 등)
    const isControlKeyword = 
      /^(selected|active|current|view|filter|period|tab|mode|range|sort|category|channel|year|month|quarter|half|baseline)/i.test(stateName) ||
      /(Filter|Mode|Tab|Period|Scope|Category|Channel|Sort|Year|Month|Quarter|Half)$/i.test(stateName);

    if (!isControlKeyword) continue;

    // 데이터 저장/로딩/모달 상태는 제외
    if (/data|loading|error|fetching|saving|submitting|results|list|response|summary|modal|popup|open|isOpen|visible|show|ref/i.test(stateName)) {
      continue;
    }

    // 3. UI에서 상태를 변경하는 핸들러가 존재하는지 검사 (onClick, onChange, onSelect 등)
    const triggerRegex = new RegExp(`(?:onClick|onChange|onSelect)\\s*=\\s*\\{[^}]*\\b${setterName}\\s*\\(`, 'g');
    const triggerMatches = content.match(triggerRegex) || [];
    if (triggerMatches.length === 0) continue; // 유저 인터랙션이 없는 상태는 제외

    // 4. stateName이 컴포넌트 내에서 읽히는 곳 전수 추출
    const lines = content.split('\n');
    const readUsages = [];

    lines.forEach((line, idx) => {
      // 선언 라인 제외
      if (line.includes(`[${stateName},`)) return;
      // 순수 setter 호출 라인 제외
      const withoutSetter = line.replace(new RegExp(`\\b${setterName}\\b`, 'g'), '');
      if (new RegExp(`\\b${stateName}\\b`).test(withoutSetter)) {
        readUsages.push({ lineNum: idx + 1, text: line.trim() });
      }
    });

    // 5. 사용처가 아예 없는 경우 -> UNREAD_STATE
    if (readUsages.length === 0) {
      deadViolations.push({
        file: relPath,
        stateName,
        setterName,
        rule: 'Unread Interactive State (UI 이벤트로 상태를 변경하나 컴포넌트에서 전혀 읽지 않음)',
        occurrences: []
      });
      continue;
    }

    // 6. 데이터 바인딩 여부 검사
    // - API fetch / params / url 에 상태가 사용되는가?
    // - useMemo / useEffect 계산 및 의존성에 상태가 사용되는가?
    // - filter / map / find / some / every / reduce / sort / slice 에 사용되는가?
    // - 객체 인덱싱 obj[stateName] 에 사용되는가?
    // - 조건부 뷰 렌더링 {state === 'A' && <...>} 또는 {state === 'A' ? <CompA /> : <CompB />} 에 쓰이는가?
    // - 화면 내 텍스트/수치 직접 보간에 쓰이는가?
    let isDataBound = false;
    let onlyClassStyling = true;

    for (const u of readUsages) {
      const t = u.text;

      // API 파라미터 바인딩
      if (/params\.(set|append)|fetch\(|axios|\/api\//.test(t)) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // useMemo / useEffect 계산 로직 또는 의존성
      if (/useMemo|useEffect/.test(t)) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // 컬렉션 순회 및 필터링 / 인덱싱
      if (/\.(filter|find|map|reduce|sort|slice)\(/.test(t) || new RegExp(`\\[\\s*${stateName}\\s*\\]`).test(t)) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // 조건부 렌더링 (단순 클래스 토글이 아닌 실제 JSX 엘리먼트 분기)
      if (new RegExp(`\\b${stateName}\\s*===?[^&?]*&&\\s*\\(?\\s*<`).test(t) ||
          new RegExp(`\\b${stateName}\\s*===?[^?]*\\?\\s*\\(?\\s*<`).test(t) ||
          new RegExp(`switch\\s*\\(\\s*${stateName}\\s*\\)`).test(t)) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // 자식 컴포넌트에 prop으로 전달
      if (new RegExp(`[a-zA-Z0-9_]+\\s*=\\s*\\{\\s*${stateName}\\s*\\}`).test(t) &&
          !t.includes('value=') && !t.includes('checked=')) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // 화면 직접 렌더링 (라벨 표시 외에 내용 보간)
      if (new RegExp(`>\\s*\\{\\s*${stateName}\\s*\\}\\s*<`).test(t)) {
        isDataBound = true;
        onlyClassStyling = false;
        break;
      }

      // 순수 className / style 삼항연산자 검사
      const isClassNameOnly = (t.includes('className') || t.includes('style=')) &&
        !t.includes('data.') && !t.includes('.filter');
      
      if (!isClassNameOnly) {
        onlyClassStyling = false;
      }
    }

    if (!isDataBound && onlyClassStyling) {
      deadViolations.push({
        file: relPath,
        stateName,
        setterName,
        rule: 'Dead Interaction / Unbound Filter (버튼 클릭 시 상태만 바뀌고 화면 데이터/차트/테이블/API에 미반영)',
        occurrences: readUsages
      });
    }
  }
});

console.log('='.repeat(80));
console.log('🛡️  [DEAD INTERACTION GUARD] 벨포레 UI 인터랙션 무결성 검증 (Zero-Dead Filters Audit)');
console.log('='.repeat(80));

if (deadViolations.length > 0) {
  console.error(`\n❌ [FATAL DEAD INTERACTION DETECTED] 데이터 미반영 더미 인터랙션 ${deadViolations.length}건 적발!\n`);
  deadViolations.forEach((v, i) => {
    console.error(`[결함 ${i + 1}] ${v.file} ➔ ${v.stateName} (${v.setterName})`);
    console.error(`   규칙: ${v.rule}`);
    v.occurrences.forEach(o => {
      console.error(`   L${o.lineNum}: ${o.text.substring(0, 100)}`);
    });
    console.error('-'.repeat(80));
  });
  console.error('\n🚨 빌드가 차단되었습니다! 버튼/필터 상태를 데이터 필터링, 차트 옵션, 피벗 테이블 또는 백엔드 API 완제품에 즉시 연결하십시오.\n');
  process.exit(1);
} else {
  console.log(`\n✅ 검사 완료: src/ 내 ${files.length}개 TSX 컴포넌트 전수 인터랙션 무결성 통과!`);
  console.log('💎 버튼/필터 클릭 시 데이터가 반응하지 않는 더미 인터랙션(Dead Interaction)이 0건(Clean Zero)입니다.\n');
  process.exit(0);
}
