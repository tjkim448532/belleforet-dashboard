# 🚨 [공식 전달용] 벨포레 대시보드 백엔드 통합 요청서 (2026-10-03)

본 문서는 프론트엔드 전수 감사, 대표님/경영진 지시사항, 그리고 운영 환경에서 발견된 긴급 장애 및 데이터 정합성 이슈를 바탕으로 백엔드 개발팀 및 데이터 엔지니어링팀에 전달하는 **최종 통합 공식 요청서**입니다.

---

## 📋 [요약] 백엔드 조치 요청 우선순위 매트릭스

| 우선순위 | 구분 | 요청 항목 | 핵심 내용 및 영향도 |
| :--- | :---: | :--- | :--- |
| **P0 (긴급)** | 장애 복구 | **CORS Preflight `Cache-Control` 차단 해제** | 프로덕션 배포 사이트(`bell-dashboard.web.app`)에서 백엔드 V6 API 전면 호출 실패 차단 해제 |
| **P1 (높음)** | 데이터 정합성 | **`벨포레 목장(체험)` 이용객수(`visitor_count`) 정상화** | 분모(입장객수)는 정상이나 분자(체험객수)가 0명으로 적재되어 `0.0%`로 고정되는 문제 해결 |
| **P1 (높음)** | 데이터 검증 | **썸머랜드(워터파크) 9월 실적 이상치 원인 규명 및 분리** | 8월 말 폐장 시설에 9월 매출/이용객이 잡히는 원인(사우나 매핑, 이연 매출, 지연 전표 등) 점검 |
| **P1 (높음)** | API 보강 | **월별 가용객실 효율 API에 `revpar` 필드 추가** | 12개월 정산 대조표에 순수 객실 판매 효율(RevPAR = 객실 순매출 ÷ 가용객실수) 제공 |
| **P1 (완료)** | API 보강 | **월별 가용객실 효율 API에 주중/주말 분리형 RevPAR 및 TRevPAR 6종 추가** | [배포완료] 역산형 패키지 시뮬레이터 주중/주말 타깃팅 시 객실 방어선 및 목표 판매가 정밀 연동 지원 |
| **P1 (완료)** | API 보강 | **숙박객 수 YoY 및 개별 영업장 API 연간 총합(`totals`) 완제품 추가** | [배포/검증완료] `room-guests-yoy` 및 `facility-monthly-trend` 연간 총합 완제품 프론트 연동 완료 |
| **P1 (신규)** | 정규 API | **레저본부 영업장별 판매금액 Top 5 상품 및 가격/수요 시뮬레이션 API** | 티켓 가격 변동 및 고객수 변동(+10%, +30%)에 따른 월/연 예상 매출 시뮬레이터 백엔드 SSOT 제공 (`leisure-top-products`) |
| **P2 (보통)** | API 보강 | **기간 조회 시 전년 동기(YoY) 누적 완제품 제공** | 프론트엔드 직접 합산 금지(무관용) 원칙에 따른 백엔드 완제품 누적 블록 제공 (`leisure-yoy-matrix` 등) |
| **P2 (보통)** | 메타데이터 | **가용객실(Capacity) 및 판매객실(Sold Rooms) 카운팅 기준 명시** | 조립형 커넥팅룸 왜곡 방지 및 모수 산출 기준(1,080실 고정, PMS 체크인 기준) 공식 메타데이터 제공 |
| **P3 (신규)** | 정규 API | **Zero-Simulation 계절성 실측 및 사업목표 배분 API 신설** | 프론트 가짜 숫자 제거 완료에 따른 실측 기반 월별 계절성 및 사업목표 완제품 API 배포 |

---

## 1. 🚨 [P0 긴급] CORS 프리플라이트(Preflight) `Cache-Control` 헤더 차단 해제

### 1-1. 현상 및 에러 로그
Firebase 배포 도메인(`https://bell-dashboard.web.app`)에서 Vercel 백엔드(`https://belleforet-data.vercel.app`)의 V6 API 호출 시 Preflight(OPTIONS) 단계에서 `ERR_FAILED`로 전면 차단됨.
```text
Access to fetch at 'https://belleforet-data.vercel.app/api/v6/dashboard/revenue-summary' 
from origin 'https://bell-dashboard.web.app' has been blocked by CORS policy: 
Request header field cache-control is not allowed by Access-Control-Allow-Headers in preflight response.
```

### 1-2. 발생 원인
프론트엔드 캐시 방지용 파라미터 및 브라우저 기본 헤더에 포함된 `Cache-Control`이 백엔드의 `Access-Control-Allow-Headers` 허용 목록에 누락되어 있음.

### 1-3. 요청 조치 사항
백엔드(`vercel.json` 또는 `next.config.js`, API CORS 미들웨어) 설정의 `Access-Control-Allow-Headers`에 다음 헤더들을 추가 허용해 주시기 바랍니다.
```json
{
  "key": "Access-Control-Allow-Headers",
  "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Cache-Control, Pragma, Expires, Authorization"
}
```

---

## 2. 🎡 [P1 데이터 정합성] `벨포레 목장(체험)` 분자(이용객수) 0명 적재 정상화

### 2-1. 현상
* **엔드포인트**: `GET /api/v6/report/leisure-yoy-matrix`
* **현상 요약**:
  * 분모는 '벨포레 목장 입장객수'(2026년 5월 기준 14,174명 등)로 정상 치환되어 연산되고 있으나,
  * **분자인 '체험 이용객수(`visitors`)'가 전 기간 0명**으로 집계되어 대시보드 화면에 항상 **`0.0% (0명 / 14,174명)`**으로 표출됨.

### 2-2. 원인 분석
* 원천 POS 데이터에서 당근 먹이주기 컵, 승마 체험 티켓 등 목장 체험형 단품 아이템들이 `is_visitor_count = 0`으로 처리되어 인원수가 카운트되지 않음.

