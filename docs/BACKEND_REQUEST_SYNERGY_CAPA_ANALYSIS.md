# [백엔드 공식 보정 및 기능 강화 요청서] 인과 시너지·CAPA 병목 분석 엔진 SSOT 구축

- **문서 번호**: BF-BE-REQ-20260909-02
- **발신**: 프론트엔드 대시보드 개발팀
- **수신**: 백엔드 데이터 파이프라인 및 계량경제학 API 개발팀
- **우선순위**: 🚨 긴급 (CRITICAL - 무관용 가짜 데이터 배제 원칙)
- **대상 엔드포인트**:
  1. `GET /api/v6/report/cross-synergy-matrix` (크로스 시너지 & CAPA 분석 메인 API)
  2. `GET, POST /api/v6/admin/capacity/master` (수용량 마스터 DB 동기화 API)
  3. `POST /api/v6/admin/capacity/reset` (수용량 마스터 표준 시드 복구 API)
- **관련 파일**: `src/pages/SynergyCorrelation.tsx`, `src/components/synergy/*`, `src/pages/AdminCapacity.tsx`

---

## 1. 개요 및 배경 (Background & Objective)

현재 대시보드의 **[인과 시너지·상관 분석]** 화면은 리조트 내 앵커 시설(골프장, 객실, 레저 등)의 모객 및 매출 변화가 타 부대영업장(식음, 레저, 편의시설)에 미치는 **순수 인과 낙수효과(Pure Spillover Effect)** 및 **수용 한계 병목(Capacity Bottleneck)**을 분석하는 핵심 경영진 의사결정 도구입니다.

그러나 현재 백엔드 API(`cross-synergy-matrix`) 응답 및 데이터 구조를 전수 분석한 결과:
1. 수용량(CAPA) 마스터가 DB 테이블로 관리되지 않고 코드 내에 **임의 상수(Mocking)**로 하드코딩되어 있음.
2. 모든 레저 시설의 수용량이 `271,500`(1,500명 × 181일)으로 일괄 고정되어 점유율이 왜곡됨.
3. 점심/저녁 피크 시간대 병목이 발생함에도 1일 전체 평균으로 나누어 **피크 타임 병목(CRITICAL) 감지가 실패**함.
4. 소비 시점 타임래그(당일 vs 익일) 및 초과 수요로 인한 기회손실액(`missedSpilloverRevenue`)이 0원 또는 임의 추정치로 반환됨.

따라서 벨포레 데이터 헌법(0-Variance, 무관용 가짜 데이터 배제)에 의거하여, **정식 DB 스키마 구축 및 100% 실측 시계열 기반의 완제품 데이터 파이프라인 보강**을 요청합니다.

---

## 2. 현황 결함 및 근본 원인 정밀 분석 (Deficiencies & Root Cause)

### 2.1. [결함 1] 레저 시설 최대 수용량(Max Capacity) 일괄 하드코딩
- **현상**:
  - `anchor=WONDERPOOL`: `maxCapacity: 271500`, 점유율 `0.2%`
  - `anchor=MEDIA_ART`: `maxCapacity: 271500`, 점유율 `4.7%`
  - `anchor=FARM`: `maxCapacity: 271500`, 점유율 `5.8%`
  - `anchor=AMUSEMENT`: `maxCapacity: 271500`, 점유율 `8.1%`
- **원인**: 백엔드 코드 내에서 시설별 실제 수용 정원(루지 카트 수, 워터파크 동시 락커 수, 목장 동시 입장 정원 등)을 조회하지 않고, `1,500명 × 조회일수(181일) = 271,500`으로 일괄 하드코딩 처리됨.
- **영향**: 원더풀이나 목장 등 성수기 주말 피크 시 포화 상태에 이름에도 불구하고 대시보드상에는 점유율이 0~8%로 표시되어 경영진이 "인프라가 텅텅 비어 있다"고 심각하게 오판하게 됨.

---

