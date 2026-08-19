# 📖 벨포레 프론트엔드 전담 AI 핵심 협업 원칙 (Belleforet Global Agent Rules)

## 1. 🚨 [절대 무관용 원칙] 백엔드 코드 수정 절대 금지 (NEVER TOUCH BACKEND CODE)
- **STRICT READ-ONLY BOUNDARY**: 어떠한 경우에도 백엔드 소스코드, API 라우트 핸들러, DB 스키마, 저장 프로시저, ETL 파이프라인 스크립트를 직접 수정, 패치, 변형하지 마십시오. 백엔드는 **100% 읽기 전용(Strict Read-Only)** 경계입니다.
- **NO BACKEND MUTATION**: 데이터 누락이나 오차 발생 시 백엔드 코드를 건드리지 않고, 오직 기존의 공식 V5/V6 API 엔드포인트와 정규 규격만을 소비하여 프론트엔드/관리자 단에서 대응합니다.
- **REJECT BREAKING FRONTIER HACKS**: 백엔드 연산이 필요한 데이터 누락 건을 프론트엔드 단에서 `reduce`나 정규식 오타 추측 로직으로 임의 연산하지 않습니다. 백엔드 조치가 필요한 경우 `backend_api_request.md` 공식 명세서로 소통합니다.

## 2. 🛡️ [응답 및 협업 태도 원칙] 분석 우선 및 임의 코딩 금지
- **ANALYSIS & EXPLANATION FIRST**: 사용자가 "원인이 뭐지?", "왜 이렇게 나오지?" 등 원인 규명이나 현상 분석을 질문할 때는 임의로 프론트엔드/백엔드 코드를 먼저 수정하지 마십시오. 반드시 원천 데이터와 API 응답을 기반으로 팩트를 정밀 분석하여 명확한 설명과 답변을 먼저 제공해야 합니다.
- **NO ARBITRARY FRONTEND PATCH (스마트 치환 금지)**: 백엔드에서 과거 레거시 명칭(예: 익스트림 루지)이나 오매핑된 텍스트가 내려오더라도, 프론트엔드 코드에 `if`문이나 정규식으로 임의 치환(`replace`)하는 땜질식 코드를 절대 작성하지 마십시오. 원천 DB 정정을 위한 공식 요청서(`backend_api_request.md`)를 작성하여 백엔드 에이전트가 처리하도록 합니다.
- **ZERO ARBITRARY NUMBERS (거짓/추측 숫자 박멸)**: 진본 엑셀과 시스템 데이터 대사 시 임의의 추측값이나 가짜 폴백을 일체 배제하고, 1원 단위까지 전수 대사하여 명확한 근거(매핑 누락, 안분 룰 편차, 부가세 단수 등)를 투명하게 밝힙니다.

## 3. 백엔드 소통 및 명세서 공식 작성 (Backend API Request Document)
- API 수치 누락, 파라미터 누락, 신규 필드 필요 시 억지로 코드를 수정하지 않고, **`backend_api_request.md`** 아티팩트에 요청 번호(`REQ-V5-...`)와 함께 명확한 JSON 구조로 백엔드 조치 요청서를 정리합니다.

## 4. 벨포레 데이터 통합 통제 바이블 (The Bible v4.2) 엄수
- **NO SLICE SUMMATION**: 프론트엔드는 배열 데이터를 `reduce`나 `for`문으로 직접 더해서 총합이나 소계를 구해서는 안 되며, 백엔드가 제공하는 완성된 `camelCase` 정규화 수치만 사용합니다.
- **다중 월/기간 조회 원칙**: 대시보드 기간 조회 시 API를 반복 호출하지 않고 `startDate`와 `endDate` 파라미터를 사용하여 1회 호출로 처리합니다.
- **NO FALLBACK CHAINS (Strict Typing)**: 프론트엔드 코드 내에서 스네이크 케이스 필드나 임시 필드들을 혼용하는 방어적 폴백 체인(예: `totalSales || todayActual || total_sales`)을 절대 사용하지 마십시오. 백엔드가 보장하는 단일 SSOT 키(예: `totalSales`, `categoryCode`, `shopName`)에만 완벽하게 1:1로 매핑하여야 하며, 데이터 누락 시 화면에 0으로 노출되더라도 프론트엔드가 임의로 연산하거나 다른 필드를 끌어다 쓰지 않습니다.

## 5. 100% 무결점 검증 & 원스톱 운영 배포
- 코드 수정 후에는 항상 사전 `npm run build`를 실행하여 0 에러/0 경고를 확인합니다.
- 작업 완료 후 **Firebase Hosting 배포 (`firebase deploy --only hosting`)** 및 **Git 커밋/푸시 (`git commit & git push`)**까지 한 호흡으로 깔끔하게 마칩니다.

## 6. 프로젝트 및 워크스페이스 경계 준수 (Strict Project Boundary & Context Isolation)
- **NO EXTERNAL PROJECT MUTATION**: 사용자가 제공한 화면이나 요청이 본 대시보드 프로젝트(`e:\앱\belleforet-dashboard`)의 코드가 아닌 경우(예: 외부 어드민 화면, 타 리포지토리), 본 프로젝트의 기존 컴포넌트에 임의로 이식하거나 변형하지 마십시오.
- **CLARIFY BEFORE EDITING**: 프로젝트에 존재하지 않는 외부 화면/기능에 대한 레이아웃 변경 요청을 받았을 때는, 즉시 코드를 수정하지 말고 대상 프로젝트/화면 위치를 사용자에게 먼저 명확히 확인한 후 조치합니다.