### 2-3. 요청 조치 사항
* `fact_leisure_sales_v6` 적재 선행 ETL 프로시저(`sp_etl_v6_fact_leisure`) 내에서:
  * '벨포레 목장(체험)' 부문의 유효 판매 수량(티켓 수량, 체험 바우처 수량, 영수증 건수 등 운영 기준)을 체험 이용객수(`visitor_count`)로 인정하여 집계하도록 룰 수정 및 마트 리프레시 요청.

---

## 3. 🏊 [P1 데이터 검증] 썸머랜드(워터파크) 9월 실적 이상치 원인 규명 및 분리

### 3-1. 현상
* 워터파크(썸머랜드)는 계절성 하계 시설로 매년 8월 말경 폐장함에도 불구하고, **9월 실적 데이터에 매출 및 이용객수가 집계되는 이상 현상** 발생. (대표님 및 경영진 지적 사항)

### 3-2. 확인 및 조치 요청 사항
1. **전표 원천 조사**: 9월에 발생한 전표가 사우나, 실내 수영장, 또는 푸드코트 등 타 업장 단말기에서 승인된 것인지 확인.
2. **이연/온라인 예매 안분 여부**: 7~8월 판매된 온라인 티켓의 9월 취소/미사용 정산인지 확인.
3. **매핑 정제**: `dim_facility_team_mapping`에서 타 업장 매출이 썸머랜드로 오매핑된 경우 올바른 업장(F&B, 기타 레저 등)으로 분리 재배정.

---

## 4. 📊 [P2 API 보강] 기간 조회 시 전년 동일 기간(YoY) 누적 완제품 제공

### 4-1. 배경 및 무관용 원칙 준수
* 벨포레 API 바이블 1조: 프론트엔드는 배열 데이터를 `reduce` 등으로 직접 합산하거나 월별 API를 Loop 호출해 더할 수 없음 (Zero-Proxy / No Slice Summation).
* 대시보드에서 기간 선택(예: 1월 ~ 9월 등 다중 월 조회) 시 백엔드가 계산한 공식 누적 합계가 필요함.

### 4-2. 요청 조치 사항
* `GET /api/v6/report/leisure-yoy-matrix` 등 주요 리포트 API에 기간 파라미터(`startMonth`, `endMonth` 또는 `startDate`, `endDate`) 지원 강화.
* 응답 JSON에 선택 구간의 당해연도 누적 실적 및 **전년 동기간(YoY) 누적 실적과 증감률**을 완성된 객체(`periodCumulative`)로 포함하여 반환 요청.

```json
{
  "periodCumulative": {
    "2024": { "visitors": 128450, "roomGuests": 84210, "usageRate": 152.5 },
    "2025": { "visitors": 142100, "roomGuests": 91200, "usageRate": 155.8 },
    "2026": { "visitors": 158900, "roomGuests": 98400, "usageRate": 161.5 },
    "yoyDiff": 5.7
  }
}
```

---

## 5. 🛏️ [P2 메타데이터] 객실 가용 객실수(Fixed Capacity) 및 판매 객실수(Sold Rooms) 카운팅 기준 메타데이터 제공

### 5-1. 배경 (대표님 지시사항)
* "가용객실 옆에 판매객실의 숫자와 카운팅 방법도 명확히 설명할 것"
* 51평형 등 조립형 커넥팅 객실은 단독 판매(16평, 35평) 소진 시 조립 잔여 재고가 0이 되어 점유율 분모가 왜곡되는 Dynamic Capacity Trap 방지 필요.

### 5-2. 요청 조치 사항
* 객실 관련 API(`/api/v6/report/room-guests-yoy`, `/api/v6/dashboard/revenue-summary`) 응답에 다음 공식 메타데이터 블록 제공 요청:
```json
{
  "metadata": {
    "capacity": {
      "fixedCapacity": 1080,
      "fixedCapacityDescription": "벨포레 리조트 물리 고정 객실수 1,080실 (SSOT)",
      "soldRoomsDescription": "PMS 확정 체크인 및 유효 판매 객실수 (단순 예약 포함 여부 및 조립형 커넥팅룸 실물 반영)",
      "countingRules": "조립형 51평형의 가용 변동과 무관하게 전체 물리 고정 객실수(1,080실)를 단일 기준으로 점유율 및 정원 숙박객수를 산출함."
    }
  }
}
```

---

## 6. 🎯 [P3 신규 정규 API] Zero-Simulation 실측 기반 월별 계절성 및 사업계획 목표 배분 API

### 6-1. 배경
* 프론트엔드 단의 모든 하드코딩 상수, 가짜 시뮬레이션, 임의 강수량/월별 계절성 배분 수식을 100% 제거 완료함.
* 프론트엔드가 순수 완제품만 소비할 수 있도록 백엔드 데이터 마트 기반의 정규 API 신설 요청.

### 6-2. 신설 요청 API 목록
1. **`GET /api/v6/report/monthly-seasonality-matrix?year=YYYY`**: 전년도(LY) 실측 데이터 기반의 월별·업장별 매출 및 비중 완제품.
2. **`POST /api/v6/report/target-allocation`**: 목표 성장률 입력 시 전사/부문별/업장별 1원 단위 Zero-Variance 보정 목표액 배분 완제품.
3. **`GET /api/v6/common/holidays?year=YYYY`**: 대한민국 법정 공휴일 마스터 (`dim_calendar_kr` 기준).

---

# 프론트엔드/백엔드 개발팀 협조 요청 (수석 DBA 하달)

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

---

# 🚨 [가짜 숫자·클라이언트 시뮬레이션 전면 박멸] 백엔드 정규 사업목표 수립 및 계절성 마트 API 신설 요청서 (2026-10-02)