### 2.2. [결함 2] 일평균 단순 역산으로 인한 '시간대별 피크 병목(Peak Bottleneck)' 탐지 실패
- **현상**:
  - `쿠치나` (조식/뷔페): 실제 주말 아침 08:00~10:00에 90% 이상 만석이 되어 대기줄이 길어짐에도 API는 `currentCapacityUtilization: 26.7%`, `bottleneckRisk: SAFE`로 반환.
  - `남도예담` (식음): 주말 점심 12:00~14:00 만석임에도 `currentCapacityUtilization: 64.7%`, `bottleneckRisk: SAFE`로 반환.
- **원인**: POS의 시간대별 주문 내역(`sale_time` / `order_time`)을 집계하지 않고, `기간 총매출 ÷ (좌석수 × 회전율 × 기간일수)` 형태의 1일 평균으로 계산하여 피크 시간대의 압축 수요가 희석됨.
- **요청 사항**: POS 영수증 시간대를 기반으로 피크 2~3시간 윈도우(`peakHourWindow`, 예: `12:00-14:00`, `08:00-10:00`)의 **피크 시간 점유율(`peakHourCapacityUtilization`)**을 산출하고, 이 수치가 80% 이상이면 `WARNING`, 90% 이상이면 `CRITICAL`로 판정해야 함.

---

### 2.3. [결함 3] 수용 한계 초과에 따른 기회손실액(`missedSpilloverRevenue`) 상시 0원
- **현상**: 모든 매장의 `missedSpilloverRevenue: 0`으로 고정 반환.
- **원인**: 앵커 시설 모객이 폭증했을 때 부대시설의 수용 능력을 초과하여 발생한 "초과 수요(Spillover Overflow)"를 계산하는 비즈니스 수식이 누락됨.
- **요청 수식**:
  $$\text{초과 인원} = \max(0, \text{예측 수요 인원} - \text{최대 일일 수용 가능 인원})$$
  $$\text{기회손실액} = \text{초과 인원} \times \text{영업장 평균 객단가(Base Unit Price)}$$

---

### 2.4. [결함 4] 캐파 마스터의 DB 부재 및 프론트엔드-백엔드 데이터 격리
- **현상**: 프론트엔드 관리자 화면(`AdminCapacity.tsx`)에서 변경한 수용량 설정값이 백엔드 DB와 연동되지 않고 Firebase/LocalStorage에만 머무름.
- **요청 사항**: MariaDB에 `dim_facility_capacity_v6` 테이블을 신설하고, 백엔드 API가 이 테이블의 최신 설정값을 읽어서 `cross-synergy-matrix` 연산에 반영하도록 일원화.

---

## 3. 백엔드 DB 스키마 설계안 (Target DDL)

### 3.1. `dim_facility_capacity_v6` (영업장별 수용력 및 병목 기준 마스터)
```sql
CREATE TABLE IF NOT EXISTS `dim_facility_capacity_v6` (
  `shop_code` VARCHAR(50) NOT NULL COMMENT '영업장 고유 코드 (예: SHOP_STD_001)',
  `shop_name` VARCHAR(100) NOT NULL COMMENT '표준 영업장명 (mat_v6_data_mart_revenue 일치)',
  `category_code` VARCHAR(50) NOT NULL COMMENT '소속 카테고리 (ROOM, GOLF, FNB, BANQUET, LEISURE, MOTO, OTHER 등)',
  `seating_capacity` INT NOT NULL DEFAULT 0 COMMENT '물리적 좌석수/동시 수용 인원 (단위: 석/명/실)',
  `daily_turnover_rate` DECIMAL(4,2) NOT NULL DEFAULT 1.00 COMMENT '표준 1일 회전율 (예: 식음 2.5회, 객실 1.0회)',
  `max_daily_capacity_units` INT GENERATED ALWAYS AS (ROUND(`seating_capacity` * `daily_turnover_rate`)) STORED COMMENT '일일 최대 수용 가능 단위',
  `unit_name` VARCHAR(20) NOT NULL DEFAULT '명' COMMENT '단위명 (명, 실, 건, 대)',
  `base_unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '기본 객단가 (기회손실 및 매출 한계치 산정용)',
  `peak_hour_window` VARCHAR(50) DEFAULT '12:00-14:00' COMMENT '피크 시간대 윈도우',
  `warning_threshold_pct` DECIMAL(5,2) NOT NULL DEFAULT 80.00 COMMENT '주의(WARNING) 점유율 임계치 (%)',
  `critical_threshold_pct` DECIMAL(5,2) NOT NULL DEFAULT 90.00 COMMENT '경보(CRITICAL) 점유율 임계치 (%)',
  `allow_spillover` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '낙수효과 대상 여부',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shop_code`),
  UNIQUE KEY `uk_shop_name` (`shop_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='벨포레 V6 시설별 캐파/수용량 마스터';
