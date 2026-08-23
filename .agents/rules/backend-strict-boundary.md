---
name: belleforet-agent-rr-boundary
description: 벨포레 프론트엔드/대시보드 작업 시 백엔드 프로젝트(belleforet-data, AWS, DB, API) 절대 접근 금지 및 엄격한 R&R 경계 준수 규칙 (Never touch backend projects under any circumstances)
---

# 🛡️ 벨포레 백엔드 프로젝트 접근 금지 및 R&R 절대 원칙 (Strict Backend Prohibition)

## 1. 절대 금지 원칙 (Zero Tolerance: NEVER TOUCH BACKEND)
* **백엔드 프로젝트 디렉토리 접근 전면 금지**:
  - `E:\앱\AWS\belleforet-data`, AWS Lambda, RDS DB, API 백엔드 서버 프로젝트에는 사용자의 명시적인 직접 지시가 없는 한 **어떠한 경우에도 임의로 파일을 수정, 커밋, 푸시, 실행하거나 접근해서는 안 됩니다.**
* **프론트엔드의 본분 (Pure Consumer Principle)**:
  - 프론트엔드 대시보드(`belleforet-dashboard`)는 백엔드가 이미 배포한 완성된 API 엔드포인트를 호출하여 화면에 렌더링하는 **순수 데이터 소비자(Pure Consumer)** 역할에만 100% 집중합니다.

## 2. 백엔드 수정 필요 시 대응 프로토콜
* 만약 프론트엔드 개발 중 백엔드 데이터 모델, DB 매핑, API 엔드포인트 수정이 필요할 경우:
  1. **백엔드 코드를 직접 수정하는 행위를 일체 금지합니다.**
  2. 오직 백엔드 개발팀에 전달할 **[백엔드 요청사항 명세서 (Markdown Document)]**만을 작성하여 프론트엔드 프로젝트 내에 저장하거나 사용자에게 보고합니다.
  3. 백엔드 코드의 실행, SQL 주입, DB 업데이트는 백엔드 담당자의 승인 하에 별도로 진행되어야 합니다.

## 3. 리포지토리 완전 격리
* `git commit` 및 `git push` 명령어 실행 시 오직 현재 작업 중인 프론트엔드 리포지토리(`belleforet-dashboard`)만을 대상으로 하며, 타 백엔드 디렉토리로 이동하여 임의로 커밋/푸시하는 행위를 절대 금지합니다.
