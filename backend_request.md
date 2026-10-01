# 프론트엔드/백엔드 개발팀 협조 요청 (수석 DBA 하달)

수석 DBA(관리자)님의 승인을 받은 '0-Variance' 아키텍처 정규화 작업이 DB 단에서 완료되었습니다.
이에 따라 프론트엔드 연동 API에 대한 변경을 요청합니다.

## 변경 대상 파일
- `src/app/api/v6/report/channel-correlation/route.ts`

## 변경 내용 (Pure Consumer Principle 준수)
기존 API 라우트에서 `fact_room_sales_v6` (원천 팩트 테이블)를 직접 조회(Shift-Right)하던 로직을 전면 철회하십시오.
이제부터 DB 단에서 ETL 프로시저(`sp_refresh_v6_mat_mart`)가 매일 새벽 또는 실시간으로 채널 데이터를 집계하여 **`mat_v6_channel_correlation_daily`** 마트 테이블에 적재합니다.

프론트엔드 API는 어떠한 조인이나 연산 없이, 오직 해당 마트 테이블만 단순 `SELECT` 하도록 코드를 롤백/수정해야 합니다.

### [기대하는 쿼리 로직]
```sql
SELECT 
    sale_date,
    standard_channel_name,
    category,
    total_revenue,
    room_count
FROM mat_v6_channel_correlation_daily
WHERE sale_date BETWEEN ? AND ?
ORDER BY sale_date, standard_channel_name;
```

**[주의 사항]**
- `IFNULL(..., '기타')` 와 같은 하드코딩 매핑은 코드에서 제거되었습니다. 
- 미매핑 채널은 `log_unmapped_channels`에 격리(Soft-Catchall)되며, 대시보드에는 `미분류(격리됨)`이라는 이름으로 출력됩니다.
- API 응답 속도는 마트 조회를 통해 10ms 이내로 단축될 것입니다.

작업이 완료되면 배포 후 이상 유무를 DBA 팀으로 보고해 주시기 바랍니다.

---

# 🚨 가짜 숫자 박멸에 따른 백엔드 API 신설 및 보강 요청 (2026-09-27)

프론트엔드 전수 감사 결과, 화면 단에 숨어있던 **모든 가짜 숫자(Mock 상수, 임의 폴백값, 하드코딩된 단가 및 안분 공식)를 100% 제거**하였습니다.
프론트엔드가 'Pure Consumer(순수 소비자)'로서 어떠한 자의적 추정도 하지 않고 **100% DB 완제품만 받아 렌더링**할 수 있도록, 백엔드 개발팀에 다음 2가지 핵심 API 신설 및 보강을 긴급 요청합니다.

---

## 1. [신규 API 신설] 골프 채널별 실현 그린피 & 팀수 집계 API

### 배경 및 필요성
- 현재 골프 API(`/api/v6/report/golf-channel-teetime-analysis-v2`)는 전사 총액과 총 내장객(`totalPlayers`, `totalGolfRevenue`)만 반환하며, 거래처별(골프존, 스마트스코어, 자사몰, 카카오VX 등) 상세 실적 배열을 내려주지 않습니다.
- DB 확인 결과 `raw_골프_정산_v6`과 `raw_골프_예약_v6`에 이미 예약번호 기준 거래처명과 1인당 순그린피가 적재되어 있으므로, 이를 마트 또는 집계 쿼리로 묶어 신규 엔드포인트로 제공해 주셔야 합니다.

