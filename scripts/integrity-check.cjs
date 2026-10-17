#!/usr/bin/env node

/**
 * 🚨 [DATA INTEGRITY GUARD] 벨포레 대시보드 무결성 자동 검증 스크립트
 * 
 * 목적:
 * 프론트엔드 코드베이스 내에 임의의 가짜 숫자, 하드코딩된 단가/매출/퍼센트,
 * 임의의 방어적 폴백 상수(|| [숫자]), 정적 승수(* 45000 등)가 유입되는 것을
 * 물리적으로 차단하고 빌드 및 커밋을 즉시 거부(Exit 1)합니다.
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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
const violations = [];

// 검사 제외 파일 (공식 DB 스냅샷 시드 및 타입 정의)
const EXCLUDED_FILES = [
  'monthlySeasonalityData.ts', // DB mat_v6_data_mart_revenue 연도별 실측 계절성 SSOT
  'defaultCapacitySeeds.ts',   // DB mat_v6_data_mart_revenue 표준 영업장 캐파 마스터 시드
  'leisurePricingData.ts'      // 벨포레 공식 웹사이트 & PMS 체험 시설 이용요금 카탈로그 SSOT
];

files.forEach(filePath => {
  const relPath = path.relative('.', filePath);
  const fileName = path.basename(filePath);

  if (EXCLUDED_FILES.includes(fileName)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const l = line.trim();
    const lineNum = idx + 1;

    // 주석 및 임포트, 인터페이스는 제외
    if (l.startsWith('//') || l.startsWith('/*') || l.startsWith('*')) return;
    if (l.startsWith('import ') || l.startsWith('export interface') || l.startsWith('interface ') || l.startsWith('type ')) return;

    // 인라인 주석 제거 후 실제 코드만 검사
    const codeOnly = l.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
    if (!codeOnly) return;

    // 1. 임의 숫자 폴백 검사: || [2-9]\d+ 또는 || \d{3,}
    // 허용: 년도(|| 2024, || 2025, || 2026), ms 단위(|| 1000), 1년 일수(|| 365), 타임아웃, 포트번호
    const fallbackMatch = codeOnly.match(/\|\|\s*([2-9]\d+|[1-9]\d{2,})/);
    if (fallbackMatch) {
      const isAllowed = 
        codeOnly.includes('Year') || codeOnly.includes('year') || 
        codeOnly.includes('1000') || codeOnly.includes('365') || codeOnly.includes('3600') ||
        codeOnly.includes('timeout') || codeOnly.includes('PORT') || codeOnly.includes('limit');

      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Arbitrary Numeric Fallback (|| [숫자] 사용 금지)',
          code: codeOnly
        });
      }
    }

    // 2. JSX 내 하드코딩된 원화 금액 검사 (₩150,000, 150000원 등)
    // 허용: { ... } 바인딩, formatCurrency, toLocaleString, 헤더 라벨("100만원당")
    const wonMatch = codeOnly.match(/(?:₩|\\)\s*[1-9]\d{1,}(?:,\d{3})+|\d{2,4}만\s*원|\d{1,3}(?:,\d{3})+\s*원/);
    if (wonMatch) {
      const isAllowed = 
        codeOnly.includes('{') || codeOnly.includes('}') || 
        codeOnly.includes('placeholder') || codeOnly.includes('100만원당') ||
        codeOnly.includes('formatCurrency') || codeOnly.includes('formatFinancial') || codeOnly.includes('toLocaleString');

      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Hardcoded Currency String in JSX (고정 금액 텍스트 삽입 금지)',
          code: codeOnly
        });
      }
    }

    // 3. JSX 내 하드코딩된 정적 퍼센트 검사 (>64.0%< 등)
    const pctMatch = codeOnly.match(/>\s*[+-]?\d+\.\d+%\s*</);
    if (pctMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Hardcoded Static Percentage in JSX (고정 퍼센트 삽입 금지)',
        code: codeOnly
      });
    }

    // 4. 가짜 승수 계산 검사 (* 45000, * 175000 등)
    const multMatch = codeOnly.match(/\*\s*(?:45000|175000|680000|27500|55000|150000|142500)/);
    if (multMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Multiplier Estimation (가짜 단가 승수 곱셈 금지)',
        code: codeOnly
      });
    }

    // 5. 가짜 Mock 변수 선언 검사 (const MOCK_ = ... 등)
    const mockVarMatch = codeOnly.match(/const\s+(?:MOCK_|DUMMY_|INITIAL_MOCK|fake[A-Z0-9_]*|dummy[A-Z0-9_]*)\s*=/i);
    if (mockVarMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Mock / Dummy Constant Declaration (더미/목업 상수 선언 금지)',
        code: codeOnly
      });
    }

    // 6. 가짜 단가 및 객실 인벤토리/정원 프록시 승수 검사 (baseUnitPrice: 20000, * 4 정원 곱셈 등)
    const proxyMultiplierMatch = codeOnly.match(/(?:totalRoomsSold|summaryRoomsSold)\s*\*\s*4|175\s*\*\s*(?:safeDays|days|safeRangeDays)|baseUnitPrice\s*:\s*[1-9]\d+/);
    if (proxyMultiplierMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Capacity / Unit Price Estimation (가짜 정원/단가/객실 승수 금지)',
        code: codeOnly
      });
    }

    // 7. 가짜 주중/주말 캘린더 안분 및 왜곡 폴백 검사 (weekdayRatio, totalGolfRev / visitedPlayers, >과반 점유< 등)
    const calendarProxyMatch = codeOnly.match(/weekdayRatio\s*=|totalGolfRev\s*\/\s*visitedPlayers|>과반 점유</);
    if (calendarProxyMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Proxy Ratio / Fake Green Fee / Mockup Label (가짜 캘린더 안분/단가 왜곡/목업 라벨 금지)',
        code: codeOnly
      });
    }

    // 8. 가짜 키워드 휴리스틱, 탑승인원 배수 추정, 하드코딩된 시간대 안내 검사 (Rule 8)
    const heuristicMatch = codeOnly.match(/name\.includes\(['"]2인승['"]\)\s*\?\s*2|confidence:\s*85|selectedMonth\s*===?\s*['"]number['"]\s*\?\s*[^:]+:\s*7\b|name\.includes\(['"](?:스마트스코어|골프몬|골프락)['"]\)\s*\?\s*['"][1-3]부/);
    if (heuristicMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Fake Keyword Heuristics / Passenger Multipliers / Guess Time Hints (가짜 키워드 추론/탑승인원 배수/티타임 임의추측 금지)',
        code: codeOnly
      });
    }

    // 9. 클라이언트 사칙연산 지표 합성 및 나눗셈 폴백 검사 (Rule 9: Fail-Stop)
    // 금지: ADR, 점유율, 증감률, 연박비율 등을 클라이언트에서 나눗셈 폴백으로 합성(|| Math.round(... / ...), || ((... / ...) * 100), || (1 / ...))
    const clientSynthesisMatch = codeOnly.match(/\|\|\s*Math\.round\([^)]*\/[^)]*\)|\|\|\s*\(\([^)]*\/[^)]*\)\s*\*\s*100\)|\|\|\s*\(1\s*\/\s*Math\.max|item\.adr\s*\|\|\s*Math\.round/);
    if (clientSynthesisMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Client-Side Metric Synthesis / Division Fallback (클라이언트 지표 사칙연산/나눗셈 폴백 금지 - Fail-Stop 위반)',
        code: codeOnly
      });
    }

    // 10. 클라이언트 기상 시뮬레이션 및 임의 강도 배수 합성 검사 (Rule 10: Zero-Simulation)
    // 금지: 강수량이나 적설량을 기반으로 클라이언트에서 임의의 계수를 합성해 매출을 추정하는 행위
    const simulationSynthesisMatch = codeOnly.match(/(?:simPrecipitation|simSnowfall)\s*\/\s*(?:15|3|10|5|30)\b|\bMath\.round\([^)]*\*\s*\([^)]*(?:rainy|snowy|weather)Impact/i);
    if (simulationSynthesisMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Client-Side Weather/Forecast Synthesis (클라이언트 임의 시뮬레이션 및 계수 합성 금지 - Rule 10 위반)',
        code: codeOnly
      });
    }

    // 11. 임의 숫자 널 병합 폴백 검사: ?? [1-9]\d* (Rule 11: Fail-Stop)
    const nullishMatch = codeOnly.match(/\?\?\s*([1-9]\d*(?:\.\d+)?)/);
    if (nullishMatch) {
      const val = parseFloat(nullishMatch[1]);
      const isAllowed = 
        val === 1 || val === 1.0 || (val >= 2024 && val <= 2030) ||
        codeOnly.includes('Year') || codeOnly.includes('year') ||
        codeOnly.includes('digits') || codeOnly.includes('multiplier') || codeOnly.includes('val');
      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Arbitrary Numeric Nullish Fallback (?? [양수] 사용 금지 - Fail-Stop 위반)',
          code: codeOnly
        });
      }
    }

    // 12. useState 내 하드코딩된 단가/매출 상수(1000 이상) 검사 (연도 제외)
    const stateMatch = codeOnly.match(/useState\s*(?:<[^>]+>)?\s*\(\s*([1-9]\d{3,})\s*\)/);
    if (stateMatch) {
      const num = parseInt(stateMatch[1], 10);
      if (num < 2024 || num > 2030) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Mock React Initial State (useState 내 하드코딩된 금액/수치 삽입 금지)',
          code: codeOnly
        });
      }
    }

    // 13. 상호명 정규식 추론 및 스마트 텍스트 매핑 검사 (Zero Regex Guessing / Rule 4)
    const regexGuessingMatch = codeOnly.match(/isNonVisitorVenue|얼룩말카페\|핏스탑|trimmed\.toUpperCase\(\)\s*===\s*['"]ROOM['"]|\.replace\(\/\\s\*\\\[소계\\\]\/g/);
    if (regexGuessingMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Regex Guessing & Smart Text Mapping Forbidden (상호명 정규식 추론 및 임의 텍스트 매핑 금지)',
        code: codeOnly
      });
    }

    // 14. JSX 내 하드코딩된 정수 퍼센트 범위 검사 (>-35% ~ -90%<, >+7% ~ +15%< 등)
    const intPctRangeMatch = codeOnly.match(/>\s*[+-]\d+%\s*~\s*[+-]?\d+%/);
    if (intPctRangeMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Hardcoded Integer Percentage Range in JSX (JSX 내 하드코딩된 퍼센트 범위 삽입 금지)',
        code: codeOnly
      });
    }

    // 15. 대시보드/리포트 내 클라이언트 단가·팀수·전년비·RevPAR 인라인 나눗셈/곱셈 합성 차단
    const inlineKpiDivisionMatch = codeOnly.match(/Math\.round\(visitors\s*\/\s*4\)|Math\.round\(rev\s*\/\s*visitors\)|\(row\.revenue\s*-\s*row\.lyRev\)\s*\/\s*row\.lyRev|yoyPrimaryDiff\s*\/\s*prev(?:Guests|Rooms)|yoyRevDiff\s*\/\s*prevRev|Math\.round\((?:weekdayAdr|weekendAdr|targetAdr)\s*\*\s*\((?:weekdayOcc|weekendOcc|targetOccPct)\s*\/\s*100\)\)/);
    if (inlineKpiDivisionMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Inline Client-Side KPI Arithmetic Forbidden (클라이언트 인라인 단가/팀수/전년비/RevPAR 사칙연산 금지)',
        code: codeOnly
      });
    }

    // 16. 하드코딩된 휴무일 문구, 낡은 배포 대기 배너, 가짜 순위/방문횟수 폴백, 인라인 차감/가산 차단
    const auditRule16Match = codeOnly.match(/딜라이트\(월~수 휴장\)|밤밤테이블\(화요일 휴무\)|백엔드 API 배포 대기|백엔드 ETL 마트 연동 대기|m\.rank\s*\?\?\s*idx\s*\+\s*1|menu\.rank\s*\|\|\s*mIdx\s*\+\s*1|directAvg\s*-\s*otaAvg|member1Non3\.teams\s*\+\s*member2Non2\.teams|Math\.max\(0,\s*pax\s*-\s*micePax\)/);
    if (auditRule16Match) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Hardcoded Closed-Day Text / Stale Banner / Fake Rank or Inline Arithmetic Forbidden (Rule 16 위반)',
        code: codeOnly
      });
    }
  });
});

console.log('='.repeat(80));
console.log('🛡️  [DATA INTEGRITY GUARD] 벨포레 전수 무결성 검증 (Zero-Fake Numbers Audit)');
console.log('='.repeat(80));

if (violations.length > 0) {
  console.error(`\n❌ [FATAL INTEGRITY VIOLATION] 가짜 숫자 및 임의 폴백 위반 ${violations.length}건 적발!\n`);
  violations.forEach((v, i) => {
    console.error(`[위반 ${i + 1}] ${v.file}:${v.line}`);
    console.error(`   규칙: ${v.rule}`);
    console.error(`   코드: ${v.code.substring(0, 100)}`);
    console.error('-'.repeat(80));
  });
  console.error('\n🚨 빌드 및 커밋이 차단되었습니다! 모든 임의의 숫자와 가짜 데이터를 0 또는 실시간 API 데이터로 수정하십시오.\n');
  process.exit(1);
} else {
  console.log(`\n✅ 검사 완료: src/ 내 ${files.length}개 파일 전수 검증 통과!`);
  console.log('💎 가짜 숫자, 하드코딩된 단가, 임의의 숫자 폴백이 0건(Clean Zero)입니다.\n');
  process.exit(0);
}