```

---

## 4. 신규 및 보강 API 엔드포인트 명세

### 4.1. [API 1] 수용량 마스터 관리자 CRUD API
- **`GET /api/v6/admin/capacity/master`**:
  - `dim_facility_capacity_v6`의 전체 목록 반환.
- **`POST /api/v6/admin/capacity/master`**:
  - 관리자가 수정한 좌석수, 회전율, 객단가, 피크시간대를 일괄 `UPSERT` 저장.
- **`POST /api/v6/admin/capacity/reset`**:
  - 벨포레 공식 38개 표준 영업장 기준값으로 복구.

---

### 4.2. [API 2] `GET /api/v6/report/cross-synergy-matrix` 응답 규격 보강

```typescript
export interface CrossSynergyApiResponse {
  status: 'success' | 'error';
  viewMode: 'SINGLE_DAY' | 'DATE_RANGE';
  
  // 1. Fail-Stop 플래그 (단일 일자 조회 시 true)
  insufficientDataForRegression: boolean;
  
  // 2. 앵커 시설 실측 데이터 (절대 하드코딩 금지)
  anchor: {
    code: string;               // 예: "GOLF", "ROOM", "MOUNTAIN_CART"
    name: string;               // 예: "골프장", "객실", "마운틴카트(루지)"
    categoryName: string;       // 예: "골프", "객실", "레저본부"
    periodTotalRevenue: number; // 조회 기간 실측 총결제액 (원)
    dailyAvgRevenue: number;    // 일평균 매출 (원)
    totalVisitors: number;      // 총 입장객/이용객 수
    maxCapacity: number;        // 해당 시설의 기간 최대 수용능력 (DB 실측)
    capacityUtilization: number;// 실측 수용 점유율 (%)
  };

  // 3. 계량경제학 외생변수 통제 메타
  exogenousControl: {
    controlledVariables: string[]; // ["주말/공휴일", "강수량(mm)", "평균기온(℃)", "요일고정효과"]
    observationDays: number;       // 실제 분석된 유효 일수 (N)
    totalOffDays: number;          // 주말 및 법정 공휴일 수
  };