### 요청 엔드포인트
- `GET /api/v6/report/golf-channel-intelligence?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (단일일자: `date=YYYY-MM-DD`)

### 기대하는 응답 스펙 (JSON)
```json
{
  "success": true,
  "summary": {
    "totalTeams": 2517,
    "totalPlayers": 9878,
    "totalGreenFeeRevenue": 500239211,
    "averageGreenFee": 50642,
    "threePlayerTeamsCount": 98,
    "threePlayerLostRevenue": 7656916,
    "joinTeamsCount": 53,
    "memberAnchorRevenue": 26840260
  },
  "channels": [
    {
      "channelName": "골프존",
      "channelType": "OTA",
      "teams": 151,
      "players": 593,
      "revenue": 38773898,
      "avgGreenFee": 65386,
      "discountRate": 15.2,
      "sharePct": 6.0
    },
    {
      "channelName": "스마트스코어",
      "channelType": "OTA",
      "teams": 53,
      "players": 208,
      "revenue": 11751584,
      "avgGreenFee": 56498,
      "discountRate": 22.5,
      "sharePct": 2.1
    },
    {
      "channelName": "전화/예약실",
      "channelType": "DIRECT",
      "teams": 279,
      "players": 1093,
      "revenue": 61066903,
      "avgGreenFee": 55871,
      "discountRate": 21.9,
      "sharePct": 11.1
    },
    {
      "channelName": "카카오VX",
      "channelType": "OTA",
      "teams": 164,
      "players": 640,
      "revenue": 34346240,
      "avgGreenFee": 53666,
      "discountRate": 28.3,
      "sharePct": 6.5
    },
    {
      "channelName": "자사 홈페이지/APP",
      "channelType": "DIRECT",
      "teams": 519,
      "players": 2038,
      "revenue": 106395828,
      "avgGreenFee": 52206,
      "discountRate": 33.7,
      "sharePct": 20.6
    },
    {
      "channelName": "기타 제휴/동호회",
      "channelType": "OFFLINE",
      "teams": 242,
      "players": 945,
      "revenue": 50127525,
      "avgGreenFee": 53045,
      "discountRate": 36.2,
      "sharePct": 9.6
    },
    {
      "channelName": "히든골프",
      "channelType": "OTA",
      "teams": 383,
      "players": 1500,
      "revenue": 78459000,
      "avgGreenFee": 52306,
      "discountRate": 41.6,
      "sharePct": 15.2
    },
    {
      "channelName": "골프락",
      "channelType": "OTA",
      "teams": 581,
      "players": 2282,
      "revenue": 106729140,
      "avgGreenFee": 46770,
      "discountRate": 43.7,
      "sharePct": 23.1
    },
    {
      "channelName": "티업엔조이",
      "channelType": "OTA",
      "teams": 146,
      "players": 579,
      "revenue": 26064843,
      "avgGreenFee": 45017,
      "discountRate": 50.6,
      "sharePct": 5.9
    }
  ]
}
```

---

## 2. [기존 API 보강] 단체영업(세미나) 주중·주말 객실/매출 실측 지표 추가

### 배경 및 필요성
- `GET /api/v6/report/room-channel-sales` API는 객실 판매채널별 세그먼트 데이터를 반환하지만, 기업 세미나/단체영업의 주중(일~목 체크인) vs 주말(금·토 체크인)의 객실수/매출/ADR 집계 필드(`seminarShare`)를 내려주지 않고 있습니다.
- 백엔드에서 체크인 요일(`DAYOFWEEK(check_in_date)`)을 기준으로 집계하여 응답 페이로드에 `seminarShare` 필드를 공식 포함해 주시기 바랍니다.

### 요청 응답 스펙 (JSON 페이로드 추가 필드)
```json
{
  "data": [ ...기존 세그먼트 배열... ],
  "seminarShare": {
    "weekday": {
      "label": "주중 (일~목 체크인)",
      "daysCount": 23,
      "totalRooms": 996,
      "seminarRooms": 517,
      "sharePct": 51.9,
      "totalRevenue": 111602480,
      "seminarRevenue": 48481030,
      "revenueSharePct": 43.4,
      "averageAdr": 93774
    },
    "weekend": {
      "label": "주말 (금·토 체크인)",
      "daysCount": 8,
      "totalRooms": 752,
      "seminarRooms": 65,
      "sharePct": 8.6,
      "totalRevenue": 145725579,
      "seminarRevenue": 12299984,
      "revenueSharePct": 8.4,
      "averageAdr": 189231
    },
    "total": {
      "label": "통합 (전체)",
      "daysCount": 31,
      "totalRooms": 1748,
      "seminarRooms": 582,
      "sharePct": 33.3,
      "totalRevenue": 257328059,
      "seminarRevenue": 60781014,
      "revenueSharePct": 23.6,
      "averageAdr": 104435
    }
  }
}
```

---

---

## 3. [처리 완료 확인 보고] 1차 요청 사항 전원 배포 완료 (2026-09-27 커밋 9f29de0)
* ✅ `GET /api/v6/report/channel-correlation`: `mat_v6_channel_correlation_daily` 마트 기반 순수 조회 롤백 완료 (< 5ms).
* ✅ `GET /api/v6/report/room-channel-sales`: `seminarShare` 주중/주말/통합 실측 세미나 비중 탑재 완료.
* ✅ `GET /api/v6/report/golf-channel-intelligence`: 9대 채널 실측 그린피 및 요약(가중평균 ₩50,642) 신설 완료.

---

# 🚀 [2차 백엔드 보강 요청] 100% 무결성 완성(Zero-Hallucination)을 위한 골프 상세 마트 스펙 (2026-09-27)

프론트엔드 전수 정밀 감사에서 **171건의 잔존 목업 숫자와 가짜 비율 공식(* 0.289, * 0.017 등)을 완전 박멸**함에 따라, 현재 대기(Pending) 상태로 격리된 3대 세부 차트의 실측 완제품 제공을 백엔드 개발팀 및 수석 DBA님께 요청드립니다.

---

### 요청 1. [골프] 시간대 × 요일별 2D 수율(Yield) & 가동률 마트 (`timeSlotYield`)

* **대상 API**: `GET /api/v6/report/golf-channel-intelligence?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
* **현황**: 프론트엔드가 과거 하드코딩되어 있던 28개 셀(72.4%, 99.8% 등)을 완전 삭제하고, 현재 **[시간대별 티타임 가동률 마트 집계 준비 중]** 클린 무결성 안내 UI로 대체해 둔 상태입니다.
* **필요 마트 테이블**: `mat_v6_golf_teetime_hourly_yield` (또는 `sp_refresh_v6_golf_marts` 내 집계)
* **산출 규칙 (Definition)**:
  * **요일 (7개)**: 월(0), 화(1), 수(2), 목(3), 금(4), 토(5), 일(6)
  * **시간 슬롯 (4개)**:
    * `06~08 (얼리)` (timeSlotIndex: 0)
    * `08~11 (1부)` (timeSlotIndex: 1)
    * `11~14 (2부)` (timeSlotIndex: 2)
    * `14~ (레이트)` (timeSlotIndex: 3)
  * **가동률 (`occupancy`)**: $(\text{실제 내장 완주 팀 수} \div \text{총 오픈 티타임 수}) \times 100$ (%)
  * **실현 평균 그린피 (`avgGreenFee`)**: 해당 시간대의 $\text{총 순그린피 매출} \div \text{총 내장객 수}$ (원)
* **기대 JSON 응답 구조**:
```json
"timeSlotYield": [
  { "dayOfWeek": "월", "timeSlot": "06~08 (얼리)", "dayIndex": 0, "timeSlotIndex": 0, "occupancy": 74.0, "avgGreenFee": 42000, "teams": 18 },
  { "dayOfWeek": "월", "timeSlot": "08~11 (1부)", "dayIndex": 0, "timeSlotIndex": 1, "occupancy": 91.5, "avgGreenFee": 51000, "teams": 26 },
  { "dayOfWeek": "월", "timeSlot": "11~14 (2부)", "dayIndex": 0, "timeSlotIndex": 2, "occupancy": 86.0, "avgGreenFee": 49500, "teams": 24 },
  { "dayOfWeek": "월", "timeSlot": "14~ (레이트)", "dayIndex": 0, "timeSlotIndex": 3, "occupancy": 68.0, "avgGreenFee": 40500, "teams": 17 },
  ...
  // 총 28개 배열 (월~일 7요일 × 4개 시간 슬롯)
]
```

---

### 요청 2. [골프] 1~2인 조인(Join) 예약 유입 채널 랭킹 (`joinRanking`)

* **대상 API**: `GET /api/v6/report/golf-channel-intelligence`
* **현황**: `summary.joinTeamsCount` (실측 1팀 또는 N팀)은 수신되나, 조인 고객들이 어떤 플랫폼(카카오VX, 골프존, 자사앱 등)을 통해 예약했는지의 채널별 분할 데이터가 없어 프론트엔드가 '플랫폼 마트 대기 중' 상태로 표시하고 있습니다.
* **산출 규칙**:
  * 예약 데이터 중 내장 인원이 1인 또는 2인인 팀(`player_count IN (1, 2)`)의 예약 경로(`channel_name`)별 집계.
* **기대 JSON 응답 구조**:
```json
"joinRanking": [
  { "channelName": "카카오VX", "teams": 1, "players": 2, "sharePct": 100.0, "avgGreenFee": 52766 },
  { "channelName": "자사 홈페이지/APP", "teams": 0, "players": 0, "sharePct": 0.0, "avgGreenFee": 0 }
]
```

