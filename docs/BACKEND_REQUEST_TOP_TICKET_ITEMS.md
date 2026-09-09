# [백엔드 API 개선 요청서] 레저본부 티켓 품목(트랜잭션) 팩트 테이블 연동 및 현장 POS+온라인 통합 순위 제공

- **문서 번호**: `BF-BE-REQ-20260909-04`
- **수신**: 백엔드 엔지니어링 파이프라인 팀
- **발신**: 프론트엔드 대시보드 팀
- **일자**: 2026-09-09
- **긴급도**: **HIGH (레저 품목별 실측 트랜잭션 데이터 100% 반영)**

---

## 1. 요청 배경 및 현황 분석 (Root Cause)

프론트엔드 레저 영업장 대시보드의 **`[가장 많이 팔린 티켓 TOP 5]` (레저본부 단일 티켓/패스 상품 트랜잭션 기준 순위)** 카드에서, 기존 백엔드 API인 `/api/v6/report/top-ticket-items`를 조회할 때 아래와 같은 심각한 데이터 누락이 발생하고 있습니다:

1. **온라인 원천만 단독 조회하는 결함**:
   - 현재 `src/app/api/v6/report/top-ticket-items/route.ts`의 SQL은 `raw_티켓_판매_v6` 테이블만 조회합니다.
   - `raw_티켓_판매_v6`는 **온라인 예매 채널만 적재**되어 있어, 레저본부 매출의 대다수를 차지하는 **현장 POS 발권 품목(놀이동산 현장권, 마운틴카트 현장권, 목장 입장권 등)이 전면 누락**됩니다.
2. **마스터 팩트 테이블 `fact_ticket_sales_v6`의 존재**:
   - MariaDB 프로덕션에는 이미 선행 ETL 프로시저를 거쳐 **온라인 + 현장 POS + 패키지 정산이 100% 통합된 `fact_ticket_sales_v6`**가 구축되어 있습니다.
   - 이 테이블에는 `product_name`(상품명), `venue_name`(업장명), `category_code = 'TICKET'`, `revenue`(순매출), `quantity`(수량)가 완벽하게 정규화되어 있으며, 쿼리 수행 시간도 **10ms**에 불과합니다.

---

## 2. 실측 벤치마크 결과 비교 (2026-09-08 기준)

| 구분 | AS-IS (`raw_티켓_판매_v6` 단독) | TO-BE (`fact_ticket_sales_v6` POS+온라인 통합) |
| :--- | :--- | :--- |
| **조회 범위** | 온라인 예매 14건에 불과 (현장 POS 100% 누락) | **현장 POS + 온라인 + 패키지 100% 통합 (104건)** |
| **1위 상품** | 일반_1인승 2회권 (모토아레나 혼입) / 679,999원 | **단체(3회권) (놀이동산(2025)) / 1,090,909원 (100개)** |
| **2위 상품** | 원더풀_파고라(4인) / 200,000원 | **아메리카노(I) (놀이동산(2025)) / 522,727원 (115개)** |
| **3위 상품** | 원더풀_카바나(2인) / 200,000원 | **그랜드포렛_예약단체 (마운틴카트) / 362,727원 (19개)** |
| **4위 상품** | 일반_1인승 3회권 (모토아레나) / 181,818원 | **청포도에이드 (놀이동산(2025)) / 338,182원 (62개)** |
| **5위 상품** | 패밀리 4종 패스 / 89,091원 | **컵츄로스 (놀이동산(2025)) / 227,273원 (50개)** |
| **속도** | ~50ms | **10ms (초고속 인덱스 스캔)** |

---

## 3. 백엔드 API 소스코드 교체 요청 (`top-ticket-items/route.ts`)

`src/app/api/v6/report/top-ticket-items/route.ts`의 `GET` 핸들러 내부 쿼리를 아래와 같이 `fact_ticket_sales_v6` 기준으로 교체해 주시기를 요청드립니다:

```typescript
// 파일: src/app/api/v6/report/top-ticket-items/route.ts

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const categoryParam = searchParams.get('category') || 'TICKET'; // 기본값 TICKET (레저본부)
  const limitParam = searchParams.get('limit');
  const limit = Math.max(1, Math.min(Number(limitParam) || 10, 50));

  let startDateStr = '';
  let endDateStr = '';

  if (startDateParam && endDateParam && /^\d{4}-\d{2}-\d{2}$/.test(startDateParam) && /^\d{4}-\d{2}-\d{2}$/.test(endDateParam)) {
    startDateStr = startDateParam;
    endDateStr = endDateParam;
  } else if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    startDateStr = dateParam;
    endDateStr = dateParam;
  } else {
    const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    startDateStr = now.toISOString().split('T')[0];
    endDateStr = startDateStr;
  }

  const startDateId = startDateStr.replace(/-/g, '');
  const endDateId = endDateStr.replace(/-/g, '');

  let connection;
  try {
    connection = await DbRepository.getConnection();

    // fact_ticket_sales_v6 마스터 팩트 테이블에서 현장 POS + 온라인 통합 품목 집계
    const [rows]: any = await connection.query(`
      SELECT 
        product_name AS itemName,
        venue_name AS facilityName,
        category_code AS categoryCode,
        ROUND(SUM(revenue)) AS sales,
        SUM(quantity) AS quantity,
        ROUND(SUM(revenue) / NULLIF(SUM(quantity), 0)) AS unitPrice
      FROM fact_ticket_sales_v6
      WHERE date_id BETWEEN ? AND ?
        AND category_code = ?
        AND product_name IS NOT NULL AND product_name != ''
      GROUP BY product_name, venue_name, category_code
      ORDER BY sales DESC
      LIMIT ?
    `, [startDateId, endDateId, categoryParam, limit]);

    const topItems = rows.map((r: any, idx: number) => ({
      rank: idx + 1,
      itemName: r.itemName,
      facilityName: r.facilityName,
      categoryCode: r.categoryCode,
      sales: Number(r.sales || 0),
      quantity: Number(r.quantity || 0),
      unitPrice: Number(r.unitPrice || 0)
    }));

    return NextResponse.json({
      success: true,
      queryPeriod: {
        startDate: startDateStr,
        endDate: endDateStr,
        category: categoryParam
      },
      topItems: topItems
    }, { headers: responseHeaders });
```

---

## 4. 프론트엔드 조치 완료 사항

1. `src/pages/LeisureFacility.tsx`:
   - 기존의 잘못된 엔드포인트 호출(`/api/v6/report/leisure-organization`)을 정상적인 `/api/v6/report/top-ticket-items` 호출로 전면 수정.
   - 단일 상품이 없을 때 영업장(시설) 명칭이 상품으로 오인 표시되던 Fallback 로직 완전 제거.
   - 총액수(`sales`) 기준 내림차순 엄격 정렬 적용.
2. 배포: `main` 브랜치에 커밋 및 푸시 완료 (`933ff6c`).