## 📜 V6 백엔드 API 개발 5대 철칙 (Backend Guardrails 준수 필수)
1. **[Zero-Proxy] API 서버 내 자바스크립트 연산 100% 금지**: Next.js 라우트에서 합산(`reduce`), 평균, 차액 분배를 절대 하지 마십시오. 모든 목표 산출과 계절성 안분, 반올림 보정은 MariaDB 프로시저/뷰에서 완료되어야 합니다.
2. **[SSOT 수호] 골드 마트(Mart) 테이블 외 접근 엄금**: `mat_v6_data_mart_revenue`, `dim_calendar_kr`, `dim_facility_team_mapping` 등 승인된 골드 테이블만 조회하십시오.
3. **[Pure Data] 매직 스트링 및 UI 종속성 주입 금지**: UI 표시용 텍스트 하드코딩 금지, 100% camelCase 규격, 순수 정수형(Integer) 완제품 반환.
4. **[ETL 격리] 외부 API 호출 및 데이터 적재 로직 금지**: API는 오직 읽기 전용(Read-only).
5. **[DRY 원칙] 공통 유틸리티 모듈 사용 강제**: 날짜 파싱, 에러 처리, 인증 등 공통 모듈 재사용.

---

### 1. 현황 및 요청 배경 (배경 진단)
* **대표님/이사님 절대 지시**: "프론트엔드 단독으로 판단하여 숫자를 지어내거나 가설을 사실로 포장하는 행위 영구 금지. 필요하면 공식 문서를 통해 백엔드 팀에 요청만 수행할 것."
* **현재 문제점**:
  1. `src/data/monthlySeasonalityData.ts` (4,655줄, 136KB)에 2024~2025년 월별/업장별 실측 매출 및 점유비 총 1,600여 개의 숫자가 소스코드에 하드코딩되어 있습니다.
  2. `src/lib/targetSimulationEngine.ts`, `src/pages/StrategicSimulator.tsx`, `src/components/dashboard/PackageGeneratorSimulator.tsx`에서 클라이언트 자바스크립트가 임의의 패키지 가격(`279,000원` 등)을 지어내고, 선형 성장률(`* (1 + growth/100)`)을 곱해 목표를 임의 생성하며, 나눗셈 오차를 특정 1개 업장에 몰아넣는 땜질(`sorted[0].target += diff`)을 수행하고 있습니다.
* **해결 방향**:
  프론트엔드 내의 모든 로컬 계산 엔진과 4,655줄짜리 정적 데이터셋을 **완전 삭제(Zero-Code)**할 수 있도록, 백엔드 데이터 마트 팀에서 정규 계산이 완료된 완제품 API 3종을 제공해 주시기 바랍니다.

---

### 2. 요청 API 상세 명세

#### [API 1] 월별 계절성 및 부문/업장 실적 비중 SSOT API (정적 데이터셋 4,655줄 대체용)
- **엔드포인트**: `GET /api/v6/report/seasonality-shares`
- **요청 파라미터**:
  - `baseYear`: 기준 연도 (예: `2025`, `2024`)
  - `month`: 대상 월 (`1`~`12` 또는 `ANNUAL`, 기본값 `ANNUAL`)
  - `includeGolf`: 골프 포함 여부 (`true` | `false`, 기본값 `true`)
- **백엔드 산출 로직**:
  - `mat_v6_data_mart_revenue`에서 해당 연도/월의 사업부별 실측 순매출 및 전사 대비 비중(`divisionShares`), 업장별 실측 순매출(`netRevenue`) 및 부문 내 점유비(`shareRatio`)를 집계.
  - 리조트 물리 객실수(`175실`) 및 일수(`days`) 기반의 정확한 TrevPAR 산출.
- **기대 응답 JSON 규격 (camelCase)**:
```json
{
  "success": true,
  "data": {
    "baseYear": 2025,
    "month": 1,
    "periodDays": 31,
    "totalRevenue": 1001006783,
    "trevpar": 184517,
    "divisionShares": {
      "ROOM": 0.2963,
      "GOLF": 0.1825,
      "FNB": 0.2642,
      "TICKET": 0.1199,
      "MOTO": 0.0343,
      "BANQUET": 0.0182,
      "OTHER": 0.0847
    },
    "facilities": [
      {
        "categoryCode": "ROOM",
        "categoryName": "콘도",
        "venueName": "객실",
        "netRevenue": 292815660,
        "shareRatio": 0.2925
      },
      {
        "categoryCode": "GOLF",
        "categoryName": "골프",
        "venueName": "그린피",
        "netRevenue": 153568000,
        "shareRatio": 0.1534
      }
    ]
  }
}
```

---

#### [API 2] 정규 사업목표 수립 및 계절성 목표 배분 완제품 API (Zero-Simulation SSOT)
- **엔드포인트**: `GET /api/v6/report/business-plan-simulation`
- **요청 파라미터**:
  - `baseYear`: 기준 실적 연도 (예: `2025`)
  - `targetYear`: 수립 목표 연도 (예: `2026`)
  - `growthRate`: 전사 목표 성장률 (%, 예: `10.5`)
  - `month`: 대상 월 (`1`~`12` 또는 `ANNUAL`)
  - `includeGolf`: 골프 포함 여부 (`true` | `false`)
- **백엔드 산출 로직**:
  - `mat_v6_data_mart_revenue` 기준 연도 실적에 목표 성장률을 결합하여 전사 목표액(`targetTotalRevenue`) 및 TrevPAR를 산출.
  - 부문별(`categories`) 및 영업장별(`facilities`) 목표 배분 시 반올림 오차(Rounding Error)가 발생하지 않도록 **DB 프로시저 레벨에서 1원 단위 정수 일치(Zero-Variance)** 보정 완료 후 반환.
  - 프론트엔드가 `.reduce()`로 다시 더하지 않아도 되도록 각 부문별 소계(`totalTargetRevenue`)와 전체 총계(`grandTotalTargetRevenue`)를 완제품으로 포함.