---

### 요청 3. [골프] 팀 내 회원 동반 구조 및 앵커 효과 상세 분할 (`memberSynergy`)

* **대상 API**: `GET /api/v6/report/golf-channel-intelligence`
* **현황**: `summary.memberAnchorRevenue: 22239494` (실측 ₩22,239,494원)는 정상 수신되나, 팀 단위의 회원 동반 형태별 분포가 없어 프론트엔드가 총액만 표출하고 있습니다.
* **산출 규칙**:
  * 동일 팀(동일 티타임 4인) 내의 회원 등록 인원수 기준 분류:
    * `pureNonMember`: 회원 0명 + 비회원 4명인 팀 수, 비율, 그린피 매출
    * `member1Non3`: 회원 1명 + 비회원 3명인 팀 수, 비율, 비회원 3명이 낸 그린피 순매출
    * `member2Non2`: 회원 2명 + 비회원 2명인 팀 수, 비율, 비회원 2명이 낸 그린피 순매출
    * `member3to4`: 회원 3명 또는 4명인 팀 수, 비율, 그린피 순매출
    * `totalAnchorRevenue`: 회원이 동반 비회원을 견인하여 발생한 비회원 그린피 총 순매출 (`summary.memberAnchorRevenue`와 일치)
* **기대 JSON 응답 구조**:
```json
"memberSynergy": {
  "pureNonMember": { "teams": 1485, "ratio": 59.0, "revenue": 295141134 },
  "member1Non3": { "teams": 727, "ratio": 28.9, "nonMemberRevenue": 22239494 },
  "member2Non2": { "teams": 209, "ratio": 8.3, "nonMemberRevenue": 0 },
  "member3to4": { "teams": 96, "ratio": 3.8, "revenue": 0 },
  "totalAnchorRevenue": 22239494
}
```

---

### 요청 4. [인프라/성능] `mat_v6_golf_reservation_channel_daily` 3개년 구간 인덱스 최적화

* **배경**: 대시보드의 '전체 자산 누적 (`viewScope === FULL_ASSET`)' 조회 시, `startDate=2024-01-01&endDate=2026-12-31`와 같은 3개년 광구간 쿼리에서 응답 시간이 5초를 초과하여 타임아웃이 발생할 수 있습니다.
* **요청 사항**:
  1. `mat_v6_golf_reservation_channel_daily` 테이블에 `(reservation_date, channel_name)` 복합 인덱스 부여 확인.
  2. 필요시 연도별/월별 집계 롤업 마트(`mat_v6_golf_channel_monthly`)를 별도로 신설하여 다중 연도 조회 시 10ms 이내 반환 보장.

---

### 5. 프론트엔드-백엔드 R&R 준수 선언
프론트엔드는 이제 **단 한 줄의 가짜 숫자, 단 한 개의 임의 비율 곱셈도 절대 코드에 삽입하지 않습니다.**
백엔드가 마트 테이블에서 정밀하게 산출하여 내려주는 완성된 DB 데이터만을 순수하게 소비(Pure Consumer)하여 표출하므로, 위 항목들을 반영해 주시면 대시보드의 모든 골프 인텔리전스 화면이 100% 실시간 DB 정합을 완료하게 됩니다.

---

# 🚨 [3차 긴급 백엔드 요청서] 매장 시너지 분석 API(synergy-store-correlation-v2) 낙수율(Spillover Rate) 왜곡 산식 전면 개편 요청

### 접수 일시: 2026-09-27
### 요청 주체: 프론트엔드 개발팀 및 데이터 통제 센터
### 수신: 백엔드 개발팀, 수석 DBA

---

## 1. 개요 및 배경

대표님 경영 검토 및 프론트엔드 UI 실사 중, **"상관계수에 관계없이 낙수율이 상위 매장에서 전부 100%로 출력되는 문제"**가 지적되었습니다.
데이터 역추적 결과, 백엔드 API(`GET /api/v6/report/synergy-store-correlation-v2`) 내 낙수율(`spilloverRate`) 연산 수식의 수학적 맹점과 상한선 클리핑(`Math.min(totalSales, ...)`)으로 인해 **상관계수가 0.14에 불과한 매장까지 낙수율이 100%로 둔갑하는 심각한 지표 왜곡**이 확인되었습니다.

이에 따라 백엔드 수식의 전면 개편을 정식 요청합니다.

---

## 2. 결함 원인 정밀 분석 (Root Cause Analysis)

### 대상 파일 및 위치
* **파일**: `src/app/api/v6/report/synergy-store-correlation-v2/route.ts` (L459 ~ L464)
* **현행 산출 코드**:
  ```typescript
  // Spillover & Lift 연산
  const estimatedCorrelatedSales = Math.min(totalSales, Math.max(0, revPasSlope * totalRoomsSold));
  const spilloverRate = totalSales > 0
    ? Number(((estimatedCorrelatedSales / totalSales) * 100).toFixed(1))
    : 0;
  ```

### 결함 메커니즘
1. **객실 탄력도(Elasticity) $\ge 1.0$ 매장의 수학적 100% 고정 맹점**:
   * 객실 탄력도 공식: $\text{elasticity} = \text{revPasSlope} \times \frac{\bar{X}}{\bar{Y}}$
   * $\text{elasticity} \ge 1.0 \iff \text{revPasSlope} \times \bar{X} \ge \bar{Y} \iff \text{revPasSlope} \times \text{totalRoomsSold} \ge \text{totalSales}$
   * 즉, **객실 탄력도가 1.0배 이상인 매장은 무조건 `revPasSlope * totalRoomsSold`가 매장 총매출(`totalSales`)을 초과**합니다.
   * 초과분은 `Math.min(totalSales, ...)`에 의해 분모와 동일한 `totalSales`로 잘려나가므로, **결과는 필연적으로 $100.0\%$로 고정**됩니다.
   * 현재 화면이 `객실 탄력도 높은 순`으로 정렬되어 있어, 상위 10개 매장이 100%로 도배되는 원인입니다.

