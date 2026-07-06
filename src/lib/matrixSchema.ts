export const EXCEL_LAYOUT = [
  {
    category: '객실 Total',
    shops: [
      'ROOM',
      'ROOM OTHER',
      '미지정'
    ]
  },
  {
    category: '골프 Total',
    shops: [
      '그린피',
      '카트대여',
      '대여품',
      '캐디피',
      '기타매출'
    ]
  },
  {
    category: '식음업장 Total',
    shops: [
      '브리스킷346',
      '얼룩말카페',
      '밤밤테이블',
      '남도예담',
      '벼루재촌',
      '클럽하우스-레스토랑',
      '클럽하우스-스타트하우스',
      '쿠치나',
      '핏스탑',
      '딜라이트',
      '밤밤트럭',
      '썸머랜드 푸드트럭',
      '기획전',
      '썸머트럭(현장)'
    ]
  },
  {
    category: '연회 Total',
    shops: [
      '연회장'
    ]
  },
  {
    category: '티켓업장 Total',
    shops: [
      '마운틴카트',
      '사계절썰매장',
      '마리나 클럽',
      '놀이동산(2025)',
      '벨포레 목장',
      '벨포레 목장(체험)',
      '디노 시네마',
      '모토아레나',
      '미디어아트센터',
      '미디어-뮤지엄카페',
      '벨포레홀',
      '원더풀',
      '벨포레 리조트',
      '썸머랜드',
      '펫포레',
      '기타티켓',
      '온라인티켓'
    ]
  },
  {
    category: '기타업장 Total',
    shops: [
      '프로샵',
      '미디어-기프트샵',
      '벨포레 굿즈',
      '투썸플레이스',
      'BHC(멕시카나)',
      'CU편의점',
      '주차관제'
    ]
  }
];

export const normalizeName = (name: string): string => {
  if (!name) return '';
  return String(name).replace(/\s+/g, '').toLowerCase();
};

export const findExcelShopName = (rawName: string): { category: string, shopName: string } | null => {
  if (!rawName) return null;
  const nName = normalizeName(rawName);

  // Special cases mappings
  if (nName.includes('객실기타') || nName.includes('룸기타')) return { category: '객실 Total', shopName: 'ROOM OTHER' };
  if (nName.includes('평') || nName.includes('펫룸') || nName.includes('객실') || (nName.includes('룸') && !nName.includes('기타'))) return { category: '객실 Total', shopName: 'ROOM' };
  
  if (nName.includes('목장') && !nName.includes('체험')) return { category: '티켓업장 Total', shopName: '벨포레 목장' };
  if (nName.includes('목장체험') || nName.includes('체험')) return { category: '티켓업장 Total', shopName: '벨포레 목장(체험)' };
  
  if (nName.includes('미디어') && !nName.includes('기프트') && !nName.includes('카페')) return { category: '티켓업장 Total', shopName: '미디어아트센터' };
  
  if (nName.includes('투썸')) return { category: '기타업장 Total', shopName: '투썸플레이스' };
  if (nName.includes('멕시카나') || nName.includes('bhc')) return { category: '기타업장 Total', shopName: 'BHC(멕시카나)' };
  if (nName.includes('cu') || nName.includes('편의점')) return { category: '기타업장 Total', shopName: 'CU편의점' };

  for (const group of EXCEL_LAYOUT) {
    for (const excelName of group.shops) {
      const eName = normalizeName(excelName);
      if (nName.includes(eName) || eName.includes(nName)) {
        return { category: group.category, shopName: excelName };
      }
    }
  }

  return null;
};