- **기대 응답 JSON 규격 (camelCase)**:
```json
{
  "success": true,
  "data": {
    "baseYear": 2025,
    "targetYear": 2026,
    "selectedMonth": "ANNUAL",
    "periodDays": 365,
    "targetGrowthRate": 10.5,
    "grandTotalLyRevenue": 24706936601,
    "grandTotalTargetRevenue": 27301164944,
    "grandTotalRevenueDelta": 2594228343,
    "targetTrevpar": 427415,
    "categories": [
      {
        "categoryCode": "GOLF",
        "categoryName": "골프사업본부",
        "lyRevenue": 4500000000,
        "targetRevenue": 4972500000,
        "revenueDelta": 472500000,
        "targetShare": 18.21,
        "facilities": [
          {
            "shopCode": "SHOP_GOLF_01",
            "venueName": "그린피",
            "lyRevenue": 3800000000,
            "targetRevenue": 4199000000,
            "revenueDelta": 399000000,
            "shareRatio": 84.45
          }
        ]
      }
    ]
  }
}
```

---

#### [API 3] 대한민국 법정 공휴일 마스터 API (하드코딩 제거용)
- **엔드포인트**: `GET /api/v6/common/holidays?year=YYYY`
- **요청 파라미터**: `year` (예: `2026`, 미지정 시 당해연도)
- **백엔드 산출 로직**: `dim_calendar_kr`에서 `is_holiday = 1` 또는 `holiday_name IS NOT NULL`인 날짜 목록 단순 `SELECT`.
- **기대 응답 JSON 규격**:
```json
{
  "success": true,
  "year": 2026,
  "holidays": [
    { "date": "2026-01-01", "name": "신정" },
    { "date": "2026-02-16", "name": "설날 연휴" },
    { "date": "2026-02-17", "name": "설날" },
    { "date": "2026-02-18", "name": "설날 연휴" },
    { "date": "2026-03-01", "name": "삼일절" },
    { "date": "2026-03-02", "name": "삼일절 대체공휴일" }
  ]
}
```

---

---

## 8. 🏨 [P1 신규 필드] 월별 가용객실 효율 API (`/api/v6/report/monthly-room-efficiency`)에 `revpar` 필드 추가

### 8-1. 배경 및 요청 사유
* **위치**: 대시보드 리조트 사업실적 (`/resort-business`) 하단 **「12-Month Detailed Reconciliation Table (12개월 정산 대조표)」**
* **요청 목적**: 경영진 및 대표님 지시로 가용객실 1실당 전사/리조트 전체 매출 기여도를 나타내는 **`TrevPAR`**와 함께, **순수 객실 판매 효율을 나타내는 `RevPAR`**를 나란히 비교 검증하고자 함.
* **현황**: 현재 `/api/v6/report/monthly-room-efficiency` 응답에는 `trevparTotal`, `trevparWithoutGolf`, `trevporTotal`, `trevporWithoutGolf`가 포함되어 있으나, `revpar` (또는 `revPar`) 필드는 누락되어 있음.
* **프론트엔드 준수 원칙**: Fail-Stop 원칙 및 무관용 원칙(Zero-Proxy / No Client Synthesis)에 따라 클라이언트에서 사칙연산(`roomRevenue ÷ availableRooms`)으로 숫자를 임의 합성하지 않고 백엔드 공식 완제품 필드 바인딩 대기 상태(`-`)로 표출함.

### 8-2. 백엔드 산출 로직
* **RevPAR 산출 공식**:
  $$\text{RevPAR} = \left\lfloor \frac{\text{roomRevenue (객실 순매출)}}{\text{availableRooms (월 가용객실수)}} + 0.5 \right\rfloor \quad (\text{정수형 원화 단위 반올림})$$
* **기존 연산과의 정합성**:
  * `trevparTotal` = `ROUND(totalRevenue / availableRooms)`
  * `trevparWithoutGolf` = `ROUND(netRevenueWithoutGolf / availableRooms)`
  * **신규 `revpar`** = `ROUND(roomRevenue / availableRooms)`

### 8-3. 기대 응답 JSON 규격
`monthlyComparison` 배열 내의 `ly`와 `ty` 객체에 `revpar` (또는 `revPar`) 추가:
```json
{
  "monthlyComparison": [
    {
      "month": 1,
      "monthLabel": "1월",
      "ly": {
        "year": 2025,
        "availableRooms": 5425,
        "roomsSold": 1837,
        "totalRevenue": 975873463,
        "roomRevenue": 296552928,
        "netRevenueWithoutGolf": 824016810,
        "revpar": 54664,
        "trevparTotal": 179885,
        "trevparWithoutGolf": 151892,
        "trevporTotal": 531232,
        "trevporWithoutGolf": 448567
      },
      "ty": {
        "year": 2026,
        "availableRooms": 5425,
        "roomsSold": 1997,
        "totalRevenue": 966197010,
        "roomRevenue": 293051509,
        "netRevenueWithoutGolf": 898758568,
        "revpar": 54019,
        "trevparTotal": 178101,
        "trevparWithoutGolf": 165670,
        "trevporTotal": 483824,
        "trevporWithoutGolf": 450054,
        "isClosed": true
      }
    }
  ],
  "summary": {
    "ty": {
      "revpar": 54019,
      "trevparTotal": 408476,
      "trevparWithoutGolf": 275900
    },
    "ly": {
      "revpar": 54664,
      "trevparTotal": 381245,
      "trevparWithoutGolf": 235152
    }
  }
}
```

### 8-4. 프론트엔드 조치 완료 사항
* `MonthlyTrevporChart.tsx` 테이블 내 2025년 및 2026년에 각각 **`2025년 RevPAR`**, **`2026년 RevPAR`** 컬럼 신설 완료.
* 백엔드 API에서 `revpar` 또는 `revPar` 응답 시 실시간 자동 반영(100% camelCase 정규화) 연동 완료.

---

## 9. 🏨 [배포 및 연동 완료] 월별 가용객실 효율 API (`/api/v6/report/monthly-room-efficiency`)에 ADR 및 주중/주말 점유율(weekdayOcc, weekendOcc) 정규 마트 필드 탑재

