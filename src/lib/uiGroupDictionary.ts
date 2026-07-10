// src/lib/uiGroupDictionary.ts

/**
 * 전역 1:1 매핑 딕셔너리 (SSOT)
 * 앱 내에서 문자열 검색(.includes)을 사용하지 않고 O(1) 매핑을 수행하기 위한 데이터입니다.
 */

// DailySalesReport 등에서 매장 이름을 정규화할 때 사용하는 매핑
export const shopNameNormalizer: Record<string, string> = {
  '놀이동산(2024)': '놀이동산',
  '놀이동산(2025)': '놀이동산',
  '사계절썰매': '사계절썰매장',
  '마리나클럽': '마리나클럽',
};



// 객실 타입 매핑 (16평, 35평, 51평 분류)
export const roomTypeNormalizer: Record<string, string> = {
  '16평': '16평',
  '벨포레 16평': '16평',
  '콘도 16평': '16평',
  '35평': '35평',
  '벨포레 35평': '35평',
  '콘도 35평': '35평',
  '51평': '51평',
  '벨포레 51평': '51평',
  '콘도 51평': '51평',
};
