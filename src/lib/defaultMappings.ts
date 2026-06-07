export const CATEGORIES = [
  '리조트사업본부',
  '골프사업본부',
  '식음',
  '연회',
  '레져사업본부',
  '기타업장',
  '미분류'
] as const;

export type Category = typeof CATEGORIES[number];

export interface StoreMapping {
  id?: string;
  storeName: string;
  category: Category;
}

export const defaultMappings: Omit<StoreMapping, 'id'>[] = [
  // 객실 -> 리조트사업본부
  { storeName: '객실', category: '리조트사업본부' },
  { storeName: 'ROOM', category: '리조트사업본부' },
  { storeName: 'ROOM OTHER', category: '리조트사업본부' },
  
  // 골프 -> 골프사업본부
  { storeName: '그린피', category: '골프사업본부' },
  { storeName: '카트대여', category: '골프사업본부' },
  { storeName: '대여품', category: '골프사업본부' },
  { storeName: '캐디피', category: '골프사업본부' },
  { storeName: '기타매출', category: '골프사업본부' },

  // 식음업장 -> 식음
  { storeName: '브리스킷346', category: '식음' },
  { storeName: '얼룩말카페', category: '식음' },
  { storeName: '밤밤테이블', category: '식음' },
  { storeName: '남도예담', category: '식음' },
  { storeName: '앵무새촌', category: '식음' },
  { storeName: '클럽하우스-레스토랑', category: '식음' },
  { storeName: '클럽하우스-스타트하우스', category: '식음' },
  { storeName: '쿠치나', category: '식음' },
  { storeName: '핏스탑', category: '식음' },
  { storeName: '딜라이트', category: '식음' },
  { storeName: '밤밤트럭', category: '식음' },

  // 연회
  { storeName: '연회장', category: '연회' },

  // 티켓업장 -> 레져사업본부
  { storeName: '마운틴카트', category: '레져사업본부' },
  { storeName: '사계절썰매장', category: '레져사업본부' },
  { storeName: '마리나 클럽', category: '레져사업본부' },
  { storeName: '놀이동산(2025)', category: '레져사업본부' },
  { storeName: '벨포레 목장', category: '레져사업본부' },
  { storeName: '벨포레 목장(체험)', category: '레져사업본부' },
  { storeName: '디노 시네마', category: '레져사업본부' },
  { storeName: '모토아레나', category: '레져사업본부' },
  { storeName: '미디어아트센터', category: '레져사업본부' },
  { storeName: '미디어-뮤지엄카페', category: '레져사업본부' },
  { storeName: '벨포레온', category: '레져사업본부' },
  { storeName: '원더풀', category: '레져사업본부' },
  { storeName: '벨포레 리조트', category: '레져사업본부' },
  { storeName: '썸머랜드', category: '레져사업본부' },
  { storeName: '펫포레', category: '레져사업본부' },

  // 기타업장
  { storeName: '프로샵', category: '기타업장' },
  { storeName: '미디어-기프트샵', category: '기타업장' },
  { storeName: '벨포레 굿즈', category: '기타업장' },
  { storeName: '투썸플레이스', category: '기타업장' },
  { storeName: 'BHC(멕시카나)', category: '기타업장' },
  { storeName: 'CU편의점', category: '기타업장' },
  { storeName: '주차관제', category: '기타업장' },
];
