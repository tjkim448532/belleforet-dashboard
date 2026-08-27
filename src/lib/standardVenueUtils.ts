/**
 * 벨포레 공식 38개 표준 영업장 매핑 및 롤업 유틸리티 (SSOT Standardizer)
 * - 패키지 분해 세부 항목(조식, 와인, 파전, 막걸리 등)을 모영업장(쿠치나, 남도예담 등)으로 롤업
 * - 오매핑(식음 하위 골프 등) 및 0원 레거시 잔여 행 정제
 * - 소계/총계는 백엔드 SSOT 값 100% 보존
 */

export interface StandardVenueMeta {
  standardShop: string;
  categoryCode: string;
  categoryName: string;
  teamName: string;
  partName: string;
}

export function resolveStandardVenue(rawShopName: string, rawCatCode?: string): StandardVenueMeta | null {
  const name = (rawShopName || '').trim();
  const cat = (rawCatCode || '').toUpperCase();

  // 1. 오매핑 항목 제거 (식음 부문 내 골프 등)
  if (cat === 'FNB' && name === '골프') return null;

  // 2. FNB (식음) 표준 영업장 롤업
  if (name.includes('남도예담')) {
    return { standardShop: '남도예담', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('조식') || name.includes('와인') || name.includes('디저트') || name.includes('쿠치나')) {
    return { standardShop: '쿠치나', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('브리스킷')) {
    return { standardShop: '브리스킷346', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('밤밤테이블')) {
    return { standardShop: '밤밤테이블', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('밤밤트럭')) {
    return { standardShop: '밤밤트럭', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('투썸')) {
    return { standardShop: '투썸플레이스', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('BHC') || name.includes('멕시카나')) {
    return { standardShop: 'BHC(멕시카나)', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('CU')) {
    return { standardShop: 'CU편의점', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }
  if (name.includes('스타트하우스')) {
    return { standardShop: '클럽-스타트하우스', categoryCode: 'FNB', categoryName: '식음', teamName: '식음영업팀', partName: '골프' };
  }
  if (name.includes('레스토랑') || name.includes('클럽-식당')) {
    return { standardShop: '클럽-레스토랑', categoryCode: 'FNB', categoryName: '식음', teamName: '식음영업팀', partName: '골프' };
  }
  if (name.includes('딜라이트')) {
    return { standardShop: '딜라이트', categoryCode: 'FNB', categoryName: '식음', teamName: '콘텐츠기획본부', partName: '식음' };
  }

  // 3. TICKET (레저본부) 표준 영업장 롤업
  if (name.includes('얼룩말카페')) {
    return { standardShop: '얼룩말카페', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저운영팀', partName: '목장' };
  }
  if (name.includes('마운틴카트') || name.includes('루지')) {
    return { standardShop: '마운틴카트', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '액티비티' };
  }
  if (name.includes('사계절썰매') || name.includes('썰매')) {
    return { standardShop: '사계절썰매장', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '액티비티' };
  }
  if (name.includes('목장')) {
    return { standardShop: name.includes('체험') ? '벨포레 목장(체험)' : '벨포레 목장', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '목장' };
  }
  if (name.includes('미디어아트')) {
    return { standardShop: '미디어아트센터', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '미디어아트센터' };
  }
  if (name.includes('기프트샵')) {
    return { standardShop: '미디어-기프트샵', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저운영팀', partName: '미디어아트센터' };
  }
  if (name.includes('뮤지엄카페')) {
    return { standardShop: '미디어-뮤지엄카페', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '미디어아트센터' };
  }
  if (name.includes('놀이동산')) {
    return { standardShop: '놀이동산', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저운영팀', partName: '놀이동산' };
  }
  if (name.includes('마리나')) {
    return { standardShop: '마리나 클럽', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '액티비티' };
  }
  if (name.includes('원더풀')) {
    return { standardShop: '원더풀', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '액티비티' };
  }
  if (name.includes('썸머랜드')) {
    return { standardShop: '썸머랜드', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '액티비티' };
  }
  if (name.includes('시네마')) {
    return { standardShop: '디노 시네마', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '미디어아트센터' };
  }
  if (name.includes('펫포레')) {
    return { standardShop: '펫포레', categoryCode: 'TICKET', categoryName: '레저본부', teamName: '레저본부', partName: '목장' };
  }
  if (name.includes('UNMAPPED_TICKET')) {
    return null; // drop phantom ticket token
  }

  // 4. MOTO (모토아레나)
  if (name.includes('핏스탑')) {
    return { standardShop: '핏스탑', categoryCode: 'MOTO', categoryName: '모토아레나', teamName: '모토팀', partName: '모토아레나' };
  }
  if (name.includes('모토아레나') || name.includes('카트')) {
    return { standardShop: '모토아레나', categoryCode: 'MOTO', categoryName: '모토아레나', teamName: '모토팀', partName: '모토아레나' };
  }

  // 5. BANQUET (대관)
  if (name.includes('벨포레홀')) {
    return { standardShop: '벨포레홀', categoryCode: 'BANQUET', categoryName: '대관', teamName: '세일즈본부', partName: '세일즈' };
  }
  if (name.includes('대관')) {
    return { standardShop: '대관', categoryCode: 'BANQUET', categoryName: '대관', teamName: '세일즈본부', partName: '세일즈' };
  }

  // 6. GOLF & ROOM
  if (name.includes('골프')) {
    return { standardShop: '골프', categoryCode: 'GOLF', categoryName: '골프', teamName: '골프사업본부', partName: '골프' };
  }
  if (name.includes('객실') || name.includes('콘도')) {
    return { standardShop: '객실', categoryCode: 'ROOM', categoryName: '콘도', teamName: '리조트사업본부', partName: '객실운영' };
  }

  // 7. OTHER / GOODS / PARKING / PROMOTION
  if (name.includes('프로샵')) {
    return { standardShop: '프로샵', categoryCode: 'OTHER', categoryName: '기타', teamName: '골프영업팀', partName: '골프' };
  }
  if (name.includes('주차')) {
    return { standardShop: '주차관제', categoryCode: 'PARKING', categoryName: '주차관제', teamName: '주차관제', partName: '주차관제' };
  }
  if (name.includes('굿즈')) {
    return { standardShop: '벨포레굿즈', categoryCode: 'GOODS', categoryName: '벨포레굿즈', teamName: '리조트운영팀', partName: '미디어아트센터' };
  }
  if (name.includes('기획전')) {
    return { standardShop: '기획전', categoryCode: 'PROMOTION', categoryName: '기획전', teamName: '콘텐츠기획본부', partName: '기획전' };
  }

  return {
    standardShop: name,
    categoryCode: cat || 'ETC',
    categoryName: cat === 'FNB' ? '식음' : cat === 'TICKET' ? '레저본부' : '기타',
    teamName: '기타',
    partName: '미분류'
  };
}

/**
 * Standardizes raw grid data by rolling up package splits into parent standard facilities
 */
export function standardizeGridRows<T extends {
  categoryCode?: string;
  categoryName?: string;
  teamName?: string;
  partName?: string;
  shopName?: string;
  facilityName?: string;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  todayActual?: number | string;
  todayLy?: number | string;
  mtdActual?: number | string;
  mtdLy?: number | string;
  ytdActual?: number | string;
  ytdLy?: number | string;
}>(rawRows: T[]): T[] {
  const result: T[] = [];
  const venueMap = new Map<string, T>();
  const categoryOrder = ['ROOM', 'GOLF', 'FNB', 'BANQUET', 'TICKET', 'MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'OTHER', 'ETC'];

  // 1. Group individual facility rows by standard venue
  const subtotalMap = new Map<string, T>();
  let grandTotalRow: T | null = null;

  for (const row of rawRows) {
    if (row.isGrandTotal || row.shopName === '총계' || row.shopName === '합계') {
      grandTotalRow = row;
      continue;
    }
    if (row.isSubtotal) {
      const cat = (row.categoryCode || '').toUpperCase();
      subtotalMap.set(cat, row);
      continue;
    }

    const rawName = row.shopName || row.facilityName || '';
    const std = resolveStandardVenue(rawName, row.categoryCode);
    if (!std) continue; // Drop invalid / misclassified phantom row

    const key = `${std.categoryCode}_${std.standardShop}`;
    const todayA = Number(String(row.todayActual || 0).replace(/,/g, ''));
    const todayL = Number(String(row.todayLy || 0).replace(/,/g, ''));
    const mtdA = Number(String(row.mtdActual || 0).replace(/,/g, ''));
    const mtdL = Number(String(row.mtdLy || 0).replace(/,/g, ''));
    const ytdA = Number(String(row.ytdActual || 0).replace(/,/g, ''));
    const ytdL = Number(String(row.ytdLy || 0).replace(/,/g, ''));

    if (venueMap.has(key)) {
      const existing = venueMap.get(key)!;
      const exTodayA = Number(String(existing.todayActual || 0).replace(/,/g, ''));
      const exTodayL = Number(String(existing.todayLy || 0).replace(/,/g, ''));
      const exMtdA = Number(String(existing.mtdActual || 0).replace(/,/g, ''));
      const exMtdL = Number(String(existing.mtdLy || 0).replace(/,/g, ''));
      const exYtdA = Number(String(existing.ytdActual || 0).replace(/,/g, ''));
      const exYtdL = Number(String(existing.ytdLy || 0).replace(/,/g, ''));

      existing.todayActual = exTodayA + todayA;
      existing.todayLy = exTodayL + todayL;
      existing.mtdActual = exMtdA + mtdA;
      existing.mtdLy = exMtdL + mtdL;
      existing.ytdActual = exYtdA + ytdA;
      existing.ytdLy = exYtdL + ytdL;
    } else {
      const newRow = {
        ...row,
        categoryCode: std.categoryCode,
        categoryName: std.categoryName,
        teamName: std.teamName,
        partName: std.partName,
        shopName: std.standardShop,
        facilityName: std.standardShop,
        todayActual: todayA,
        todayLy: todayL,
        mtdActual: mtdA,
        mtdLy: mtdL,
        ytdActual: ytdA,
        ytdLy: ytdL
      } as T;
      venueMap.set(key, newRow);
    }
  }

  // 2. Re-assemble in official Bible sort order: Category -> Items -> Category Subtotal
  for (const catCode of categoryOrder) {
    const itemsInCat = Array.from(venueMap.values()).filter(v => v.categoryCode === catCode);
    if (itemsInCat.length === 0 && !subtotalMap.has(catCode)) continue;

    // Filter out rows that are entirely 0 across all dimensions (e.g. inactive seasonal lines)
    const activeItems = itemsInCat.filter(it => {
      const tA = Number(it.todayActual || 0);
      const tL = Number(it.todayLy || 0);
      const mA = Number(it.mtdActual || 0);
      const mL = Number(it.mtdLy || 0);
      const yA = Number(it.ytdActual || 0);
      const yL = Number(it.ytdLy || 0);
      return tA !== 0 || tL !== 0 || mA !== 0 || mL !== 0 || yA !== 0 || yL !== 0;
    });

    result.push(...activeItems);

    // Append Category Subtotal from backend SSOT
    if (subtotalMap.has(catCode)) {
      result.push(subtotalMap.get(catCode)!);
    }
  }

  // 3. Append Grand Total
  if (grandTotalRow) {
    result.push(grandTotalRow);
  }

  return result;
}