### 9-1. 배경 및 비즈니스 목적
* **적용 화면**: 리조트 수익 관리(RM) 및 역산형 패키지 쿼터 시뮬레이터 (`PackageGeneratorSimulator.tsx`, `/strategic-simulator?tab=package`)
* **목적**:
  * 리조트 총 175실(물리 고정) 기준, 일반 객실 정가 판매 잠식(Cannibalization)을 방지하고 비수기 패키지의 하루 안전 판매 마지노선(Allotment)을 산출하기 위해 월별 **ADR, 전체 점유율, 주중(일~목) 점유율, 주말(금~토) 점유율**이 필수적으로 요구됨.
  * 백엔드 정규 마트에서 12개월 전체 월 데이터를 `monthly-room-efficiency` 응답에 사전 적재 완료하여, 다중 월 전환 시 추가 API 왕복 없이 0ms 즉시 전환 지원.

### 9-2. 산출 로직 및 정의
* **물리 총 가용객실**: 175실 고정 (SSOT)
* **ADR (객실 평균 판매 단가)**: `ROUND(roomRevenue / roomsSold)`
* **overallOcc (전체 점유율 %)**: `ROUND((roomsSold / availableRooms) * 100, 1)`
* **weekdayOcc (주중 일~목 점유율 %)**: 일~목요일 판매 객실수 ÷ 해당 요일 총 가용객실수 (소수점 1자리)
* **weekendOcc (주말 금~토 점유율 %)**: 금~토요일 판매 객실수 ÷ 해당 요일 총 가용객실수 (소수점 1자리)
* **weekdayAdr / weekendAdr**: 주중 및 주말 각각의 평균 객실 판매 단가 (정수형)

### 9-3. 기대 응답 JSON 규격
`monthlyComparison` 배열 내의 각 월 `ty` 및 `ly` 객체에 아래 6개 필드 추가 (적용 완료):
```json
{
  "monthlyComparison": [
    {
      "month": 1,
      "monthLabel": "1월",
      "ty": {
        "year": 2026,
        "availableRooms": 5425,
        "roomsSold": 1969,
        "roomRevenue": 293051509,
        "revpar": 54019,
        "adr": 148833,
        "overallOcc": 36.3,
        "weekdayOcc": 30.6,
        "weekendOcc": 48.3,
        "weekdayAdr": 120901,
        "weekendAdr": 185987,
        "trevparTotal": 178101,
        "trevparWithoutGolf": 165670
      },
      "ly": {
        "year": 2025,
        "availableRooms": 5425,
        "roomsSold": 1810,
        "roomRevenue": 296552928,
        "revpar": 54664,
        "adr": 163841,
        "overallOcc": 33.4,
        "weekdayOcc": 28.2,
        "weekendOcc": 45.1,
        "weekdayAdr": 135200,
        "weekendAdr": 198400,
        "trevparTotal": 179885,
        "trevparWithoutGolf": 151892
      }
    }
  ]
}
```

### 9-4. 프론트엔드 연동 및 검증 완료 상태 (2026-10-04)
* **배포 및 응답 검증 완료**: 백엔드 프로덕션 API에서 `adr`, `overallOcc`, `weekdayOcc`, `weekendOcc`, `weekdayAdr`, `weekendAdr` 필드가 12개월 전 월에 걸쳐 정확하게 반환됨을 확인 완료(Zero-Variance).
* **프론트엔드 1:1 완제품 바인딩 완료**:
  1. `PackageGeneratorSimulator.tsx`에서 `monthlyEfficiencyMap`을 통한 12개월 전 월 0ms 즉각 전환 및 캐싱 바인딩 완료.
  2. ADR, RevPAR, TRevPAR, 점유율 3분할(전체/주중/주말) 카드 4종 100% 동일 규격 표출.
  3. [주중용] / [주말용] 선택에 따른 $OCC_{target}$ 자동 로딩 및 안전 판매 마지노선(Allotment) 수식 연동.
  4. 일반 객실 정가 판매 잠식(Cannibalization) 방지 공식 권고 문구 자동 표출 완료.
  5. `MonthlyTrevporChart.tsx` 인터페이스(`MonthlyEfficiencyItem`) 내 정규 필드 동기화 완료.

---

## 10. 📈 [배포 및 연동 검증 완료] 월별 가용객실 효율 API (`/api/v6/report/monthly-room-efficiency`)에 주중/주말 분리형 RevPAR 및 TRevPAR 6종 정규 완제품 필드 탑재

### 10-1. 배경 및 비즈니스 목적 (수익 관리 RM 관점)
* **적용 화면**: 리조트 수익 관리(RM) 및 역산형 패키지 쿼터 시뮬레이터 (`PackageGeneratorSimulator.tsx`, `/strategic-simulator?tab=package`)
* **문제점 및 분리 필요성**:
  1. 리조트 비즈니스는 **주중(일~목)**과 **주말·공휴일(금~토/공휴일)**의 고객 지출 패턴 및 가용 객실 가치가 극단적으로 상이합니다.
     - **2026년 1월 실측 기준**:
       * 주중 RevPAR: **36,996원** (ADR 120,901원 × OCC 30.6%) vs 주말 RevPAR: **89,832원** (ADR 185,987원 × OCC 48.3%)
       * 주중 순수 리조트 TRevPAR: **104,657원** vs 주말 순수 리조트 TRevPAR: **293,796원**
  2. 만약 주중/주말 구분 없이 전체 월평균 가중치(Blended TRevPAR 165,670원, RevPAR 54,019원)를 단일 기준으로 적용하면:
     - **[주중용 패키지]**: 주중 실측 수준(105,000원) 대비 약 6만원이나 과도하게 비싼 가격으로 생성되어 비수기 평일 판매 경쟁력을 상실합니다.
     - **[주말용 패키지]**: 주말 실측 수준(294,000원) 대비 13만원이나 헐값에 판매되어, 주말 정가 판매를 스스로 갉아먹는 치명적인 잠식(Cannibalization)이 발생합니다.
  3. 따라서 역산형 패키지 시뮬레이터의 **Step 01(목표 패키지 판매가 도출)**과 **Step 02(객실 방어선 선차감)**가 사용자의 타겟 구분([주중용] vs [주말용])에 맞추어 **해당 구분의 실측 TRevPAR 및 RevPAR에 1:1로 직결**되어야 합니다.

