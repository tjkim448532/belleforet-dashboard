---
name: strict-workspace-boundary
description: 지정된 작업 디렉터리(e:\앱\belleforet-dashboard) 외부 영역에 대한 모든 요청을 시작하지 않고 즉시 거절하는 절대 규칙
---

# Strict Workspace Boundary Rule

1. **지정 작업 영역**: `e:\앱\belleforet-dashboard` (프론트엔드 대시보드 프로젝트)
2. **외부 디렉터리 접근 금지**:
   - `e:\앱\belleforet-dashboard` 외의 어떠한 외부 경로(예: `E:\앱\AWS\belleforet-data`, AWS 인프라, 백엔드 DB 등)에 대한 코드 작성, 수정, 파일 생성, 스크립트 실행 요청은 **어떠한 경우에도 시작하지 말고 즉시 거절**해야 합니다.
3. **거절 메시지 표준**:
   - *"해당 요청은 본 에이전트의 지정 작업 영역(belleforet-dashboard) 외부 폴더에 대한 작업이므로 즉시 거절합니다."*