2. **상관계수($r$) 및 결정계수($R^2$) 미반영 (썸머랜드 왜곡 사례)**:
   * **썸머랜드 실측 데이터 (2026-09)**: 26일 중 **단 하루(9월 7일)에만 120만 원 매출이 발생하고 나머지 25일은 매출이 0원**입니다.
   * 객실 수와 연동성이 없어 피어슨 상관계수는 **$r = 0.1382$ (사실상 무관)**입니다.
   * 그러나 선형 회귀 기울기(`revPasSlope = 1,047.49원`)가 양수로 도출되었고, 여기에 9월 누적 객실(2,368실)을 곱하면 **248만 원**이 산출됩니다.
   * 248만 원이 썸머랜드 총매출(119만 원)보다 크므로, **상관계수가 0.14에 불과한데도 낙수율 100%로 둔갑**합니다.

3. **비즈니스 정의(화면 툴팁)와의 괴리**:
   * 대시보드 툴팁 정의: *"객실 투숙객 중 해당 부대시설을 동시에 방문하여 결제한 비율"*
   * 실측 팩트: 썸머랜드 방문객은 328명이고 객실 투숙객은 10,002명이므로 실제 방문 전환율은 **3.3%**입니다.
   * 백엔드는 매출 기준 불완전 추정치를 산출하고 있어 경영진의 직관과 심각하게 괴리됩니다.

---

## 3. 백엔드 개선 대안 및 권장 산식

백엔드 개발팀 및 DBA 협의 하에 아래 두 가지 대안 중 하나로 즉시 개편을 요청합니다.

### [대안 A] 통계적 신뢰도 반영 산식 (결정계수 $R^2$ 가중) - ★ 강력 권장
기존의 추정 연동 매출에 통계적 설명력 지표인 **결정계수($R^2 = r^2$)를 곱하여**, 상관관계가 없는 노이즈 매장의 왜곡을 원천 차단합니다.

* **수식**:
  $$\text{estimatedCorrelatedSales} = \min\Big(\text{totalSales}, \ \max(0, \text{revPasSlope} \times \text{totalRoomsSold})\Big) \times R^2$$
  $$\text{spilloverRate} = \text{totalSales} > 0 \ ? \ \min\left(100, \ \frac{\text{estimatedCorrelatedSales}}{\text{totalSales}} \times 100\right) : 0$$
* **검증 결과 (2026-09 실측치 적용 시)**:
  * **썸머랜드**: $100\% \times 0.019 (R^2) = \mathbf{1.9\%}$ (100% $\rightarrow$ 1.9%로 왜곡 완전 해소!)
  * **벨포레 목장(체험)**: $100\% \times 0.449 (R^2) = \mathbf{44.9\%}$ (현실적 수치 안착)
  * **미디어-뮤지엄카페**: $100\% \times 0.469 (R^2) = \mathbf{46.9\%}$
  * **CU편의점**: $96.9\% \times 0.490 (R^2) = \mathbf{47.5\%}$

---

### [대안 B] 진성 투숙객 방문 전환율 (툴팁 비즈니스 정의 완전 일치형)
방문객 집계가 지원되는 매장(`visitor_count > 0`)에 대해, 객실 총 투숙객 대비 매장 방문객 비율을 직접 계산합니다.

* **수식**:
  $$\text{spilloverRate} = \text{totalRoomGuests} > 0 \ ? \ \min\left(100, \ \frac{\text{visitorCount}}{\text{totalRoomGuests}} \times 100\right) : 0$$
* **검증 결과**:
  * **썸머랜드**: $328명 \div 10,002명 = \mathbf{3.3\%}$
  * **벨포레 목장(체험)**: $4,686명 \div 10,002명 = \mathbf{46.9\%}$
  * **벨포레 목장**: $9,306명 \div 10,002명 = \mathbf{93.0\%}$

---

## 4. 백엔드 코드 수정 가이드 (대안 A 기준 적용 예시)

`src/app/api/v6/report/synergy-store-correlation-v2/route.ts`의 L459 ~ L467을 다음과 같이 교체:

```typescript
// =========================================================================
// [개선] Spillover & Lift 연산 (결정계수 R² 가중치를 통한 상관관계 결합)
// =========================================================================
const rawCorrelatedSales = Math.min(totalSales, Math.max(0, revPasSlope * totalRoomsSold));
// 상관계수가 0 이하이거나 신뢰도가 낮으면 낙수율을 0으로 수렴시킴
const validRSquared = correlationCoefficient > 0 ? rSquared : 0;
const estimatedCorrelatedSales = rawCorrelatedSales * validRSquared;

const spilloverRate = totalSales > 0
  ? Number(((estimatedCorrelatedSales / totalSales) * 100).toFixed(1))
  : 0;

const reverseSpillover = totalRoomSales > 0
  ? Number(((estimatedCorrelatedSales / totalRoomSales) * 100).toFixed(1))
  : 0;
```

---

## 5. 기대 효과 및 완료 기준 (Acceptance Criteria)

1. **상관계수 무시 현상 완전 해소**: 상관계수 $r < 0.2$ 수준의 무관 매장(썸머랜드 등)이 100%로 출력되는 버그가 0건일 것.
2. **변별력 확보**: 객실 탄력도가 1.0배를 초과하는 매장들이 일괄 100%로 뭉개지지 않고, 실제 상관관계 강도에 따라 차등 분산되어 의사결정 가치를 제공할 것.
3. 배포 완료 후 `GET /api/v6/report/synergy-store-correlation-v2`의 JSON 응답 검증 결과를 공유해 주시기 바랍니다.

---

## 6. [긴급 API 보강] `/api/v6/dashboard/revenue-summary` 평형별 모수 왜곡 정상화 및 ADR 완제품 필드 추가 요청

### 1) 배경 및 결함 분석
1. **51평 가동률 100% 모수 왜곡 (분모가 분자를 따라가는 자멸적 버그)**:
   - 51평(커넥티드 룸)의 기본 `capacity`와 `rate`에 '동적 조립 가능 재고(dynamicCapacity)'가 기본값으로 매핑되어 있습니다.
   - 16평과 35평이 많이 팔려 조립 잔여 재고가 0실이 되면, 백엔드가 `dynamicCapacity = 740 + 0 = 740실`로 분모를 줄여버려 `740건 / 740실 = 100%`라는 비현실적인 가짜 100%가 노출됩니다.
   - 경영진 가동률 지표의 단일 진실 공급원(SSOT)은 벨포레 물리 객실 기준이어야 하므로, 51평의 기본 `capacity`와 `rate`는 **`fixedCapacity(1,080실)`** 및 **`fixedOccupancyRate(69%)`**로 확정되어야 합니다.