### 10-2. 산출 로직 및 정의 (SSOT 기준 - 물리 175실 고정)
1. **주중 객실 RevPAR (`weekdayRevpar`)**:
   $$\text{weekdayRevpar} = \text{ROUND}\left(\text{weekdayAdr} \times \frac{\text{weekdayOcc}}{100}\right)$$
   *(예: 2026년 1월: 120,901원 × 30.6% = 36,996원)*
2. **주말 객실 RevPAR (`weekendRevpar`)**:
   $$\text{weekendRevpar} = \text{ROUND}\left(\text{weekendAdr} \times \frac{\text{weekendOcc}}{100}\right)$$
   *(예: 2026년 1월: 185,987원 × 48.3% = 89,832원)*
3. **주중 순수 TRevPAR (`weekdayTrevpar` - 골프 제외)**:
   $$\text{weekdayTrevpar} = \text{ROUND}\left(\frac{\text{주중 일평균 순수 리조트 매출}}{175\text{실}}\right) = \text{ROUND}\left(\frac{\text{weekdayDailyAvg} \times \text{nonGolfRatio}}{175}\right)$$
   *(예: 2026년 1월: (19,689,313원 × 93.02%) ÷ 175실 = 104,657원)*
4. **주말·공휴일 순수 TRevPAR (`weekendTrevpar` - 골프 제외)**:
   $$\text{weekendTrevpar} = \text{ROUND}\left(\frac{\text{빨간날 일평균 순수 리조트 매출}}{175\text{실}}\right) = \text{ROUND}\left(\frac{\text{redDayDailyAvg} \times \text{nonGolfRatio}}{175}\right)$$
   *(예: 2026년 1월: (55,272,144원 × 93.02%) ÷ 175실 = 293,796원)*
5. **(참고용) 전체 TRevPAR (`weekdayTrevparTotal`, `weekendTrevparTotal` - 골프 포함)**:
   - `weekdayTrevparTotal`: `ROUND(weekdayDailyAvg / 175)` *(112,510원)*
   - `weekendTrevparTotal`: `ROUND(redDayDailyAvg / 175)` *(315,841원)*

### 10-3. 기대 응답 JSON 규격
`monthlyComparison` 배열 내 각 월의 `ty` 및 `ly` 객체에 아래 6개 필드 추가 탑재:
```json
{
  "monthlyComparison": [
    {
      "month": 1,
      "monthLabel": "1월",
      "ty": {
        "year": 2026,
        "availableRooms": 5425,
        "roomsSold": 1997,
        "totalRevenue": 966197010,
        "netRevenueWithoutGolf": 898758568,
        "revpar": 54019,
        "adr": 146746,
        "overallOcc": 36.8,
        "weekdayOcc": 30.6,
        "weekendOcc": 48.3,
        "weekdayAdr": 120901,
        "weekendAdr": 185987,
        "weekdayRevpar": 36996,
        "weekendRevpar": 89832,
        "trevparTotal": 178101,
        "trevparWithoutGolf": 165670,
        "weekdayTrevpar": 104657,
        "weekendTrevpar": 293796,
        "weekdayTrevparTotal": 112510,
        "weekendTrevparTotal": 315841
      }
    }
  ]
}
```

### 10-4. 프론트엔드 선제 조치 현황 (2026-10-04)
1. **0ms 즉시 연동 및 실측 수학적 SSOT 어댑터 구축 완료**:
   - `PackageGeneratorSimulator.tsx`에서 백엔드 완제품 필드가 내려오면 1순위로 즉시 바인딩(`??`)하도록 어댑터 인터페이스(`weekdayRevpar`, `weekendRevpar`, `weekdayTrevpar`, `weekendTrevpar`)를 100% 정규화 탑재 완료.
   - 백엔드 마트 적재 전 과도기에도 `/api/v6/report/day-of-week-sales`와 `/api/v6/dashboard/revenue-summary`의 일평균 매출(19,689,313원 / 55,272,144원) 및 물리 175실 모수를 직결하여 1원의 오차도 없는 Zero-Variance 실측 동기화 완료.
2. **시뮬레이션 전 프로세스 분리 연동 완료**:
   - [주중용] 선택 시: 목표 판매가 시작점 105,000원(주중 TRevPAR), 객실 방어선 37,000원(주중 RevPAR 선차감) 자동 락인.
   - [주말용] 선택 시: 목표 판매가 시작점 294,000원(주말 TRevPAR), 객실 방어선 90,000원(주말 RevPAR 선차감) 자동 락인.
   - 상단 Section 2의 4개 핵심 지표 카드(ADR, RevPAR, TRevPAR, 점유율)가 선택 구분에 따라 동적 라벨(`[주중 기준]` / `[주말 기준]`) 및 실측 수치와 주중/주말 보조 수치로 100% 완벽한 대칭 규격으로 표출됨.

### 10-5. 백엔드 프로덕션 배포 및 라이브 검증 완료 내역 (2026-10-04)
* **배포 커밋**: `59ab2073f7e90fcd6267e46df0fc05db381f2bb0`
* **라이브 엔드포인트**: `GET https://belleforet-data.vercel.app/api/v6/report/monthly-room-efficiency?baseYear=2026&compareYear=2025`
* **2026년 1월 실측 응답 대조 (100% Zero-Variance 확인 완료)**:
  - `weekdayRevpar`: 36,996원
  - `weekendRevpar`: 89,832원
  - `weekdayTrevpar`: 104,657원
  - `weekendTrevpar`: 293,796원
  - `weekdayTrevparTotal`: 112,510원
  - `weekendTrevparTotal`: 315,841원
