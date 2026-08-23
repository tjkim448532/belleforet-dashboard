---
name: belleforet-frontend-ssot-no-local-mapping
description: 벨포레 프론트엔드 SSOT 절대 준수, 대표님 공식 명칭 100% 보존, 로컬 하드코딩 매핑/스마트 추론 전면 금지 규칙 (Official SSOT Naming, No Local Mapping, Pure Consumer Principle)
---

# 🛡️ 벨포레 프론트엔드 SSOT 및 공식 명칭 절대 보존 원칙 (Strict SSOT & Official Naming)

본 스킬은 벨포레 데이터 시스템의 **단일 진실 공급원(SSOT, Single Source of Truth) 원칙**을 수호하고, 대표님께서 확립하신 **공식 부문/본부 명칭을 임의로 축약·변경하는 행위를 원천 차단**하기 위한 표준 운영 절차(SOP)입니다.

---

## 🚨 1. 공식 사업본부 명칭 100% 원문 보존 원칙 (Official Naming SSOT)

프론트엔드 코드, 아코디언 헤더, 필터 버튼, 차트 라벨, 슬라이더 어디에서도 대표님이 정립하신 공식 조직/부문 명칭을 임의로 약칭(예: 객실, 골프, 식음, 대관 등)으로 변형하거나 단순화해서는 안 됩니다.

| 공식 부문 코드 | 대표님 지정 공식 본부/부문 명칭 (SSOT) | 필수 화면 표기 형태 |
| :--- | :--- | :--- |
| **`GOLF`** | **골프사업본부** | `GOLF` (골프사업본부) |
| **`ROOM`** | **리조트사업본부** | `ROOM` (리조트사업본부) |
| **`FNB`** | **콘텐츠기획본부** | `FNB` (콘텐츠기획본부) |
| **`TICKET`** / **`LEISURE`** | **레저본부** | `TICKET` (레저본부) |
| **`MOTO`** | **모토아레나** | `MOTO` (모토아레나) |
| **`BANQUET`** | **세일즈본부** | `BANQUET` (세일즈본부) |
| **`PARKING`** | **주차관제** | `PARKING` (주차관제) |

---

## 🚨 2. 무관용 4대 절대 금지 원칙 (Zero-Tolerance Rules)

1. **🚫 공식 명칭 임의 축약 금지 (No Name Alteration)**:
   - `리조트사업본부`를 `객실`로, `콘텐츠기획본부`를 `식음`으로, `세일즈본부`를 `대관`으로 임의 변경하는 행위 전면 금지.
   - 항상 `categoryCode` + `teamName`(공식 본부명)을 완벽한 짝으로 표출할 것.

2. **🚫 프론트엔드 내 매핑 사전(Mapping Dictionary) 탑재 금지**:
   - `masterItemMapping.ts`, `itemMap.json` 등 로컬 딕셔너리로 품목/영업장을 프론트엔드에서 치환하지 말 것.

3. **🚫 스마트 추론/정규식 텍스트 가공 금지 (No Smart Guessing)**:
   - 조건문이나 정규표현식으로 영업장, 부서, 카테고리를 자체 유추하거나 오타를 보정하지 말 것.

4. **🚫 자체 집계 및 합산 금지 (No Frontend Slice Summation)**:
   - 프론트엔드는 `reduce` 등으로 배열을 직접 더하지 않고, 백엔드가 내려준 소계(`isSubtotal`)와 총합을 그대로 소비할 것.

---

## 🏛️ 3. 페이지 분리 및 확장 시의 듀얼 아키텍처 원칙 (Dual-Page Principle)

* 사용자가 **"기존 페이지를 유지하고 똑같은 기본 구조에 신규 기능을 넣은 페이지를 추가하라"**고 지시할 경우:
  1. 기존 페이지 컴포넌트(`TargetSimulator.tsx` 등)는 원형 그대로 100% 보존합니다.
  2. 신규 확장 페이지(`StrategicSimulator.tsx` 등)를 별도 파일로 독립 생성하고 고유 라우트(`/strategic-simulator`) 및 사이드바 메뉴를 신설합니다.
  3. 두 페이지 간 코드가 엉키지 않도록 독립성과 책임 영역을 명확히 분리합니다.