2. **ADR 필드 누락 버그**:
   - `roomSummaryByType` 배열 객체 내에 `adr` 필드가 아예 누락(`undefined`)되어 프론트엔드 대시보드에 ADR이 전부 `0원` 또는 `-`로 출력됩니다.
   - 백엔드에서 `adr: Math.round(revenue / roomsSold)`를 공식 필드로 산출하여 응답 객체에 탑재해야 합니다.
3. **물리 점유율 지표 완제품 제공**:
   - `lodgingStats`에 `physicalOccRate`(실운영 물리 점유율), `standardOccRate`(일반 점유율), `connectingOccRate`(커넥팅 점유율)를 공식 완제품 필드로 내려주어 프론트엔드가 자체 나눗셈을 하지 않도록 해야 합니다.

### 2) 기대하는 응답 스펙 (JSON)
```json
"roomSummaryByType": [
  {
    "roomType": "16평",
    "roomsSold": 882,
    "revenue": 86326576,
    "capacity": 1020,
    "rate": 86,
    "fixedCapacity": 1020,
    "fixedOccupancyRate": 86,
    "dynamicCapacity": 1020,
    "dynamicOccupancyRate": 86,
    "adr": 97876
  },
  {
    "roomType": "35평",
    "roomsSold": 746,
    "revenue": 131731876,
    "capacity": 1020,
    "rate": 73,
    "fixedCapacity": 1020,
    "fixedOccupancyRate": 73,
    "dynamicCapacity": 1020,
    "dynamicOccupancyRate": 73,
    "adr": 176584
  },
  {
    "roomType": "51평",
    "roomsSold": 740,
    "revenue": 192112966,
    "capacity": 1080,
    "rate": 69,
    "fixedCapacity": 1080,
    "fixedOccupancyRate": 69,
    "dynamicCapacity": 740,
    "dynamicOccupancyRate": 100,
    "adr": 259612
  }
],
"lodgingStats": {
  "revenue": 414342964,
  "roomsSold": 2368,
  "totalCapacity": 5250,
  "adr": 174976,
  "physicalOccRate": 45.1,
  "standardOccRate": 30.9,
  "connectingOccRate": 14.2,
  "remainingOccRate": 54.9
}
```

### 3) 완료 기준 (Acceptance Criteria)
1. 51평의 기본 `capacity`가 조립 잔여량에 따라 줄어들지 않고 고정 물리 객실(일 36실 × 일수)을 유지할 것.
2. `roomSummaryByType`의 모든 객실 타입에 `adr` 정수 필드가 포함되어 있을 것.
3. 배포 완료 후 `GET /api/v6/dashboard/revenue-summary?startDate=2026-09-01&endDate=2026-09-30` 테스트 완료 결과를 공유해 주시기 바랍니다.

---

# 7. [긴급 API 보강] 가짜 판명으로 비어있는 자리 및 이상 수치 전수 정상화 요청 (2026-09-27)

프론트엔드 에이전트의 자의적 계산 및 가짜 숫자 전면 박멸(Fail-Stop) 조치 이후, 백엔드 API에서 필드가 누락되었거나 모수가 왜곡되어 **화면에서 비어있거나(`-`) 비정상적인 수치가 도출되는 6대 핵심 영역**을 실사 검증하여 공식 요청합니다.

프론트엔드는 어떠한 나눗셈이나 추론도 하지 않고 **백엔드가 내려주는 완제품 필드만을 1:1 Direct 바인딩**할 준비가 완료되어 있습니다.

---

### [요청 1] `/api/v6/dashboard/revenue-summary` `summary` 객체 내 MTD 객실 판매량 지표 탑재
* **현상 및 근거**:
  * 메인 대시보드(`Home.tsx`)의 MTD 객실 판매 카드에서 전년 동기 판매량(`lyMtdRooms`)과 증감률(`mtdRoomsGrowth`)이 `null`로 떨어져 `-`로 표출됨.
  * 실사 결과: `summary` 객체에 `totalRevenue`, `mtdRevenue`, `mtdGrowth`, `totalRooms`는 있으나, **`mtdRooms`, `mtdRoomsLy`, `mtdRoomsGrowth`, `mtdRoomsDiff` 필드가 누락**되어 있음.
  * 최상위 `lodgingStats`에는 `roomsSold(2,368)`, `lyRoomsSold(2,575)`, `roomsGrowth(-8.0)`가 정상 탑재되어 있으므로, 이를 `summary` 객체에도 표준 규격으로 일치시켜 주십시오.
* **요청 필드 (`summary` 내부)**:
  ```json
  {
    "summary": {
      "mtdRooms": 2368,
      "mtdRoomsLy": 2575,
      "mtdRoomsGrowth": -8.0,
      "mtdRoomsDiff": -207
    }
  }
  ```

---

### [요청 2] `/api/v6/report/monthly-room-efficiency` TrevPAR/TrevPOR 전년비 증감률 완제품 필드 탑재
* **현상 및 근거**:
  * 월별 객실 효율 차트(`MonthlyTrevporChart.tsx`)에서 클라이언트 증감률 계산(`((ty - ly) / ly) * 100`)을 전면 제거함에 따라, 백엔드가 증감률을 내려주지 않아 차트 툴팁 및 상단 카드 증감률이 `-`로 비어있음.
  * 실사 결과: `monthlyComparison[i]`에 총매출 증감률(`growthTotalRate: -0.9`)만 있고, **TrevPAR 증감률(`trevparGrowthRate`)과 TrevPOR 증감률(`trevporGrowthRate`)이 `undefined`** 상태임.
  * 또한 상단 요약 키가 프론트엔드 기대 규격(`summary`)과 달리 `ytdSummary`로 반환되고 있음.
* **요청 필드 (`monthlyComparison[i]` 및 최상위 `summary`)**:
  ```json
  {
    "summary": {
      "ytdPeriodLabel": "1~9월 누적",
      "growthTotalRate": 6.9,
      "growthWithoutGolfRate": 16.8,
      "avgTyTrevpar": 406428,
      "avgLyTrevpar": 380365
    },
    "monthlyComparison": [
      {
        "month": 1,
        "trevparGrowthRate": -0.9,
        "trevporGrowthRate": -8.9,
        "trevparWithoutGolfGrowthRate": 9.1,
        "trevporWithoutGolfGrowthRate": 0.4
      }
    ]
  }
  ```

---

