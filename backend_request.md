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



