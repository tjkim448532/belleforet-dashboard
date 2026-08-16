# 📖 벨포레 프론트엔드 전담 AI 핵심 협업 원칙 (Belleforet Global Agent Rules)

## 1. 백엔드 경계 준수 원칙 (Strict Boundary & Read-Only)
- **NO BACKEND MUTATION**: 프론트엔드 작업 시 백엔드 코드(API 라우트, DB 설정 등)를 절대로 임의 수정하거나 변경하지 마십시오. 백엔드는 strict read-only 경계로 취급합니다.
- **REJECT BREAKING FRONTIER HACKS**: 백엔드 연산이 필요한 데이터 누락 건을 프론트엔드 단에서 `reduce`나 정규식 오타 추측 로직으로 임의 연산하지 않습니다.

## 2. 백엔드 소통 및 명세서 공식 작성 (Backend API Request Document)
- API 수치 누락, 파라미터 누락, 신규 필드 필요 시 억지로 코드를 수정하지 않고, **`backend_api_request.md`** 아티팩트에 요청 번호(`REQ-V5-...`)와 함께 명확한 JSON 구조로 백엔드 조치 요청서를 정리합니다.

## 3. 벨포레 데이터 통합 통제 바이블 (The Bible v4.2) 엄수
- **NO SLICE SUMMATION**: 프론트엔드는 배열 데이터를 `reduce`나 `for`문으로 직접 더해서 총합이나 소계를 구해서는 안 되며, 백엔드가 제공하는 완성된 `camelCase` 정규화 수치만 사용합니다.
- **다중 월/기간 조회 원칙**: 대시보드 기간 조회 시 API를 반복 호출하지 않고 `startDate`와 `endDate` 파라미터를 사용하여 1회 호출로 처리합니다.
- **NO FALLBACK CHAINS (Strict Typing)**: 프론트엔드 코드 내에서 스네이크 케이스 필드나 임시 필드들을 혼용하는 방어적 폴백 체인(예: `totalSales || todayActual || total_sales`)을 절대 사용하지 마십시오. 백엔드가 보장하는 단일 SSOT 키(예: `totalSales`, `categoryCode`, `shopName`)에만 완벽하게 1:1로 매핑하여야 하며, 데이터 누락 시 화면에 0으로 노출되더라도 프론트엔드가 임의로 연산하거나 다른 필드를 끌어다 쓰지 않습니다.

## 4. 100% 무결점 검증 & 원스톱 운영 배포
- 코드 수정 후에는 항상 사전 `npm run build`를 실행하여 0 에러/0 경고를 확인합니다.
- 작업 완료 후 **Firebase Hosting 배포 (`firebase deploy --only hosting`)** 및 **Git 커밋/푸시 (`git commit & git push`)**까지 한 호흡으로 깔끔하게 마칩니다.

## 5. 프로젝트 및 워크스페이스 경계 준수 (Strict Project Boundary & Context Isolation)
- **NO EXTERNAL PROJECT MUTATION**: 사용자가 제공한 화면이나 요청이 본 대시보드 프로젝트(`e:\앱\belleforet-dashboard`)의 코드가 아닌 경우(예: 외부 어드민 화면, 타 리포지토리), 본 프로젝트의 기존 컴포넌트에 임의로 이식하거나 변형하지 마십시오.
- **CLARIFY BEFORE EDITING**: 프로젝트에 존재하지 않는 외부 화면/기능에 대한 레이아웃 변경 요청을 받았을 때는, 즉시 코드를 수정하지 말고 대상 프로젝트/화면 위치를 사용자에게 먼저 명확히 확인한 후 조치합니다.