### [요청 3] `/api/v6/dashboard/revenue-summary` 평형별 판매 점유 비중(`salesShareRatio`) 탑재
* **현상 및 근거**:
  * 객실 대시보드(`ResortBusiness.tsx`) 평형별 현황 카드 우측 상단의 "전체 판매 중 비중"이 클라이언트 나눗셈 수식(`((r.roomsSold / lodgingStats.roomsSold) * 100)`)으로 남아있음.
  * `roomSummaryByType`의 각 평형 객체에 ADR과 고정 가동률은 완벽히 탑재되었으나, 전체 객실 중 해당 평형의 판매 비중이 누락됨.
* **요청 필드 (`roomSummaryByType` 내부)**:
  ```json
  [
    {
      "roomType": "16평",
      "roomsSold": 882,
      "salesShareRatio": 37.2
    },
    {
      "roomType": "35평",
      "roomsSold": 746,
      "salesShareRatio": 31.5
    },
    {
      "roomType": "51평",
      "roomsSold": 740,
      "salesShareRatio": 31.3
    }
  ]
  ```

---

### [요청 4] `/api/v6/report/corporate-group-sales` 단체 골프/레저 부대매출 연동 및 재방문 지표 탑재
* **현상 및 근거**:
  * 단체 영업 분석(`GroupSales.tsx`)에서 단체 고객의 부대매출 중 골프와 레저가 **무조건 `0원`**으로 집계됨 (`golfRevenue: 0`, `leisureRevenue: 0`).
  * 단체 행사 객실 고객이 골프장 및 루지/모토아레나를 이용했으나, 단체 예약 번호(Master Folio / Group ID)와 골프/레저 POS 매출이 데이터 마트에서 매핑되지 않아 누락됨.
  * 또한 복수 재방문 기업 수와 재방문율 지표가 누락되어 있음.
* **요청 조치**:
  1. `mat_v6_corporate_group_sales` 적재 시 골프/레저 원천 전표의 단체 거래처 매핑 연동.
  2. `summary` 객체 내에 `repeatGroupsCount`, `repeatGroupRate` 완제품 필드 탑재.
  ```json
  {
    "summary": {
      "totalGroups": 300,
      "golfRevenue": 12500000,
      "leisureRevenue": 4800000,
      "repeatGroupsCount": 42,
      "repeatGroupRate": 14.0
    }
  }
  ```

---

### [요청 5] `/api/v6/report/business-plan` 가용 객실 모수 정상화 및 SSOT 조직 명칭 정규화
* **현상 및 근거**:
  * 목표 시뮬레이터에서 9월 30일 구간 조회 시 `availableRooms`가 `175실`로 하드코딩되어, 월간 TrevPAR가 **13,380,497원**(목표 23.4억 / 175실)이라는 비정상적인 수치로 튀어 나옴. (정상 모수는 30일 × 175실 = 5,250실).
  * 또한 `categoryName`이 대표님 공식 SSOT 명칭인 `리조트사업본부`가 아닌 구형 `콘도` 문자열로 반환되어 프론트엔드 명칭 헌법과 충돌함.
* **요청 조치**:
  1. `summary.availableRooms`를 기간 누적 물리 객실수(30일 = `5250`)로 정규화하고, `monthlyTrevPar` 산식을 `grandTarget2026 / 5250`(= 446,017원)으로 정상화.
  2. `categoryName`을 공식 조직 명칭인 **`리조트사업본부`**로 100% 정규화.

---

# 🚨 [2026-09-28 긴급 하달] 세일즈본부 세미나 전년동기(YoY) 비교 및 장소별(Venue) 판매 분석 API 신설 요청

> **"세일즈 본부페이지에 주중 주말 판매객실중 점유율중 기간을 선택해서 보여줄 때는 작년 같은 기간과 비교 가능하게 해줘. 추가로 하단에 장소별 판매현황과 평균가격도 알고 싶어. 세미나A, 벨포레홀과 같이 연도별 월별로 몇 개가 팔렸는지도, 가능하다면 단체이름까지도. 무엇보다도 절대로 너가 가짜로 숫자를 넣거나 지어넣으면 안 돼. 필요한 data는 백엔드에게 요청하는 작성문을 만들어."** (대표님/이사님 지시 사항)

프론트엔드는 위 절대 지침 및 'Pure Consumer(순수 소비자)' 원칙에 따라, 클라이언트 단에서 임의로 작년 기간 데이터를 다중 호출하거나 나눗셈/증감률을 직접 계산하지 않고, 또한 장소별 판매 현황에 가짜(Mock) 데이터를 일절 생성하지 않습니다. 
이에 따라 백엔드 데이터 엔지니어링 및 API 개발팀에 아래 두 가지 핵심 API 보강 및 신설을 정식 요청합니다.

---

### [요청 6] `/api/v6/report/room-channel-sales` 세미나 주중/주말 점유율 전년동기(YoY) 및 증감률 완제품 탑재
* **현상 및 필요성**:
  * 현재 대시보드 세일즈본부 상단 3-Column Bento 카드(`전체 판매 객실 대비 단체영업(세미나) 점유율 분석`)에서 조회 기간 선택 시, 당해 연도 실적(`weekday`, `weekend`, `total`)만 단독 반환되고 있습니다.
  * 경영진 및 영업본부장이 임의 기간(예: 2026-01-01 ~ 2026-06-30)을 선택했을 때, **작년 동일 기간(2025-01-01 ~ 2025-06-30)**과의 객실 수, 점유율, 매출, ADR 증감 추이를 즉시 비교 분석할 수 있도록 전년 완제품 데이터가 필수적입니다.
* **통제 기준**:
  * 프론트엔드가 작년 날짜를 계산하여 API를 2회 호출(`startDate=2025-01-01...`)하는 행위는 **다중 호출 금지 헌법**에 위배됩니다.
  * 백엔드 API 라우트(`room-channel-sales`) 내부에서 DB 조회 시 작년 동일 요일/동일 날짜 구간을 함께 질의하여, `seminarShare` 객체 내에 `ly`(전년 실적) 및 `growth`(증감률 완제품) 필드를 포함해 주십시오.

