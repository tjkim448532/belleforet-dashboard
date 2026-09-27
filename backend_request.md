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

## 3. 요약: 프론트엔드의 무관용 원칙 (Pure Consumer)
프론트엔드는 이제 일체의 **가짜 데이터(Mock 상수, 임의 폴백값, 가짜 비율)**를 허용하지 않으며, 백엔드가 내려주지 않은 데이터는 무조건 `0` 또는 `'-'`로 표기합니다.
따라서 사용자가 온전한 화면을 볼 수 있도록 위 두 가지 API의 마트 집계 및 배포를 우선순위로 진행해 주시기 바랍니다.

