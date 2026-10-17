import { useState, useMemo } from 'react';
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
  Sparkles,
  Zap,
  Heart,
  Smile,
  Palette,
  Waves,
  PackageCheck,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Ticket,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  LEISURE_FACILITIES,
  LEISURE_CATEGORIES
} from '../data/leisurePricingData';

export default function LeisurePricing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDiscountFilter, setSelectedDiscountFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Fast Discount Filter Badges
  const discountFilterTags = [
    { key: 'all', label: '전체 보기' },
    { key: 'resident', label: '충북도민/증평군민 우대' },
    { key: 'hotel', label: '콘도 숙박객 할인' },
    { key: 'member', label: '분양회원(레드/화이트/그린) 우대' },
    { key: 'military', label: '군인/유공자 우대' },
    { key: 'free', label: '영유아 무료' },
  ];

  // Filtering Logic
  const filteredFacilities = useMemo(() => {
    return LEISURE_FACILITIES.filter((facility) => {
      // Category filter
      if (selectedCategory !== 'all' && facility.category !== selectedCategory) {
        return false;
      }

      // Discount tag filter
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
      } else if (selectedDiscountFilter === 'military') {
        const hasMilitary = facility.discounts.some(d => d.target.includes('군인') || d.target.includes('유공자')) ||
                            facility.discountBadges.some(b => b.includes('군인'));
        if (!hasMilitary) return false;
      } else if (selectedDiscountFilter === 'free') {
        const hasFree = facility.discounts.some(d => d.target.includes('무료') || d.rate.includes('무료')) ||
                        facility.regularPrices.some(p => p.priceWeekday === '무료') ||
                        facility.discountBadges.some(b => b.includes('무료'));
        if (!hasFree) return false;
      }

      // Keyword Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = facility.name.toLowerCase().includes(q);
        const matchSummary = facility.summary.toLowerCase().includes(q);
        const matchCat = facility.categoryLabel.toLowerCase().includes(q);
        const matchPrices = facility.regularPrices.some(p => p.name.toLowerCase().includes(q) || p.note?.toLowerCase().includes(q));
        const matchDiscounts = facility.discounts.some(d => d.target.toLowerCase().includes(q) || d.condition.toLowerCase().includes(q));
        const matchBadges = facility.discountBadges.some(b => b.toLowerCase().includes(q));
        return matchName || matchSummary || matchCat || matchPrices || matchDiscounts || matchBadges;
      }

      return true;
    });
  }, [searchTerm, selectedCategory, selectedDiscountFilter]);

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'racing': return <Zap size={18} className="text-amber-500" />;
      case 'farm': return <Heart size={18} className="text-emerald-500" />;
      case 'play': return <Smile size={18} className="text-blue-500" />;
      case 'culture': return <Palette size={18} className="text-purple-500" />;
      case 'water': return <Waves size={18} className="text-cyan-500" />;
      case 'package': return <PackageCheck size={18} className="text-rose-500" />;
      default: return <Sparkles size={18} className="text-brand-mint" />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              공식 웹사이트 & PMS 실측 SSOT
            </span>
            <span className="text-xs text-slate-400">최종 확인: 2026-10-17</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Ticket className="text-brand-mint" size={26} />
            체험·어트랙션 종합 이용요금 안내
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            벨포레 리조트 전체 레저 시설의 정상가, 우대할인(도민·회원·투숙객) 규정 및 이용 조건을 한눈에 검색하고 조회합니다.
          </p>
        </div>

        {/* View Mode & Expand Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="카드 보기"
            >
              <LayoutGrid size={15} />
              카드 뷰
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="표 보기"
            >
              <TableIcon size={15} />
              비교표 뷰
            </button>
          </div>

          {viewMode === 'card' && (
            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                title="모든 시설 우대할인 및 상세 펼치기"
              >
                <Maximize2 size={13} />
                전체 펼치기
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                title="모든 상세 접기"
              >
                <Minimize2 size={13} />
                전체 접기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Quick Search & Category Filters (핵심: "쉽게 체험을 찾을 수 있는게 제일 중요") */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="체험명, 카테고리, 요금, 키워드 검색 (예: 마운틴카트, 썰매, 도민할인, 목장, 보트, 패키지...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {LEISURE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                  isSelected
                    ? 'bg-brand-mint text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {getCategoryIcon(cat.key)}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Discount Filter Tags */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Percent size={13} />
            우대혜택 필터:
          </span>
          {discountFilterTags.map((tag) => {
            const isSelected = selectedDiscountFilter === tag.key;
            return (
              <button
                key={tag.key}
                onClick={() => setSelectedDiscountFilter(tag.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
          {(searchTerm || selectedCategory !== 'all' || selectedDiscountFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedDiscountFilter('all');
              }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 ml-auto flex items-center gap-1 py-1 px-2"
            >
              <X size={13} />
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 3. Search Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          총 <strong className="text-slate-800 font-bold">{filteredFacilities.length}</strong>개의 체험 시설이 표시됩니다.
        </span>
        <span className="text-slate-400">
          * 카드를 클릭하면 상세 요금표, 우대할인 규정 및 탑승기준이 펼쳐집니다.
        </span>
      </div>

      {/* 4-A. CARD VIEW: Clean, Scannable & Interactive */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 gap-4">
          {filteredFacilities.map((facility) => {
            const isExpanded = expandedIds.has(facility.id);

            return (
              <div
                key={facility.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-brand-mint/60 shadow-md ring-1 ring-brand-mint/20'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Clean Top Card Header (항상 보이는 영역) */}
                <div
                  onClick={() => toggleExpand(facility.id)}
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 shrink-0 mt-0.5">
                      {getCategoryIcon(facility.category)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {facility.categoryLabel}
                        </span>
                        {facility.closedDay && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            {facility.closedDay}
                          </span>
                        )}
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          {facility.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {facility.summary}
                      </p>

                      {/* Operation summary */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          {facility.operatingHours.split('(')[0]}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck size={13} className="text-slate-400" />
                          {facility.ageRequirement.split('/')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Expand CTA */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400 font-medium">대표 이용요금</div>
                      <div className="text-base font-extrabold text-slate-900 tracking-tight text-emerald-700">
                        {facility.representativePrice}
                      </div>
                      {/* Discount Badges Preview */}
                      <div className="flex flex-wrap gap-1 mt-1 justify-start md:justify-end">
                        {facility.discountBadges.slice(0, 3).map((badge, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      className={`p-2 rounded-xl transition-all shrink-0 ${
                        isExpanded
                          ? 'bg-brand-mint text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={isExpanded ? '상세 접기' : '우대할인 및 상세 요금 보기'}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Detail Section (클릭 시 펼쳐짐) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-6 animate-fadeIn">
                    {/* 1. 권종별 상세 요금표 */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
                        <Tag size={15} className="text-brand-mint" />
                        권종별 정상 이용요금
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-2.5 px-4">구분 / 권종</th>
                              <th className="py-2.5 px-4">주중 (평일)</th>
                              <th className="py-2.5 px-4">주말 및 공휴일</th>
                              <th className="py-2.5 px-4">비고 / 조건</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {facility.regularPrices.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 font-semibold text-slate-800">{item.name}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-900">{item.priceWeekday}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-900">
                                  {item.priceWeekend || item.priceWeekday}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">{item.note || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 2. 핵심 우대 할인 규정 (★ 사용자가 클릭했을 때 보고 싶어하는 핵심!) */}
                    {facility.discounts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
                          <Percent size={15} className="text-emerald-600" />
                          우대 할인 혜택 및 적용 기준
                        </h3>
                        <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-emerald-50/70 border-b border-emerald-100 text-emerald-900 font-semibold">
                                <th className="py-2.5 px-4">할인 대상</th>
                                <th className="py-2.5 px-4">할인율 / 혜택</th>
                                <th className="py-2.5 px-4">할인가격</th>
                                <th className="py-2.5 px-4">증빙 서류 및 적용 조건</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50">
                              {facility.discounts.map((disc, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/30">
                                  <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                    {disc.target}
                                  </td>
                                  <td className="py-2.5 px-4 font-bold text-emerald-700">{disc.rate}</td>
                                  <td className="py-2.5 px-4 font-extrabold text-slate-900">
                                    {disc.discountPrice || '-'}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600">{disc.condition}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                          * 할인 대상 고객은 신분증 또는 증빙 서류 확인 후 현장에서 할인이 적용되며, 모든 할인은 중복 적용되지 않습니다.
                        </p>
                      </div>
                    )}

                    {/* 3. 이용 및 탑승 자격 & 안전수칙 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                          <ShieldCheck size={14} className="text-blue-600" />
                          탑승 자격 및 안전 수칙
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {facility.requirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                          <AlertCircle size={14} className="text-amber-600" />
                          운영 안내 및 비고
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {facility.notes.map((note, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                          {facility.cancellationPolicy && (
                            <li className="flex items-start gap-1.5 text-rose-600 pt-1 border-t border-slate-100">
                              <span className="font-bold">• 환불규정:</span>
                              <span>{facility.cancellationPolicy}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Footer Contact & Link */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        {facility.contact && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone size={13} className="text-slate-400" />
                            문의: <strong className="text-slate-800">{facility.contact}</strong>
                          </span>
                        )}
                        {facility.breakTime && (
                          <span className="text-slate-500">
                            브레이크타임: {facility.breakTime}
                          </span>
                        )}
                      </div>

                      {facility.officialUrl && (
                        <a
                          href={facility.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-brand-mint font-semibold hover:underline"
                        >
                          공식 안내 페이지 바로가기
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
      )}

      {/* 4-B. COMPACT TABLE VIEW: Quick Comparison */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">분류</th>
                  <th className="py-3 px-4">시설명</th>
                  <th className="py-3 px-4">대표 요금</th>
                  <th className="py-3 px-4">운영시간 / 휴장일</th>
                  <th className="py-3 px-4">탑승 / 이용 자격</th>
                  <th className="py-3 px-4">핵심 우대할인</th>
                  <th className="py-3 px-4 text-center">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacilities.map((facility) => {
                  const isExpanded = expandedIds.has(facility.id);
                  return (
                    <tr
                      key={facility.id}
                      onClick={() => toggleExpand(facility.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {facility.categoryLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {facility.name}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-700 whitespace-nowrap">
                        {facility.representativePrice}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {facility.operatingHours.split('(')[0]}
                        {facility.closedDay && (
                          <span className="ml-1 text-[10px] text-amber-700 font-semibold">
                            ({facility.closedDay})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={facility.ageRequirement}>
                        {facility.ageRequirement}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {facility.discountBadges.map((badge, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          className={`p-1.5 rounded-lg transition-colors ${
                            isExpanded ? 'bg-brand-mint text-white' : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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

      {/* 5. Special Online Package Callout Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-extrabold bg-white/20 rounded-md backdrop-blur-xs">
              온라인 예매 전용 특가
            </span>
            <span className="text-xs text-white/80">최대 45% 할인 혜택</span>
          </div>
          <h3 className="text-lg font-black tracking-tight mt-1">
            패밀리 올데이 5종 & 4종 통합 패스 패키지
          </h3>
          <p className="text-xs text-white/90 mt-1 max-w-xl">
            목장 + 썰매 + 마운틴카트 + 미디어아트 + 놀이동산을 묶어 합리적인 가격에 이용할 수 있는 공식 온라인 전용 상품입니다. 대기 없이 QR코드로 즉시 입장 가능합니다.
          </p>
        </div>
        <a
          href="https://belleforetresort.com/app/ticket/ticketList"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors shrink-0"
        >
          온라인 티켓 예매하기
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