* **프론트엔드 실시간 직결 연동**: 프론트엔드(`PackageGeneratorSimulator.tsx`, `MonthlyTrevporChart.tsx`)에서 별도 코드 수정 없이 1순위 완제품으로 0ms 직결 매핑되어 완벽하게 서비스 중임을 최종 확인 완료.

---

## 11. 🏨 [P1 완료] 연도별 숙박객 수 YoY(`room-guests-yoy`) 및 개별 영업장 월별 실적(`facility-monthly-trend`) 연간 총합(`totals`) 완제품 탑재 (✅ 배포 및 검증 완료)

### 11-1. 배경 및 무관용 원칙 (NO SLICE SUMMATION)
1. **화면 요구사항**:
   - `월별 상세 실적 (벨포레 전체 종합)` 및 개별 영업장 상세 실적 테이블 하단에 2024년, 2025년, 2026년 **`연간 합계 (Total)`** 행 표출 필요.
2. **순매출(Revenue) 현황 - 준비 완료**:
   - 호출 API: `GET /api/v6/report/monthly-trends?year={2024|2025|2026}`
   - 백엔드가 이미 0-Variance 검증용 마스터 객체(`ValidationMaster`)에 연간 총합(`grandTotalRevenue`, `grandExGolfRevenue`)을 내려주고 있어, 프론트엔드가 이를 읽어 하단에 즉시 표출 완료함.
3. **객실 투숙객 및 방문객(Visitors) 현황 - 배포 완료**:
   - 호출 API: `GET /api/v6/report/room-guests-yoy`
   - 백엔드 배포 완료: 연도별 세로 1년치 합계 `totals: { "2024": 91279, "2025": 124462, "2026": 93806 }` 및 `grandTotal: 309546` 완제품 제공 완료.
   - 프론트엔드는 NO SLICE SUMMATION 원칙에 따라 백엔드 공식 SSOT 값을 직결 표출함.

### 11-2. 배포된 실측 응답 JSON 규격 (운영 검증 완료)

#### ① 엔드포인트: `GET /api/v6/report/room-guests-yoy`
```json
{
  "success": true,
  "years": ["2024", "2025", "2026"],
  "totals": {
    "2024": 91279,
    "2025": 124462,
    "2026": 93806
  },
  "grandTotal": 309546
}
```

#### ② 엔드포인트: `GET /api/v6/report/facility-monthly-trend?facility={facilityName}`
```json
{
  "success": true,
  "data": {
    "facility": "투스카나",
    "monthlyData": [ ... ],
    "yearlyTotals": {
      "2024": { "revenue": 0, "visitors": 0 },
      "2025": { "revenue": 0, "visitors": 0 },
      "2026": { "revenue": 0, "visitors": 0 }
    },
    "totals": { "revenue": 0, "visitors": 0 }
  }
}
```

### 11-3. 프론트엔드 반영 및 바인딩 완료 현황 (2026-10-05)
1. **`FacilityTrend.tsx` 전체 및 개별 영업장 연간 합계행 바인딩 완료**:
   - 전체 리조트: `ValidationMaster`의 순매출 및 `room-guests-yoy`의 `totals` 객체(`91,279명`, `124,462명`, `93,806명`) 직결 바인딩 완료.
   - 개별 영업장: `facility-monthly-trend`의 `yearlyTotals` 객체 직결 바인딩 완료.
2. **`RoomGuestsYoyTable.tsx` 하단 연간 총합 행 직결 완료**:
   - 숙박객 YoY 매트릭스 하단 `tfoot`에 백엔드 공식 `totals` 및 최신 연도 vs 전년도 증감수/증감율 바인딩 완료.

---

## 12. 🎟️ [P1 신규 API] 레저본부 영업장별 판매금액 Top 5 상품 및 가격/수요 시뮬레이션 API (`leisure-top-products`)

### 12-1. 요청 배경 및 경영진/사용자 요구사항
1. **화면 요구사항**:
   - 레저본부 페이지(`LeisureUsageRate.tsx`) 내에 **`레저본부 티켓 가격 및 수요 시뮬레이터`**를 신규 구축.
   - 사용자가 영업장(예: `놀이동산`, `벨포레 목장`, `마운틴카트`, `사계절썰매장`, `미디어아트센터`, `마리나 클럽`, `벨포레 목장(체험)`)을 선택했을 때, 해당 영업장에서 **판매 중인 상품 중 판매금액(매출액) 상위 5개 상품(Top 5)**을 리스트로 제공.
   - 티켓 가격을 인상/인하하거나 고객수 변동률(+10%, +30% 등)을 적용했을 때 **예상되는 월별/연간 매출**을 실시간 산출하여 대조 표출.
2. **무관용 원칙 및 Zero-Mocking/Zero-Simulation 준수**:
   - 프론트엔드는 임의의 가짜 티켓명이나 단가/수량을 하드코딩하지 않습니다.
   - 실제 POS 원천 테이블 및 V6 마트에서 검증된 정규 실측 데이터(전년도 판매수량, 전년도 매출액, 공식 단가, 월별 계절성 판매 분포)를 백엔드 SSOT 완제품으로 반환해야 합니다.

### 12-2. 엔드포인트 명세
* **URL**: `GET /api/v6/report/leisure-top-products`
* **Query Parameters**:
  * `facility` (필수, string): 영업장 명칭 (예: `마운틴카트`, `놀이동산`, `사계절썰매장`, `벨포레 목장`, `미디어아트센터`, `마리나 클럽`, `벨포레 목장(체험)`)
  * `baseYear` (선택, number, 기본값: 최신 마감 연도 2025): 기준이 되는 전년도(LY) 실적 연도