* **요청 응답 스펙 (`seminarShare` 확장)**:
```json
{
  "seminarShare": {
    "total": {
      "label": "통합 (전체)",
      "daysCount": 181,
      "totalRooms": 26800,
      "seminarRooms": 3216,
      "sharePct": 12.0,
      "totalRevenue": 4824000000,
      "seminarRevenue": 514560000,
      "revenueSharePct": 10.7,
      "averageAdr": 160000,
      "ly": {
        "daysCount": 181,
        "totalRooms": 24500,
        "seminarRooms": 2695,
        "sharePct": 11.0,
        "totalRevenue": 4165000000,
        "seminarRevenue": 404250000,
        "revenueSharePct": 9.7,
        "averageAdr": 150000
      },
      "growth": {
        "seminarRoomsDiff": 521,
        "sharePctDiff": 1.0,
        "revenueGrowthRate": 27.3,
        "adrGrowthRate": 6.7
      }
    },
    "weekday": {
      "label": "주중 (일~목 체크인)",
      "daysCount": 130,
      "totalRooms": 15600,
      "seminarRooms": 2808,
      "sharePct": 18.0,
      "totalRevenue": 2496000000,
      "seminarRevenue": 421200000,
      "revenueSharePct": 16.9,
      "averageAdr": 150000,
      "ly": {
        "daysCount": 130,
        "totalRooms": 14300,
        "seminarRooms": 2288,
        "sharePct": 16.0,
        "totalRevenue": 2145000000,
        "seminarRevenue": 320320000,
        "revenueSharePct": 14.9,
        "averageAdr": 140000
      },
      "growth": {
        "seminarRoomsDiff": 520,
        "sharePctDiff": 2.0,
        "revenueGrowthRate": 31.5,
        "adrGrowthRate": 7.1
      }
    },
    "weekend": {
      "label": "주말 (금·토 체크인)",
      "daysCount": 51,
      "totalRooms": 11200,
      "seminarRooms": 408,
      "sharePct": 3.6,
      "totalRevenue": 2328000000,
      "seminarRevenue": 93360000,
      "revenueSharePct": 4.0,
      "averageAdr": 228823,
      "ly": {
        "daysCount": 51,
        "totalRooms": 10200,
        "seminarRooms": 407,
        "sharePct": 4.0,
        "totalRevenue": 2020000000,
        "seminarRevenue": 83930000,
        "revenueSharePct": 4.2,
        "averageAdr": 206216
      },
      "growth": {
        "seminarRoomsDiff": 1,
        "sharePctDiff": -0.4,
        "revenueGrowthRate": 11.2,
        "adrGrowthRate": 11.0
      }
    }
  }
}
```

---

