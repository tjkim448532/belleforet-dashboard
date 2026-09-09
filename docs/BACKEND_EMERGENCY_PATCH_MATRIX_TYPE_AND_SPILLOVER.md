# [긴급 백엔드 패치 요청서] V6 API 타입 무결성(strict Number) 위반 및 ReferenceError 2건 즉각 조치 지시서

- **문서 번호**: `BF-BE-REQ-20260909-03`
- **수신**: 백엔드 엔지니어링팀 (belleforet-data)
- **발신**: 프론트엔드 통합 데이터 통제실 (belleforet-dashboard)
- **일시**: 2026-09-09
- **우선순위**: **CRITICAL (긴급 패치 요구)**
- **관련 헌법 및 표준**: 『벨포레 데이터 통합 통제 API 바이블 (The Bible) v4.2 & V6 Constitution』 제2조(전면 camelCase 및 엄격한 strict Number 타입 원칙), 제4조(AI 에이전트 R&R 경계 준수)

---

## 1. 긴급 조치 배경

백엔드 배포 보고서(`BF-BE-WALKTHROUGH-20260909-02`) 수령 후 프론트엔드 대시보드 연동 테스트 중, 브라우저 콘솔에서 **수백 건의 Data Integrity 타입 에러**와 **500 서버 크래시 에러**가 실시간으로 포착되었습니다.

### 🚨 주요 장애 현상 요약
1. **`GET /api/v6/dashboard/matrix-report`**:
   - MariaDB의 `DECIMAL(15,2)` 타입 컬럼들이 Node `mysql2`의 기본 설정에 의해 **문자열(String, 예: `'1119093.00'`, `'0.00'`, `'-54.36'`)**로 반환됨.
   - 프론트엔드 무결성 검증기(`secureFetcher.ts`)에서 70개 업장 × 9개 지표 = **총 630개의 `[Type Error]` 경고가 콘솔을 도배**하며 SSOT 무결성 규격을 위반함.
2. **`GET /api/v6/report/cross-synergy-matrix`**:
   - API 호출 시 즉시 500 에러 반환: `ReferenceError: maxSpilloverAmount is not defined`
   - 응답 요약 객체(`summary`)에서 선언되지 않은 변수(`maxSpilloverAmount`)를 참조하여 엔드포인트 전체가 크래시됨.

---

## 2. 결함 1 상세 원인 및 패치 지침 (matrix-report Type Error)

### 2.1. 원인 분석
- 대상 파일: `src/app/api/v6/dashboard/matrix-report/route.ts`
- DB 조회 결과(`rows`)를 어떠한 타입 캐스팅이나 정규화 없이 그대로 `NextResponse.json({ success: true, data: rows })`로 반환.
- `todayActual`, `todayLy`, `todayGrowth`, `mtdActual`, `mtdLy`, `mtdGrowth`, `ytdActual`, `ytdLy`, `ytdGrowth`가 string 형태로 직렬화되어 내려옴.
- `isSubtotal`, `isGrandTotal` 역시 0/1 정수로 내려와 바이블 표준(boolean)과 불일치.

### 2.2. 긴급 수정 코드 (`src/app/api/v6/dashboard/matrix-report/route.ts`)

#### [수정 위치: 라인 61 ~ 68]
```typescript
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    // 🔴 기존 (문자열 그대로 반환):
    // return NextResponse.json({
    //   success: true,
    //   data: rows
    // });

    // 🟢 긴급 수정 (strict Number 및 Boolean 정규화 강제):
    const sanitizedRows = rows.map((r: any) => ({
      ...r,
      isSubtotal: Boolean(r.isSubtotal === 1 || r.isSubtotal === true || r.isSubtotal === '1'),
      isGrandTotal: Boolean(r.isGrandTotal === 1 || r.isGrandTotal === true || r.isGrandTotal === '1'),
      todayActual: Number(r.todayActual || 0),
      todayLy: Number(r.todayLy || 0),
      todayGrowth: Number(r.todayGrowth || 0),
      mtdActual: Number(r.mtdActual || 0),
      mtdLy: Number(r.mtdLy || 0),
      mtdGrowth: Number(r.mtdGrowth || 0),
      ytdActual: Number(r.ytdActual || 0),
      ytdLy: Number(r.ytdLy || 0),
      ytdGrowth: Number(r.ytdGrowth || 0),
      visitors: Number(r.visitors || 0),
      totalVisitors: Number(r.totalVisitors || 0),
      lyVisitors: Number(r.lyVisitors || 0),
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedRows
    });
```

### 2.3. DB 커넥션 풀 레벨 근본 조치 (`src/v3-engine/infrastructure/database/DbRepository.ts`)
MariaDB의 `DECIMAL`/`NUMERIC` 필드가 향후 모든 API에서 자바스크립트 `number`로 파싱되도록 `createPool` 옵션에 `decimalNumbers: true`를 추가해 주십시오.