### 12-3. 응답 데이터 규격 (100% camelCase JSON)
```json
{
  "success": true,
  "facility": "마운틴카트",
  "baseYear": 2025,
  "totalFacilityRevenue": 1420500000,
  "topProducts": [
    {
      "rank": 1,
      "itemId": "CART_001",
      "itemName": "마운틴카트 1회권(대인)",
      "currentPrice": 15000,
      "lySoldQty": 52400,
      "lyRevenue": 786000000,
      "sharePct": 55.3,
      "monthlyQty": [1200, 1500, 2800, 5400, 7200, 6100, 5800, 6900, 5300, 4800, 3100, 2300],
      "monthlyRevenue": [18000000, 22500000, 42000000, 81000000, 108000000, 91500000, 87000000, 103500000, 79500000, 72000000, 46500000, 34500000]
    },
    {
      "rank": 2,
      "itemId": "CART_002",
      "itemName": "마운틴카트 2회권(대인)",
      "currentPrice": 25000,
      "lySoldQty": 14200,
      "lyRevenue": 355000000,
      "sharePct": 25.0,
      "monthlyQty": [300, 400, 800, 1500, 2100, 1800, 1700, 2000, 1500, 1200, 500, 400],
      "monthlyRevenue": [7500000, 10000000, 20000000, 37500000, 52500000, 45000000, 42500000, 50000000, 37500000, 30000000, 12500000, 10000000]
    },
    {
      "rank": 3,
      "itemId": "CART_003",
      "itemName": "마운틴카트 1회권(소인)",
      "currentPrice": 12000,
      "lySoldQty": 11500,
      "lyRevenue": 138000000,
      "sharePct": 9.7,
      "monthlyQty": [200, 300, 600, 1200, 1600, 1400, 1500, 1800, 1300, 1000, 400, 200],
      "monthlyRevenue": [2400000, 3600000, 7200000, 14400000, 19200000, 16800000, 18000000, 21600000, 15600000, 12000000, 4800000, 2400000]
    },
    {
      "rank": 4,
      "itemId": "CART_004",
      "itemName": "마운틴카트 2회권(소인)",
      "currentPrice": 20000,
      "lySoldQty": 4100,
      "lyRevenue": 82000000,
      "sharePct": 5.8,
      "monthlyQty": [50, 100, 200, 450, 600, 550, 500, 650, 450, 350, 150, 50],
      "monthlyRevenue": [1000000, 2000000, 4000000, 9000000, 12000000, 11000000, 10000000, 13000000, 9000000, 7000000, 3000000, 1000000]
    },
    {
      "rank": 5,
      "itemId": "CART_005",
      "itemName": "마운틴카트 동승권",
      "currentPrice": 5000,
      "lySoldQty": 11900,
      "lyRevenue": 59500000,
      "sharePct": 4.2,
      "monthlyQty": [250, 300, 650, 1250, 1650, 1450, 1350, 1650, 1300, 1150, 550, 350],
      "monthlyRevenue": [1250000, 1500000, 3250000, 6250000, 8250000, 7250000, 6750000, 8250000, 6500000, 5750000, 2750000, 1750000]
    }
  ]
}
```

### 12-4. 수학적 시뮬레이션 연산 규칙 (SSOT Mathematical Model)
1. **월별 계절성(Seasonality) 보존 원칙**:
   - 단순 연평균 균등 분할(1/12)은 리조트 비즈니스의 성수기/비수기 편차를 심각하게 왜곡합니다.
   - 따라서 반드시 전년도 각 월별 실측 판매수량(`monthlyQty[monthIndex]`)에 기반하여 시뮬레이션을 수행합니다.
2. **시나리오 1: 작년과 동일한 상황 (전년 고객수 유지, 변동률 0%)**:
   - 상품별 예상 연매출: $\text{AnnualRev} = \sum_{m=1}^{12} (\text{AdjustedPrice} \times \text{monthlyQty}_m)$
   - 상품별 예상 m월 매출: $\text{MonthlyRev}_m = \text{AdjustedPrice} \times \text{monthlyQty}_m$
3. **시나리오 2: 고객수 비율 조정 (+10%, +30% 등 탄력성 조정)**:
   - 고객 증감률 $\Delta Q$ 적용 시 예상 m월 수량: $\text{Qty}'_m = \text{monthlyQty}_m \times (1 + \frac{\Delta Q}{100})$
   - 상품별 예상 연매출: $\text{AnnualRev}' = \sum_{m=1}^{12} (\text{AdjustedPrice} \times \text{Qty}'_m)$
   - 상품별 예상 m월 매출: $\text{MonthlyRev}'_m = \text{AdjustedPrice} \times \text{Qty}'_m$
4. **Top 5 종합 효과 및 차액(Delta) 계산**:
   - 연간 총 예상 매출: $\sum_{i=1}^{5} \text{AnnualRev}'_i$
   - 전년 실적 대비 차액: $\Delta \text{Revenue} = \text{AnnualRev}'_{\text{Total}} - \text{LYRevenue}_{\text{Total}}$
   - 성장률(%): $(\Delta \text{Revenue} / \text{LYRevenue}_{\text{Total}}) \times 100$

### 12-5. 백엔드 구현 가이드 및 DB 소스 매핑
* **참조 테이블**:
  - `dim_facility_team_mapping` (영업장 및 카테고리 필터링: `category_code = 'TICKET'`)
  - `raw_pos_ticket_detail` 또는 `fact_leisure_sales_v6` (POS 상세 전표 데이터)
  - `dim_pos_item_master` (티켓 품목 식별자, 품목명, 기준 정상가)
* **쿼리 로직 요약**:
  1. 지정된 `facility`와 `baseYear`(예: 2025)의 전표 데이터에서 `SUM(net_amount)` 기준 상위 5개 `item_id` 추출.
  2. 추출된 5개 상품에 대해 1~12월 월별 `SUM(sales_qty)` 및 `SUM(net_amount)` 집계.
  3. JSON camelCase로 정규화하여 반환.

---