### [요청 7] [신규 API 신설] 세일즈본부 연회/세미나실 장소별(Venue) 판매 분석 및 단체 명부 API
* **엔드포인트**: `GET /api/v6/report/sales-venue-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (단일일자: `date=YYYY-MM-DD`)
* **배경 및 필요성**:
  * 세일즈본부의 핵심 매출 축인 연회장/세미나실(세미나A, 세미나B, 벨포레홀, 그랜드볼룸 등)에 대한 장소별 가동 현황, 건당 평균 대관 가격(대관료 단가), 연도별/월별 판매 건수 추이, 그리고 실제 대관을 진행한 기업/기관 단체명의 가시성이 전혀 없는 상태입니다.
  * 원천 데이터베이스의 PMS 연회 예약 원장(`raw_연회_예약` 또는 POS 대관료 매출 계정)에 장소 코드, 이용 단체명, 대관료, 행사일자가 명확히 존재하므로, 이를 골드 마트 또는 집계 뷰(`mat_v6_sales_venue_performance` 등)로 정제하여 완제품 API로 제공해 주셔야 합니다.

* **요청 응답 규격 (100% camelCase)**:
```json
{
  "success": true,
  "summary": {
    "totalVenuesCount": 5,
    "totalEventsCount": 142,
    "totalRentalRevenue": 184500000,
    "averageRentalPrice": 1299295,
    "mostBookedVenue": "세미나A",
    "lyTotalEventsCount": 118,
    "lyTotalRentalRevenue": 141600000,
    "eventsGrowthRate": 20.3,
    "revenueGrowthRate": 30.3
  },
  "venues": [
    {
      "venueId": "VN_SEM_A",
      "venueName": "세미나A",
      "capacity": 80,
      "bookedCount": 54,
      "totalRevenue": 54000000,
      "averagePrice": 1000000,
      "sharePct": 38.0,
      "lyBookedCount": 42,
      "lyRevenue": 42000000,
      "growthRate": 28.6
    },
    {
      "venueId": "VN_SEM_B",
      "venueName": "세미나B",
      "capacity": 50,
      "bookedCount": 41,
      "totalRevenue": 32800000,
      "averagePrice": 800000,
      "sharePct": 28.9,
      "lyBookedCount": 35,
      "lyRevenue": 28000000,
      "growthRate": 17.1
    },
    {
      "venueId": "VN_BEL_HALL",
      "venueName": "벨포레홀",
      "capacity": 250,
      "bookedCount": 28,
      "totalRevenue": 70000000,
      "averagePrice": 2500000,
      "sharePct": 19.7,
      "lyBookedCount": 24,
      "lyRevenue": 55200000,
      "growthRate": 16.7
    },
    {
      "venueId": "VN_GRAND_BL",
      "venueName": "그랜드볼룸",
      "capacity": 400,
      "bookedCount": 19,
      "totalRevenue": 27700000,
      "averagePrice": 1457895,
      "sharePct": 13.4,
      "lyBookedCount": 17,
      "lyRevenue": 16400000,
      "growthRate": 11.8
    }
  ],
  "monthlyTrends": [
    {
      "yearMonth": "2026-01",
      "year": 2026,
      "month": 1,
      "totalCount": 18,
      "totalRevenue": 23400000,
      "venueBreakdown": {
        "세미나A": 7,
        "세미나B": 5,
        "벨포레홀": 4,
        "그랜드볼룸": 2
      }
    },
    {
      "yearMonth": "2026-02",
      "year": 2026,
      "month": 2,
      "totalCount": 22,
      "totalRevenue": 28600000,
      "venueBreakdown": {
        "세미나A": 9,
        "세미나B": 6,
        "벨포레홀": 4,
        "그랜드볼룸": 3
      }
    }
  ],
  "groupBookings": [
    {
      "eventId": "EVT_20260315_01",
      "bookingDate": "2026-03-15",
      "venueName": "벨포레홀",
      "corporateName": "삼성SDI 기술연구소",
      "paxCount": 180,
      "rentalPrice": 2500000,
      "packageType": "세미나+객실패키지",
      "salesManager": "김영업 과장",
      "remarks": "전일 대관 및 F&B 만찬 연계"
    },
    {
      "eventId": "EVT_20260318_02",
      "bookingDate": "2026-03-18",
      "venueName": "세미나A",
      "corporateName": "LG에너지솔루션 오창공장",
      "paxCount": 65,
      "rentalPrice": 1000000,
      "packageType": "단독 대관",
      "salesManager": "이세일즈 차장",
      "remarks": "프로젝터 및 음향 장비 셋팅"
    }
  ]
}
```

* **원천 데이터 매핑 가이드 (DBA & 백엔드 엔지니어링)**:
  1. `raw_연회_행사_v6` 또는 `raw_pms_banquet_folio`에서 `행사장소코드`(`room_code`/`venue_name`)와 `이용단체명`(`group_name`/`company_name`), `대관료`(`rental_fee`/`net_amount`)를 추출.
  2. `dim_facility_team_mapping`의 표준 장소명(`standard_venue_name`: 벨포레홀, 세미나A, 세미나B, 그랜드볼룸 등)으로 그룹핑.
  3. 모든 매출은 1원 단위까지 부가세 제외 순매출(Net Revenue) 기준으로 마트 집계.
  4. 프론트엔드는 본 API가 프로덕션에 배포될 때까지 임의의 더미 데이터를 생성하지 않고, 대기 배너와 스켈레톤 상태를 유지합니다.

---

# 🚨 [백엔드 API 긴급 보강 요청] 날씨 상관관계 API(weather-correlation) 영업장 중복 반환 해소 (2026-10-01)

### 1. 현상 및 원인 분석
- **엔드포인트**: `GET /api/v6/dashboard/weather-correlation?startDate=...&endDate=...&categoryCode=ALL`
- **현상**: `venueRankings` 배열 내에 동일 영업장(`얼룩말카페`, `미디어-뮤지엄카페`)이 2개 이상의 레코드로 분할되어 반환됨.
  - `얼룩말카페`: `MOTO`(모토아레나, 3.1만원/일) / `TICKET`(레저본부, 46.1만원/일) 분할
  - `미디어-뮤지엄카페`: `TICKET`(레저본부, 8.9만원/일) / `MOTO`(모토아레나, 0.4만원/일) 분할
- **원인**: 백엔드 데이터 마트(`mat_v6_weather_correlation_summary`) 또는 API 쿼리 집계 시 `GROUP BY category_code, venue_name`으로 처리되어, POS 단말 분산 등록으로 인해 복수 카테고리에 걸쳐 있는 업장이 분할 집계됨.

### 2. 요청 사항 (Pure Consumer & SSOT 원칙)
- 벨포레 공식 매핑 SSOT(`dim_facility_team_mapping` 및 Admin 매핑)에 따라, 업장의 정규 부문(Category)을 단일 귀속한 후 `GROUP BY venue_name`으로 1개 영업장당 1개 레코드만 산출하도록 마트 집계 쿼리를 정규화해 주십시오:
  - `얼룩말카페` ➔ **레저본부 (`TICKET`)** 단일 귀속
  - `미디어-뮤지엄카페` ➔ **레저본부 (`TICKET`)** 단일 귀속
- 프론트엔드는 임시 조치로서 UI 렌더링 시 주관 부문(진성 매출 기준) 단일화 필터링 및 복합 Key(`categoryCode_venueName`)를 적용하였으나, 근본적인 0-Variance 수치 보존을 위해 백엔드 DB 마트 레벨의 단일 정규 집계를 요청합니다.

---

# 🚨 [백엔드 신규 API 요청] 월별 전년도(LY) 실측 기준 기상 시뮬레이션 예측 API 신설 (2026-10-01)

### 1. 배경 및 필요성
- 리조트 비즈니스는 **월별 계절성(Seasonality)**이 극심합니다 (예: 7~8월 썸머랜드/워터파크 중심 vs 12~1월 썰매장/스파/실내식음 중심).
- 다년도 전체 기간의 단순 평균치로는 특정 월(예: 10월 단풍시즌, 12월 동계시즌)의 실제 기상 충격을 정밀하게 예측할 수 없습니다.
- 사용자가 특정 대상 월(`targetMonth`)과 예상 강수량(mm) 또는 적설량(cm)을 설정했을 때, **해당 월의 전년도(LY) 실측 주중/휴일 일평균 매출을 기준 모수(Baseline)**로 삼고 기상 탄력성을 대입한 정확한 예상 매출을 산출하는 공식 백엔드 마트 API가 반드시 필요합니다.

### 2. 요청 엔드포인트
- `GET /api/v6/dashboard/weather-forecast-simulation?targetMonth=YYYY-MM&precipitation=N&snowfall=N`

### 3. 요청 파라미터 규격
- `targetMonth`: 시뮬레이션 대상 년월 (예: `2026-10`, 미입력 시 당월)
- `precipitation`: 예상 일일 강수량 (mm 단위 정수/실수, 기본값 `0`)
- `snowfall`: 예상 일일 적설량 (cm 단위 정수/실수, 기본값 `0`)

### 4. 백엔드 산출 로직 가이드 (Pure Consumer 원칙)
1. **전년도 동월 베이스라인 추출 (SSOT)**:
   - `mat_v6_data_mart` 또는 `mat_v6_data_mart_revenue`에서 `targetMonth`의 전년도 동월(예: 2025-10)의 영업장별 **주중 일평균 실측 순매출(`lyWeekdayAvgRevenue`)**과 **휴무일 일평균 실측 순매출(`lyHolidayAvgRevenue`)**을 집계.
2. **기상 탄력성 결합 및 예상 매출 도출**:
   - `mat_v6_weather_correlation_summary`의 업장별 주중/휴일 우천 및 강설 탄력성을 입력된 강수량/적설량 강도에 맞게 적용.
   - 모든 예상 매출과 변동액은 소수점이 제거된 **순수 정수(Integer)**로 산출.
3. **기대 응답 JSON 규격**:
```json
{
  "success": true,
  "data": {
    "targetMonth": "2026-10",
    "compareMonthLY": "2025-10",
    "condition": {
      "precipitation": 15,
      "snowfall": 0
    },
    "venues": [
      {
        "categoryCode": "TICKET",
        "categoryName": "레저본부",
        "venueName": "사계절썰매장",
        "lyWeekdayAvgRevenue": 596163,
        "lyHolidayAvgRevenue": 1867843,
        "forecastWeekdayRevenue": 328187,
        "forecastHolidayRevenue": 795701,
        "weekdayDelta": -267976,
        "holidayDelta": -1072142,
        "weekdayImpactRate": -44.9,
        "holidayImpactRate": -57.4
      }
    ]
  }
}
```
4. 프론트엔드는 본 API가 배포되면 클라이언트 단독 연산을 전면 배제하고, 수신된 완제품 데이터를 차트에 100% Passthrough 바인딩합니다.



