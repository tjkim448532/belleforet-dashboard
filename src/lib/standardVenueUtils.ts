export function standardizeGridRows(rawRows: any[]): any[] {
  // 🚨 [Pure Consumer] 강제 텍스트 주입(Local Mapping) 및 데이터 조작(Shadow IT) 전면 철거
  // 백엔드의 데이터를 건드리지 않고 100% 신뢰하여 반환합니다. 
  // 단, UI 병합(Rowspan)이 깨지지 않도록 모든 문자열의 좌우 공백을 제거하고(Trim), 카테고리 내에서 중분류(teamName) 기준으로 정렬(Sorting)만 1회 수행합니다.
  
  // 1. 공백 제거 (Trim) - 데이터의 숨은 공백으로 인한 정렬/Rowspan 깨짐 방지
  const sanitizedRows = rawRows.map(r => {
    return {
      ...r,
      teamName: typeof r.teamName === 'string' ? r.teamName.trim() : r.teamName,
      partName: typeof r.partName === 'string' ? r.partName.trim() : r.partName,
      categoryName: typeof r.categoryName === 'string' ? r.categoryName.trim() : r.categoryName,
      categoryCode: typeof r.categoryCode === 'string' ? r.categoryCode.trim().toUpperCase() : r.categoryCode
    };
  });

  const result: any[] = [];
  const categoryOrder = ['ROOM', 'GOLF', 'FNB', 'BANQUET', 'TICKET', 'MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED', 'OTHER', 'ETC', 'TOTAL'];
  
  const grandTotals = sanitizedRows.filter(r => r.isGrandTotal || r.shopName === '총계' || r.shopName === '합계');
  
  for (const catCode of categoryOrder) {
    if (catCode === 'TOTAL') continue;
    
    const itemsInCat = sanitizedRows.filter(r => (r.categoryCode || '').toUpperCase() === catCode && !r.isSubtotal && !r.isGrandTotal);
    const subtotal = sanitizedRows.find(r => (r.categoryCode || '').toUpperCase() === catCode && r.isSubtotal);
    
    if (itemsInCat.length === 0 && !subtotal) continue;
    
    // 중분류(teamName) -> 소분류(partName) 가나다순 정렬로 Rowspan이 완벽하게 하나로 묶이도록 프레젠테이션 정렬 수행
    itemsInCat.sort((a, b) => {
      const teamA = String(a.teamName || '');
      const teamB = String(b.teamName || '');
      if (teamA === teamB) {
        const partA = String(a.partName || '');
        const partB = String(b.partName || '');
        return partA.localeCompare(partB);
      }
      return teamA.localeCompare(teamB);
    });
    
    result.push(...itemsInCat);
    if (subtotal) {
      result.push(subtotal);
    }
  }
  
  const mappedCategories = new Set([...categoryOrder, 'TOTAL']);
  const unmappedItems = sanitizedRows.filter(r => !mappedCategories.has((r.categoryCode || '').toUpperCase()) && !r.isGrandTotal && !r.isSubtotal && r.shopName !== '총계' && r.shopName !== '합계');
  
  if (unmappedItems.length > 0) {
    // 미분류 데이터도 teamName 기준으로 묶어줌
    unmappedItems.sort((a, b) => {
      const catA = String(a.categoryCode || a.categoryName || '');
      const catB = String(b.categoryCode || b.categoryName || '');
      if (catA === catB) {
        const teamA = String(a.teamName || '');
        const teamB = String(b.teamName || '');
        return teamA.localeCompare(teamB);
      }
      return catA.localeCompare(catB);
    });
    result.push(...unmappedItems);
  }
  
  result.push(...grandTotals);
  return result;
}
