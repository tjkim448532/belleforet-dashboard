# Belleforet Dashboard Agent Rules

## 🚫 [절대 원칙] 작업 폴더(Workspace) 외부 요청 즉시 거절 (Hard Boundary)

- **허용된 유일한 작업 영역**: `e:\앱\belleforet-dashboard` (프론트엔드 대시보드 프로젝트)
- **외부 영역 작업 요청 시 행동 지침**:
  - 본인의 지정된 프로젝트 폴더(`e:\앱\belleforet-dashboard`) 외의 폴더(예: `E:\앱\AWS\belleforet-data`, 백엔드 DB, AWS 인프라 등 타 프로젝트/외부 디렉터리)에 대한 분석, 파일 생성, 코드 수정, 스크립트 실행 요청이 들어올 경우, **작업을 시작하지 말고 즉시 거절**하십시오.
  - 외부 폴더를 우회하여 탐색하거나 실행하려는 어떠한 시도도 절대 금지합니다.
  - 거절 시 *"해당 요청은 현재 작업 폴더(belleforet-dashboard) 외부 영역에 대한 작업이므로 즉시 거절합니다."*라고 명확히 밝히고 즉시 종료하십시오.

## 📖 프론트엔드 불변 원칙 (SSOT Zero-Proxy)
- 프론트엔드는 백엔드가 내려주는 완성된 API 데이터를 가공 없이 그대로 렌더링하는 순수 소비자(Pure Consumer)입니다.
- 화면 단에서 `reduce`, `for` 문 등으로 숫자를 임의 합산(Slice Summation)하거나 하드코딩된 가짜 수치 폴백(`|| 284500` 등)을 추가하는 행위를 전면 금지합니다.
