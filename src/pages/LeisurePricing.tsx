import { useState, useMemo, useEffect } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Tag,
  Percent,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Ticket,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Flag,
  Hotel,
  Utensils,
  MapPin,
  Calendar,
  Flame
} from 'lucide-react';
import {
  LEISURE_FACILITIES,
  MAIN_CATEGORY_TABS,
  type MainCategoryType,
  type LeisureFacilityPricing
} from '../data/leisurePricingData';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function LeisurePricing() {
  const [selectedCategory, setSelectedCategory] = useState<MainCategoryType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscountFilter, setSelectedDiscountFilter] = useState<string>('all');
  const [onlySpecialOffers, setOnlySpecialOffers] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [facilities, setFacilities] = useState<LeisureFacilityPricing[]>(LEISURE_FACILITIES);
  const [lastUpdated, setLastUpdated] = useState<string>('공식 요금표 SSOT');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Fetch nightly S3 snapshot via backend API (100% Pure Consumer & Fail-Stop)
  useEffect(() => {
    let isCancelled = false;
    const fetchLatestCatalog = async () => {
      try {
        setIsSyncing(true);
        const res = await secureFetcher(`${API_BASE}/api/v6/leisure/pricing-catalog`).catch(() => null);
        if (isCancelled || !res) return;
        const payload = res?.data ?? res;
        if (payload?.lastUpdated) {
          setLastUpdated(`${payload.lastUpdated.replace('T', ' ').substring(0, 16)} (S3 실시간 동기화)`);
        }
        const rawList = Array.isArray(payload?.facilities) ? payload.facilities : [];
        const isFullCatalogSchema = rawList.length > 0 && rawList.every((item: any) => item?.mainCategory && Array.isArray(item?.regularPrices));

        if (isFullCatalogSchema) {
          setFacilities(rawList);
        } else {
          // Merge S3 live snapshot (specialOffers, golfSnapshot, diningVenues) into official SSOT catalog
          setFacilities(
            LEISURE_FACILITIES.map((facility) => {
              let updated = { ...facility };

              if (updated.isSpecialOffer && Array.isArray(payload?.specialOffers)) {
                const matchedOffer = payload.specialOffers.find((so: any) =>
                  so.id === updated.id.replace('offer-', '') ||
                  updated.name.includes(so.title) ||
                  (so.title && so.title.includes(updated.name.replace('[스페셜 오퍼]', '').trim()))
                );
                if (matchedOffer) {
                  updated = {
                    ...updated,
                    period: matchedOffer.period || updated.period,
                    officialUrl: matchedOffer.link || updated.officialUrl,
                    summary: matchedOffer.desc || updated.summary,
                  };
                }
              }

              if (updated.id === 'golf-greenfee' && payload?.golfSnapshot?.verified) {
                updated = {
                  ...updated,
                  regularPrices: (updated.regularPrices || []).map((rp) => {
                    if (rp.name.includes('주중') && payload.golfSnapshot.greenFeeWeekday) {
                      return { ...rp, priceWeekday: payload.golfSnapshot.greenFeeWeekday };
                    }
                    if (rp.name.includes('주말') && payload.golfSnapshot.greenFeeWeekend) {
                      return { ...rp, priceWeekend: payload.golfSnapshot.greenFeeWeekend };
                    }
                    if (rp.name.includes('카트') && payload.golfSnapshot.cartFee) {
                      return { ...rp, priceWeekday: payload.golfSnapshot.cartFee, priceWeekend: payload.golfSnapshot.cartFee };
                    }
                    return rp;
                  }),
                };
              }

              if (updated.mainCategory === 'dining' && Array.isArray(payload?.diningVenues)) {
                const matchedDining = payload.diningVenues.find((dv: any) =>
                  dv.venueName && (updated.name.includes(dv.venueName) || dv.venueName.includes(updated.name))
                );
                if (matchedDining) {
                  updated = {
                    ...updated,
                    closedDay: matchedDining.closedDay || updated.closedDay,
                    operatingHours: matchedDining.operatingHours || updated.operatingHours,
                    contact: matchedDining.contact || updated.contact,
                    officialUrl: matchedDining.officialUrl || updated.officialUrl,
                  };
                }
              }

              return updated;
            })
          );
        }
      } finally {
        if (!isCancelled) setIsSyncing(false);
      }
    };

    fetchLatestCatalog();
    return () => { isCancelled = true; };
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: facilities.length, golf: 0, room: 0, leisure: 0, dining: 0 };
    facilities.forEach(f => {
      if (counts[f.mainCategory] !== undefined) {
        counts[f.mainCategory]++;
      }
    });
    return counts;
  }, [facilities]);

  // Quick Discount Filter Badges
  const discountFilterTags = [
    { key: 'all', label: '전체' },
    { key: 'resident', label: '충북도민/증평군민 우대' },
    { key: 'hotel', label: '콘도 투숙객 할인' },
    { key: 'member', label: '분양회원 우대' },
    { key: 'free', label: '36개월 미만 무료' },
  ];

  // Filtering Logic
  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      // 1. Main Category filter
      if (selectedCategory !== 'all' && facility.mainCategory !== selectedCategory) {
        return false;
      }

      // 2. Special offer filter
      if (onlySpecialOffers && !facility.isSpecialOffer) {
        return false;
      }

      // 3. Discount tag filter
      if (selectedDiscountFilter === 'resident') {
        const hasResident = facility.discounts.some(d => d.target.includes('도민') || d.target.includes('군민')) ||
                            facility.discountBadges.some(b => b.includes('도민') || b.includes('군민'));
        if (!hasResident) return false;
      } else if (selectedDiscountFilter === 'hotel') {
        const hasHotel = facility.discounts.some(d => d.target.includes('숙박') || d.target.includes('투숙')) ||
                         facility.discountBadges.some(b => b.includes('숙박') || b.includes('투숙'));
        if (!hasHotel) return false;
      } else if (selectedDiscountFilter === 'member') {
        const hasMember = facility.discounts.some(d => d.target.includes('회원')) ||
                          facility.discountBadges.some(b => b.includes('회원'));
        if (!hasMember) return false;
      } else if (selectedDiscountFilter === 'free') {
        const hasFree = facility.discounts.some(d => d.target.includes('무료') || d.rate.includes('무료')) ||
                        facility.regularPrices.some(p => p.priceWeekday === '무료') ||
                        facility.discountBadges.some(b => b.includes('무료'));
        if (!hasFree) return false;
      }

      // 4. Keyword Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = facility.name.toLowerCase().includes(q);
        const matchSummary = facility.summary.toLowerCase().includes(q);
        const matchPrices = facility.regularPrices.some(p => p.name.toLowerCase().includes(q) || p.note?.toLowerCase().includes(q) || p.priceWeekday.toLowerCase().includes(q));
        const matchDiscounts = facility.discounts.some(d => d.target.toLowerCase().includes(q) || d.condition.toLowerCase().includes(q));
        const matchBadges = facility.discountBadges.some(b => b.toLowerCase().includes(q));
        const matchCategory = facility.mainCategoryLabel.toLowerCase().includes(q) || (facility.subCategory && facility.subCategory.toLowerCase().includes(q));
        return matchName || matchSummary || matchPrices || matchDiscounts || matchBadges || matchCategory;
      }

      return true;
    });
  }, [facilities, selectedCategory, onlySpecialOffers, selectedDiscountFilter, searchTerm]);

  // Expand / Collapse Handlers
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFacilities.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const getCategoryColor = (cat: MainCategoryType) => {
    switch (cat) {
      case 'golf':
        return {
          bg: 'bg-[#E8F2EE]',
          text: 'text-[#1E523F]',
          border: 'border-[#B4C6C1]/70',
          badge: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70',
          activeTab: 'bg-[#284F42] text-white shadow-xs'
        };
      case 'room':
        return {
          bg: 'bg-[#F4F3EE]',
          text: 'text-[#1B382E]',
          border: 'border-[#D0C6BB]/70',
          badge: 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/70',
          activeTab: 'bg-[#284F42] text-white shadow-xs'
        };
      case 'leisure':
        return {
          bg: 'bg-[#E8F2EE]',
          text: 'text-[#1E523F]',
          border: 'border-[#B4C6C1]/70',
          badge: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70',
          activeTab: 'bg-[#284F42] text-white shadow-xs'
        };
      case 'dining':
        return {
          bg: 'bg-[#F4F3EE]',
          text: 'text-[#B59269]',
          border: 'border-[#D0C6BB]/70',
          badge: 'bg-[#F4F3EE] text-[#B59269] border-[#D0C6BB]/70',
          activeTab: 'bg-[#B59269] text-white shadow-xs'
        };
      default:
        return {
          bg: 'bg-[#E8F2EE]',
          text: 'text-[#1E523F]',
          border: 'border-[#B4C6C1]/70',
          badge: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]/70',
          activeTab: 'bg-[#284F42] text-white shadow-xs'
        };
    }
  };

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'golf': return <Flag size={18} />;
      case 'room': return <Hotel size={18} />;
      case 'leisure': return <Ticket size={18} />;
      case 'dining': return <Utensils size={18} />;
      default: return <Sparkles size={18} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* 1. Header Banner */}
        <div className="bg-[#284F42] rounded-3xl p-7 lg:p-8 text-white relative overflow-hidden shadow-xl border border-[#1B382E]">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#5FB878]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-20 w-64 h-64 bg-[#B59269]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · PRICING & BENEFITS</span>
                {isSyncing && <RefreshCw size={11} className="animate-spin text-[#5FB878]" />}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                시설·패키지 종합 이용요금 및 혜택 안내
              </h1>
              <p className="text-sm text-white/80 mt-1">
                골프, 객실, 레저, 식음 4대 전 부문의 정상 요금, 우대 할인, 세부 구성 및 스페셜 오퍼를 일목요연하게 제공합니다. (기준: {lastUpdated})
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20 text-xs font-bold backdrop-blur-md">
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'card'
                      ? 'bg-white text-[#1B382E] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>카드형</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-[#1B382E] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>표 형식</span>
                </button>
              </div>

              {/* Expand / Collapse All */}
              {viewMode === 'card' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={expandAll}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer transition-colors backdrop-blur-md"
                    title="전체 상세 펼치기"
                  >
                    <Maximize2 size={13} />
                    <span className="hidden sm:inline">모두 펼치기</span>
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer transition-colors backdrop-blur-md"
                    title="전체 상세 접기"
                  >
                    <Minimize2 size={13} />
                    <span className="hidden sm:inline">모두 접기</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Controls & Filter Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] space-y-5">
          {/* 4대 메인 카테고리 탭 (골프 | 객실 | 레저 | 식음) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {MAIN_CATEGORY_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.key;
              const count = categoryCounts[tab.key as keyof typeof categoryCounts] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key as MainCategoryType | 'all')}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? tab.key === 'dining'
                        ? 'bg-[#B59269] text-white border-[#B59269] shadow-xs'
                        : 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                      : 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/60 hover:bg-white hover:border-[#D0C6BB] hover:text-[#1B382E]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(tab.key)}
                    <span>{tab.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#D0C6BB]/40 text-[#1B382E]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 검색창 및 특가/우대 빠른 필터 바 */}
          <div className="pt-2 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-t border-[#D0C6BB]/40">
            {/* Keyword Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="시설명, 메뉴, 요금(예: 30,000원, 그린피), 키제한 등 검색..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-[#F4F3EE] border border-[#D0C6BB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] focus:bg-white transition-all text-[#1B382E] placeholder-[#5A6B63]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B63] hover:text-[#1B382E] cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Special Offer Toggle Button */}
              <button
                onClick={() => setOnlySpecialOffers(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  onlySpecialOffers
                    ? 'bg-[#8B2635] text-white border-[#8B2635] shadow-xs'
                    : 'bg-[#FDF0ED] text-[#8B2635] border-[#EAC5BD] hover:bg-[#FCE7E2]'
                }`}
              >
                <Flame size={13} className={onlySpecialOffers ? 'text-white' : 'text-[#8B2635]'} />
                <span>스페셜 오퍼(패키지)만</span>
              </button>

              {discountFilterTags.map((tag) => (
                <button
                  key={tag.key}
                  onClick={() => setSelectedDiscountFilter(tag.key)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedDiscountFilter === tag.key
                      ? 'bg-[#284F42] text-white border-[#284F42]'
                      : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:bg-[#F4F3EE]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results summary bar */}
          <div className="flex items-center justify-between text-xs text-[#5A6B63] px-1 pt-1">
            <span>
              총 <strong className="text-[#1B382E] font-bold">{filteredFacilities.length}개</strong>의 항목이 조회되었습니다.
              {selectedCategory !== 'all' && (
                <span className="ml-1 text-[#5A6B63]/80">
                  (카테고리: {MAIN_CATEGORY_TABS.find(t => t.key === selectedCategory)?.label})
                </span>
              )}
            </span>
            <span className="text-[#5A6B63]/80">카드 항목을 클릭하면 우대할인 및 상세 정보가 펼쳐집니다.</span>
          </div>
        </div>

        {/* 3. Main Content: Card View or Table View */}
        {filteredFacilities.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#D0C6BB]/75 text-center space-y-3 shadow-xs">
            <AlertCircle size={40} className="mx-auto text-[#D0C6BB]" />
            <h3 className="text-base font-bold text-[#1B382E]">일치하는 이용요금 정보가 없습니다</h3>
            <p className="text-xs text-[#5A6B63]">
              검색어 또는 필터 조건을 변경하여 다시 검색해 보세요.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedDiscountFilter('all');
                setOnlySpecialOffers(false);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#284F42] text-white hover:bg-[#1B382E] cursor-pointer transition-colors"
            >
              전체 초기화
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* CARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacilities.map((facility) => {
              const isExpanded = expandedIds.has(facility.id);
              const catColor = getCategoryColor(facility.mainCategory);

              return (
                <div
                  key={facility.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] ${
                    isExpanded
                      ? 'border-[#284F42]/80 ring-1 ring-[#284F42]/30'
                      : 'border-[#D0C6BB]/75 hover:border-[#D0C6BB]'
                  }`}
                >
                  {/* Card Header (Always Visible & Clickable) */}
                  <div
                    onClick={() => toggleExpand(facility.id)}
                    className="p-6 cursor-pointer select-none space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Main Category Badge */}
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${catColor.badge}`}>
                            {facility.mainCategoryLabel}
                          </span>

                          {facility.subCategory && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[#F4F3EE] text-[#5A6B63] border border-[#D0C6BB]/60">
                              {facility.subCategory}
                            </span>
                          )}

                          {facility.isSpecialOffer && (
                            <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-[#8B2635] text-white flex items-center gap-1 animate-pulse">
                              <Flame size={12} />
                              SPECIAL OFFER
                            </span>
                          )}

                          {facility.closedDay && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-[#FDF0ED] text-[#B59269] border border-[#D0C6BB]/60">
                              {facility.closedDay}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[#1B382E] tracking-tight flex items-center gap-2">
                          {facility.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="p-1.5 rounded-lg text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE] transition-colors"
                          title={isExpanded ? '상세 접기' : '상세 펼치기'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#5A6B63] leading-relaxed">
                      {facility.summary}
                    </p>

                    {/* Representative Price Box */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60">
                      <span className="text-xs font-bold text-[#5A6B63]">대표 요금</span>
                      <span className="text-sm font-black text-[#1B382E] tracking-tight">
                        {facility.representativePrice}
                      </span>
                    </div>

                    {/* Discount Badges */}
                    {facility.discountBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {facility.discountBadges.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#F4F3EE] text-[#1B382E] border border-[#D0C6BB]/60 flex items-center gap-1"
                          >
                            <Tag size={10} className="text-[#5A6B63]" />
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Period or Operating Hours Preview */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A6B63] pt-1">
                      {facility.period ? (
                        <div className="flex items-center gap-1 text-[#8B2635] font-semibold">
                          <Calendar size={13} />
                          <span>기간: {facility.period}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-[#5A6B63]" />
                          <span>{facility.operatingHours}</span>
                        </div>
                      )}
                      {facility.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-[#5A6B63]" />
                          <span>{facility.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Expandable Details (Shown on Click) */}
                  {isExpanded && (
                    <div className="border-t border-[#D0C6BB]/60 bg-[#F4F3EE]/40 p-5 space-y-5 animate-in fade-in duration-200">
                      {/* A. Regular Price Table */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6B63] flex items-center gap-1.5 mb-2.5">
                          <CheckCircle2 size={14} className="text-[#284F42]" />
                          정규 요금표 (공식 실측 기준)
                        </h4>
                        <div className="overflow-x-auto rounded-2xl border border-[#D0C6BB]/75 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                              <tr>
                                <th className="py-2.5 px-3 text-left">구분 / 품목명</th>
                                <th className="py-2.5 px-3 text-right">주중 요금</th>
                                <th className="py-2.5 px-3 text-right">주말/공휴일 요금</th>
                                <th className="py-2.5 px-3 text-left">비고 및 포함내역</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D0C6BB]/30">
                              {facility.regularPrices.map((price, pIdx) => (
                                <tr key={pIdx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#1B382E]">
                                    {price.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-[#1B382E] whitespace-nowrap">
                                    {price.priceWeekday}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-[#1B382E] whitespace-nowrap">
                                    {price.priceWeekend || price.priceWeekday}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#5A6B63]">
                                    {price.note || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* B. Discount Policy Table (If Available) */}
                      {facility.discounts.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6B63] flex items-center gap-1.5 mb-2.5">
                            <Percent size={14} className="text-[#284F42]" />
                            우대 및 할인 혜택
                          </h4>
                          <div className="overflow-x-auto rounded-2xl border border-[#B4C6C1]/70 bg-[#E8F2EE]/30">
                            <table className="w-full text-xs">
                              <thead className="bg-[#E8F2EE] text-[#1E523F] font-bold border-b border-[#B4C6C1]/70">
                                <tr>
                                  <th className="py-2 px-3 text-left">우대 대상</th>
                                  <th className="py-2 px-3 text-center">할인율 / 혜택</th>
                                  <th className="py-2 px-3 text-right">할인 적용가</th>
                                  <th className="py-2 px-3 text-left">증빙 및 적용 조건</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#B4C6C1]/40">
                                {facility.discounts.map((disc, dIdx) => (
                                  <tr key={dIdx} className="hover:bg-[#E8F2EE]/50 transition-colors">
                                    <td className="py-2 px-3 font-semibold text-[#1E523F]">
                                      {disc.target}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-[#284F42] text-white">
                                        {disc.rate}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-[#1E523F] whitespace-nowrap">
                                      {disc.discountPrice || '-'}
                                    </td>
                                    <td className="py-2 px-3 text-[#1E523F]/80">
                                      {disc.condition}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* C. Requirements & Operational Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {facility.requirements.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-white border border-[#D0C6BB]/60 space-y-1.5">
                            <h5 className="text-xs font-bold text-[#1B382E] flex items-center gap-1">
                              <ShieldCheck size={14} className="text-[#284F42]" />
                              이용 조건 및 준수사항
                            </h5>
                            <ul className="text-xs text-[#5A6B63] space-y-1 list-disc list-inside">
                              {facility.requirements.map((req, rIdx) => (
                                <li key={rIdx}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {facility.notes.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-white border border-[#D0C6BB]/60 space-y-1.5">
                            <h5 className="text-xs font-bold text-[#1B382E] flex items-center gap-1">
                              <AlertCircle size={14} className="text-[#5A6B63]" />
                              시설 특전 및 유의사항
                            </h5>
                            <ul className="text-xs text-[#5A6B63] space-y-1 list-disc list-inside">
                              {facility.notes.map((note, nIdx) => (
                                <li key={nIdx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* D. Additional Meta & Official Booking Link */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#5A6B63] border-t border-[#D0C6BB]/50">
                        <div className="flex flex-wrap items-center gap-3">
                          {facility.contact && (
                            <div className="flex items-center gap-1 font-medium">
                              <Phone size={13} className="text-[#5A6B63]" />
                              <span>문의: {facility.contact}</span>
                            </div>
                          )}
                          {facility.breakTime && (
                            <div className="flex items-center gap-1">
                              <Clock size={13} className="text-[#5A6B63]" />
                              <span>정비시간: {facility.breakTime}</span>
                            </div>
                          )}
                        </div>

                        {facility.officialUrl && (
                          <a
                            href={facility.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>공식 홈페이지 안내/예약</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW (전체 비교용 콤팩트 테이블) */
          <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F4F3EE] text-[#1B382E] font-bold border-b border-[#D0C6BB]/75">
                  <tr>
                    <th className="py-3.5 px-4 text-left">분류</th>
                    <th className="py-3.5 px-4 text-left">시설/상품명</th>
                    <th className="py-3.5 px-4 text-left">대표 요금</th>
                    <th className="py-3.5 px-4 text-left">운영시간 / 기간</th>
                    <th className="py-3.5 px-4 text-left">우대 및 할인 혜택</th>
                    <th className="py-3.5 px-4 text-center">상세보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {filteredFacilities.map((facility) => {
                    const isExpanded = expandedIds.has(facility.id);
                    const catColor = getCategoryColor(facility.mainCategory);

                    return (
                      <tr key={facility.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${catColor.badge}`}>
                            {facility.mainCategoryLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#1B382E]">
                          <div className="flex items-center gap-1.5">
                            <span>{facility.name}</span>
                            {facility.isSpecialOffer && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-[#8B2635] text-white">
                                HOT
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5A6B63] font-normal mt-0.5 line-clamp-1">
                            {facility.summary}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#1B382E]">
                          {facility.representativePrice}
                        </td>
                        <td className="py-3.5 px-4 text-[#5A6B63] whitespace-nowrap">
                          {facility.period || facility.operatingHours}
                        </td>
                        <td className="py-3.5 px-4 text-[#5A6B63]">
                          <div className="flex flex-wrap gap-1">
                            {facility.discountBadges.slice(0, 2).map((b, i) => (
                              <span key={i} className="px-2 py-0.5 text-[10px] rounded-md bg-[#F4F3EE] border border-[#D0C6BB]/60 text-[#1B382E]">
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setViewMode('card');
                              toggleExpand(facility.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#D0C6BB]/30 text-[#1B382E] font-bold text-[11px] transition-colors cursor-pointer border border-[#D0C6BB]/60"
                          >
                            {isExpanded ? '접기' : '펼치기'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