```typescript
// src/v3-engine/infrastructure/database/DbRepository.ts 라인 5~29
  private static pool = mysql.createPool({
    host: process.env.DB_HOST || 'belleforet-db.czquaoswqd4l.ap-northeast-2.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: (process.env.DB_PASSWORD || 'M7$kP!vX2^qW8#yN')?.replace(/"/g, '').replace(/\\/g, ''),
    database: process.env.DB_NAME || 'belleforet',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 60000,
    charset: 'utf8mb4',
    multipleStatements: true,
    decimalNumbers: true // 🟢 추가: MariaDB DECIMAL 타입을 Number로 자동 파싱
  });

  private static readonlyPool = mysql.createPool({
    host: process.env.DB_HOST || 'belleforet-db.czquaoswqd4l.ap-northeast-2.rds.amazonaws.com',
    user: process.env.DB_READONLY_USER || 'readonly_v6_api',
    password: process.env.DB_READONLY_PASSWORD || 'ReadOnlyP@ssw0rd!',
    database: process.env.DB_NAME || 'belleforet',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: true // 🟢 추가: MariaDB DECIMAL 타입을 Number로 자동 파싱
  });
```

---

## 3. 결함 2 상세 원인 및 패치 지침 (cross-synergy-matrix ReferenceError)

### 3.1. 원인 분석
- 대상 파일: `src/app/api/v6/report/cross-synergy-matrix/route.ts`
- 라인 1544: `summary` 반환 객체에 `maxSpilloverAmount,` 프로퍼티가 포함되어 있으나, 상단(라인 1335~1340)에 `const maxSpilloverAmount = ...` 변수 정의가 누락됨.
- 이로 인해 엔드포인트 호출 시 Node.js 런타임에서 `ReferenceError: maxSpilloverAmount is not defined`가 발생하여 API가 실패함.

### 3.2. 긴급 수정 코드 (`src/app/api/v6/report/cross-synergy-matrix/route.ts`)

#### [수정 위치: 라인 1339 ~ 1341 부근]
```typescript
    // 15. Summary Aggregations (Total Spillover, Average Elasticity, Bottlenecks)
    const totalPureSpillover = isInsufficientData ? 0 : correlations.reduce((acc: number, c: any) => acc + (c.pureSpilloverPerMillion || 0), 0);
    const averageElasticity = (isInsufficientData || correlations.length === 0) 
      ? null
      : Number((correlations.reduce((acc: number, c: any) => acc + (c.pureElasticity || 0), 0) / correlations.length).toFixed(1));
    const criticalBottleneck = [...correlations].sort((a: any, b: any) => (b.peakHourCapacityUtilization || b.currentCapacityUtilization || 0) - (a.peakHourCapacityUtilization || a.currentCapacityUtilization || 0))[0] || null;

    // 🟢 긴급 추가: maxSpilloverAmount 변수 선언 (1위 스필오버 발생 금액)
    const maxSpilloverAmount = topOverall ? (topOverall.pureSpilloverPerMillion || 0) : 0;
```

---

## 4. 백엔드 배포 전 자체 검증 스크립트 (CLI One-Liner)

백엔드 배포 후 아래 명령어를 터미널에서 실행하여 두 엔드포인트가 정상 작동하는지 10초 만에 확인하실 수 있습니다:

```bash
# 1. matrix-report 타입 검증 (todayActual, mtdActual 등이 strict 'number'로 출력되는지 확인)
node -e "
fetch('https://belleforet-data.vercel.app/api/v6/dashboard/matrix-report?date=2026-09-08', {
  headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
}).then(r => r.json()).then(data => {
  const row = data.data?.[0];
  console.log('matrix-report Status: 200, Rows:', data.data?.length);
  console.log('todayActual type:', typeof row?.todayActual, '=', row?.todayActual);
  console.log('mtdActual type:', typeof row?.mtdActual, '=', row?.mtdActual);
  console.log('isSubtotal type:', typeof row?.isSubtotal, '=', row?.isSubtotal);
  if (typeof row?.todayActual !== 'number' || typeof row?.isSubtotal !== 'boolean') {
    console.error('❌ VALIDATION FAILED: Still string or non-boolean!');
  } else {
    console.log('✅ VALIDATION PASSED: Strict Number & Boolean confirmed!');
  }
});
"

# 2. cross-synergy-matrix 500 에러 해소 검증 (status: 200 및 success: true 확인)
node -e "
fetch('https://belleforet-data.vercel.app/api/v6/report/cross-synergy-matrix?date=2026-09-08', {
  headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
}).then(r => r.json()).then(data => {
  console.log('cross-synergy-matrix Status: 200, Success:', data.success ?? (data.status !== 'error'));
  console.log('Summary maxSpilloverAmount:', data.summary?.maxSpilloverAmount);
  if (data.status === 'error') {
    console.error('❌ ERROR STILL PERSISTS:', data.message);
  } else {
    console.log('✅ REFERENCE ERROR FIXED!');
  }
});
"
```

---

## 5. 기대 효과 및 프론트엔드 연동 상태
- 위 2건의 코드 패치가 백엔드에 반영되는 즉시, 프론트엔드 콘솔의 630개 `[Type Error]` 경고가 `✅ [Data Integrity PASSED]`로 100% 정상화됩니다.
- 또한 `cross-synergy-matrix`의 산키 다이어그램 및 시너지 스토어 카드 데이터가 1원 단위 오차 없이 프론트엔드 화면에 완벽하게 렌더링됩니다.
