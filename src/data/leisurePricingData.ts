export type MainCategoryType = 'golf' | 'room' | 'leisure' | 'dining';

export interface RegularPriceItem {
  name: string;
  target?: string;
  priceWeekday: string;
  priceWeekend?: string;
  note?: string;
}

export interface DiscountPolicy {
  target: string;
  rate: string;
  discountPrice?: string;
  condition: string;
}

export interface LeisureFacilityPricing {
  id: string;
  name: string;
  mainCategory: MainCategoryType;
  mainCategoryLabel: '골프' | '객실' | '레져' | '식음';
  subCategory?: string;
  summary: string;
  representativePrice: string;
  operatingHours: string;
  breakTime?: string;
  closedDay?: string;
  location?: string;
  contact?: string;
  ageRequirement?: string;
  discountBadges: string[];
  regularPrices: RegularPriceItem[];
  discounts: DiscountPolicy[];
  requirements: string[];
  notes: string[];
  cancellationPolicy?: string;
  officialUrl?: string;
  period?: string;
  isSpecialOffer?: boolean;
}

export const MAIN_CATEGORY_TABS = [
  { key: 'all', label: '전체 통합', icon: 'Sparkles' },
  { key: 'golf', label: '골프', icon: 'Flag' },
  { key: 'room', label: '객실', icon: 'Hotel' },
  { key: 'leisure', label: '레져', icon: 'Ticket' },
  { key: 'dining', label: '식음', icon: 'Utensils' },
] as const;

// 프론트엔드 로컬 하드코딩 요금표 0건 (100% 백엔드 /api/v6/leisure/pricing-catalog 응답만 바인딩)
export const LEISURE_FACILITIES: LeisureFacilityPricing[] = [];
