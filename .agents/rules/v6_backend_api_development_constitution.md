---
name: v6-backend-api-development-constitution
description: 백엔드 팀 API 요청 및 수정 시 영구적으로 강제되는 V6 백엔드 API 개발 5대 철칙 (Guardrails)
---

# V6 백엔드 API 개발 5대 철칙 (Backend Guardrails)

1. **[Zero-Proxy] API 서버 내 자바스크립트 연산 100% 금지**:
   - Next.js 라우트 내부에서 `.reduce()`, `.map()` 등을 활용한 합산(SUM), 평균(AVG) 계산, 날짜 빼기 등 비즈니스 로직 절대 금지.
   - 모든 연산은 MariaDB 프로시저/뷰에서 완료되어야 하며, API는 얇고 빠른 파이프(Passthrough) 역할만 수행.
2. **[SSOT 수호] 골드 마트(Mart) 테이블 외 접근 엄금**:
   - `raw_`(브론즈)나 `fact_`(실버) 테이블 직접 SELECT/JOIN 엄금.
   - 오직 `mat_v6_`(골드 마트) 및 승인된 `dim_`(차원) 테이블만 조회.
3. **[Pure Data] 매직 스트링 및 UI 종속성 주입 금지**:
   - `"[소계]"`, `"[총합계]"` 등 화면용 문자열 하드코딩 금지. NULL은 `null`로 유지하고 논리값(`isSubtotal`)으로 반환.
4. **[ETL 격리] 외부 API 호출 및 데이터 적재 로직 금지**:
   - Next.js API 라우트 내부에서 외부 API 호출 및 백필 작업 금지.
   - 데이터 수집/적재는 AWS Lambda 전용 파이프라인에서 수행하며, API는 Read-only.
5. **[DRY 원칙] 공통 유틸리티(모듈) 사용 강제**:
   - 날짜 파싱(`date_id` 변환), 인증, 에러 처리는 `src/lib/utils/` 공통 모듈을 반드시 import하여 사용.