  // 4. 전수 매장별 분석 결과 (correlations 배열)
  correlations: Array<{
    shopName: string;
    categoryName: string;
    categoryCode: string;
    
    // (A) 순수 계량경제학 지표 (Frisch-Waugh-Lovell OLS)
    pureCorrelation: number;         // 순수 편상관계수 (-1.0 ~ 1.0)
    pureElasticity: number;          // 앵커 10% 증가 시 순수 증가율 (%)
    pureSpilloverPerMillion: number; // 앵커 100만원 증가 시 순수 낙수액 (원)
    pureSpilloverRevenue: number;    // 기간 총 순수 낙수 기여액 (원)
    
    // (B) 통계적 유의성 및 가설검정
    neweyWestHacTStat: number;      // Newey-West HAC t-통계량
    hacPValue: number;              // p-value
    hacFdrQValue: number;           // Benjamini-Hochberg FDR 보정 q-value
    isHacFdrSignificant: boolean;   // q < 0.05
    grangerCausality: {
      fStatistic: number;
      pValue: number;
      isGrangerCausal: boolean;
    };
    causalInferenceGrade: 'CONFIRMED_TEMPORAL_CAUSAL' | 'CONTEMPORANEOUS_CORRELATION' | 'SPURIOUS';
    isSpurious: boolean;

    // (C) CAPA 실측 지표 (dim_facility_capacity_v6 및 POS 실측 연동)
    seatingCapacity: number;             // DB 등록 좌석/수용단위
    dailyTurnoverRate: number;           // 회전율
    maxDailyCapacityUnits: number;       // 1일 최대 수용단위
    currentOperatingUnits: number;       // 1일 평균 실제 이용단위
    currentCapacityUtilization: number;  // 1일 평균 점유율 (%)
    peakHourCapacityUtilization: number; // 🚨 피크 시간대(점심/저녁) 실측 점유율 (%)
    peakHourWindow: string;              // 피크 시간대 (예: "12:00-14:00")
    bottleneckRisk: 'SAFE' | 'WARNING' | 'CRITICAL'; // 피크 점유율 기준 판정
    missedSpilloverRevenue: number;      // 🚨 수용 한계 초과로 인한 기회손실 추정액 (원)

    // (D) 소비 시점 타임래그 (시계열 CCF 실측)
    timeLagDistribution: {
      sameDayRatio: number; // 당일(T+0) 소비 비중 (%)
      nextDayRatio: number; // 익일(T+1) 지연 소비 비중 (%)
    };

    // (E) 외생변수 감응도
    exogenousSensitivities: {
      holidayPremiumPct: number; // 주말 프리미엄 (%)
      rain10mmImpactPct: number; // 강수 10mm당 영향 (%)
      temp1degImpactPct: number; // 기온 1도 상승당 영향 (%)
    };

    // (F) 매장 기초 실적
    totalRevenue: number;
    dailyAvgRevenue: number;
  }>;

  // 5. AI 경영진 의사결정 전략 권고 (실측 데이터 기반 자동 생성)
  executiveActionableInsights: Array<{
    type: 'BUNDLING' | 'OPERATIONS' | 'CAPACITY_ALERT' | 'DATA_INSUFFICIENT';
    badge: string;
    targetFacility: string;
    secondaryFacility?: string;
    insight: string;
  }>;
}
```

---

## 5. 단계별 검증 및 테스트 시나리오 (Verification Scenarios)

1. **단일 일자(N=1) 테스트**:
   - `startDate=2026-06-30&endDate=2026-06-30` 호출 시:
   - `insufficientDataForRegression: true` 반환 여부 확인.
   - 가짜 회귀분석 수치 없이 `DATA_INSUFFICIENT` 전략 권고 1건 정상 반환 확인.
2. **다중 일자(상반기 전체) 테스트**:
   - `startDate=2026-01-01&endDate=2026-06-30` 호출 시:
   - `anchor` 객체의 `periodTotalRevenue`가 상반기 실매출(예: 골프 35.2억, 객실 21.1억)과 1원 단위까지 일치하는지 확인.
   - `WONDERPOOL`, `MEDIA_ART`, `FARM`, `AMUSEMENT`의 `maxCapacity`가 각 시설의 실제 등록 캐파로 각각 다르게 계산되는지 확인.
   - `쿠치나` 및 `남도예담`의 `peakHourCapacityUtilization`이 점심/조식 피크 시간대 주문량을 반영하여 정상 산출되는지 확인.
   - 수용 한계 초과 시설에 대해 `missedSpilloverRevenue`가 0원 이상으로 계산되는지 확인.

---

## 6. 결론 및 배포 요청

프론트엔드 대시보드는 현재 **임의 추정치 및 하드코딩 삼항연산자를 모두 걷어내고 백엔드 직결(Pure Consumer)** 상태로 대기하고 있습니다.
백엔드 팀에서는 위 명세에 따라:
1. `dim_facility_capacity_v6` 테이블 생성 및 표준 데이터 시딩
2. POS 영수증 시간대 기반 피크 점유율 및 타임래그 실측 연산 로직 구현
3. `cross-synergy-matrix` 라우터 배포

를 완료해 주시면, 리조트 전체의 인과 낙수효과와 병목 관리가 **100% 무결점 실측 데이터**로 완전 가동됩니다.
기술 문의나 추가 인터페이스 조율이 필요한 경우 즉시 프론트엔드 팀으로 연락 바랍니다.
