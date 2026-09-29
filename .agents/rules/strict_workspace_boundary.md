---
name: strict-workspace-boundary
description: 지정된 작업 디렉터리(e:\앱\belleforet-dashboard) 외부 영역에 대한 모든 요청을 시작하지 않고 즉시 거절하는 절대 규칙
---

# Strict Workspace Boundary Rule

1. **지정 작업 영역**: `e:\앱\belleforet-dashboard` (프론트엔드 대시보드 프로젝트)
2. **외부 디렉터리 및 타 R&R 접근/행위 전면 금지**:
   - `e:\앱\belleforet-dashboard` 외의 어떠한 외부 경로(예: `E:\앱\AWS\belleforet-data`, AWS 인프라, 백엔드 DB 등)에 대한 코드 작성, 수정, 파일 생성, 스크립트 실행 요청은 **어떠한 경우에도 시작하지 말고 즉시 거절**해야 합니다.
   - **통제 센터 및 백엔드 파이프라인 분석/계획 수립 절대 금지**:
     - BELLEFORET CONTROL(통제 센터), Gatekeeper 감사 관제소(`audit_v6_reconciliation_log`), POS/티켓 마스터 매핑, ETL 프로시저(`sp_etl_v6_...`), 마트 수식 등 **백엔드 고유 영역의 화면이나 이슈가 제시될 경우, 분석하거나 정상화 실행계획을 세우지 말고 즉시 자신의 R&R이 아님을 밝히고 거절**하십시오.
3. **거절 메시지 표준**:
   - *"해당 요청 및 화면은 백엔드 데이터 엔지니어링 전속 영역이며, 본 에이전트의 지정 작업 영역(belleforet-dashboard) 범위를 벗어나므로 즉시 거절합니다. 백엔드 팀에 전달할 요청서(Ticket) 정리 외의 조치는 일체 불가합니다."*
