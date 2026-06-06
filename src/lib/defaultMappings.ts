export const CATEGORIES = [
  '객실',
  '골프',
  '식음업장',
  '연회',
  '티켓업장',
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
  // 객실
  { storeName: '객실', category: '객실' },
  { storeName: 'ROOM', category: '객실' },
  { storeName: 'ROOM OTHER', category: '객실' },
  
  // 골프
  { storeName: '그린피', category: '골프' },
  { storeName: '카트대여', category: '골프' },
  { storeName: '대여품', category: '골프' },
  { storeName: '캐디피', category: '골프' },
  { storeName: '기타매출', category: '골프' },

  // 식음업장
  { storeName: '브리스킷346', category: '식음업장' },
  { storeName: '인육말가페', category: '식음업장' },
  { storeName: '빙엄테이블', category: '식음업장' },
  { storeName: '남도매답', category: '식음업장' },
  { storeName: '벼무새촌', category: '식음업장' },
  { storeName: '클럽하우스-레스토랑', category: '식음업장' },
  { storeName: '클럽하우스-스타트하우스', category: '식음업장' },
  { storeName: '쿠치나', category: '식음업장' },
  { storeName: '핏스탑', category: '식음업장' },
  { storeName: '딜라이트', category: '식음업장' },
  { storeName: '빙엄트릭', category: '식음업장' },

  // 연회
  { storeName: '연회장', category: '연회' },

  // 티켓업장
  { storeName: '마운틴카트', category: '티켓업장' },
  { storeName: '사계절썰매장', category: '티켓업장' },
  { storeName: '마리나 클럽', category: '티켓업장' },
  { storeName: '놀이동산(2025)', category: '티켓업장' },
  { storeName: '벨포레 목장', category: '티켓업장' },
  { storeName: '벨포레 목장(체험)', category: '티켓업장' },
  { storeName: '디노 시네마', category: '티켓업장' },
  { storeName: '모토아레나', category: '티켓업장' },
  { storeName: '미디어아트센터', category: '티켓업장' },
  { storeName: '미디어-뮤지엄카페', category: '티켓업장' },
  { storeName: '벨포레온', category: '티켓업장' },
  { storeName: '원더풀', category: '티켓업장' },
  { storeName: '벨포레 리조트', category: '티켓업장' },
  { storeName: '썸머랜드', category: '티켓업장' },
  { storeName: '핏포레', category: '티켓업장' },

  // 기타업장
  { storeName: '프로샵', category: '기타업장' },
  { storeName: '미디어-기프트샵', category: '기타업장' },
  { storeName: '벨포레 굿즈', category: '기타업장' },
  { storeName: '투썸플레이스', category: '기타업장' },
  { storeName: 'BHC(멕시카나)', category: '기타업장' },
  { storeName: 'CU편의점', category: '기타업장' },
  { storeName: '주차관제', category: '기타업장' },
];
