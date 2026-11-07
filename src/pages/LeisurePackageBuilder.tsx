import { useState, useEffect, useMemo, useCallback } from 'react';
import { secureFetcher } from '../lib/secureFetcher';
import {
  Package,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  Sliders,
  Tag,
  Layers,
  Sun,
  Calendar,
  Edit3
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface VenueProduct {
  productId: string;
  facilityCode: string;
  facilityName: string;
  standardVenueName: string;
  venueCategory: string;
  divisionName?: string;
  partName?: string;
  productName: string;
  priceWeekday: number;
  priceWeekend: number;
  priceWeekdayText?: string;
  priceWeekendText?: string;
  note?: string;
}

export interface LeisureVenue {
  facilityCode: string;
  facilityName: string;
  standardVenueName: string;
  venueCategory: string;
  divisionName?: string;
  partName?: string;
  representativePrice?: string;
  products: VenueProduct[];
  discounts?: any[];
}

export interface BuilderCartItem {
  productId: string;
  venueName: string;
  venueCategory: string;
  productName: string;
  unitNormalPrice: number;
  quantity: number;
  facilityCode?: string;
  note?: string;
}

export interface VenueAllocation {
  venueName: string;
  venueCategory: string;
  divisionName?: string;
  partName?: string;
  venueNormalPrice?: number;
  itemCount?: number;
  includedItemsSummary?: string;
  splitRatioPct: number;
  splitRatio?: number;
  allocatedAmt: number;
}

export interface CalculationVerification {
  sumSplitRatioPct: number;
  sumSplitRatio: number;
  sumAllocatedAmt: number;
  varianceKrw: number;
}

export interface SavedPackage {
  packageName: string;
  packageCode: string;
  sellingPrice: number;
  totalNormalPrice: number;
  discountAmount: number;
  discountRatePct: number;
  isCustomPackage: boolean;
  createdAt: string;
  allocations: VenueAllocation[];
  components?: any[];
}

export default function LeisurePackageBuilder() {
  // 1. Data States
  const [venues, setVenues] = useState<LeisureVenue[]>([]);
  const [savedPackages, setSavedPackages] = useState<SavedPackage[]>([]);
  const [crawledAt, setCrawledAt] = useState<string>('-');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // 2. Filter & Mode States
  const [categoryFilter, setCategoryFilter] = useState<'leisure' | 'all'>('leisure');
  const [priceBasis, setPriceBasis] = useState<'WEEKDAY' | 'WEEKEND'>('WEEKDAY');
  const [selectedVenueCode, setSelectedVenueCode] = useState<string>('MOUNTAIN_CART');
  const [venueSearch, setVenueSearch] = useState<string>('');

  // 3. Builder Form States
  const [packageName, setPackageName] = useState<string>('');
  const [packageCode, setPackageCode] = useState<string>('');
  const [cartItems, setCartItems] = useState<BuilderCartItem[]>([]);
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [allocations, setAllocations] = useState<VenueAllocation[]>([]);
  const [verification, setVerification] = useState<CalculationVerification | null>(null);

  // 4. Action & Notice States
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 5. Saved Packages Table Search / Filter
  const [savedSearch, setSavedSearch] = useState<string>('');
  const [onlyCustomFilter, setOnlyCustomFilter] = useState<boolean>(false);

  // Fetch Venues & Saved Packages from SSOT API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await secureFetcher(`${API_BASE}/api/v6/leisure/package-builder?category=${categoryFilter}`).catch(() => null);
      if (res && res.data) {
        const d = res.data;
        const venueList: LeisureVenue[] = Array.isArray(d.leisureVenues) && d.leisureVenues.length > 0
          ? d.leisureVenues
          : Array.isArray(d.venues)
          ? d.venues
          : [];
        setVenues(venueList);
        if (venueList.length > 0 && (!selectedVenueCode || !venueList.some(v => v.facilityCode === selectedVenueCode))) {
          setSelectedVenueCode(venueList[0].facilityCode);
        }
        if (Array.isArray(d.savedPackages)) {
          setSavedPackages(d.savedPackages);
        }
        if (d.lastUpdated || d.crawledAt) {
          setCrawledAt((d.lastUpdated || d.crawledAt).replace('T', ' ').substring(0, 16));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Selected Venue
  const currentVenue = useMemo(() => {
    return venues.find(v => v.facilityCode === selectedVenueCode) || venues[0];
  }, [venues, selectedVenueCode]);

  // Filtered Venues list for selection
  const filteredVenues = useMemo(() => {
    if (!venueSearch.trim()) return venues;
    const q = venueSearch.toLowerCase().trim();
    return venues.filter(v =>
      v.facilityName.toLowerCase().includes(q) ||
      v.standardVenueName.toLowerCase().includes(q) ||
      (v.partName && v.partName.toLowerCase().includes(q))
    );
  }, [venues, venueSearch]);

  // Total Normal Price from Cart Items
  const totalNormalPrice = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.unitNormalPrice * item.quantity), 0);
  }, [cartItems]);

  // Discount Stats
  const discountStats = useMemo(() => {
    if (typeof sellingPrice !== 'number' || sellingPrice <= 0 || totalNormalPrice <= 0) {
      return { amount: 0, ratePct: 0 };
    }
    const diff = totalNormalPrice - sellingPrice;
    const rate = (diff / totalNormalPrice) * 100;
    return {
      amount: diff > 0 ? diff : 0,
      ratePct: rate > 0 ? Number(rate.toFixed(2)) : 0
    };
  }, [totalNormalPrice, sellingPrice]);

  // Update Cart Item Price when priceBasis toggles
  useEffect(() => {
    setCartItems(prev => prev.map(item => {
      // Find original product in venues
      for (const venue of venues) {
        const prod = venue.products.find(p => p.productId === item.productId);
        if (prod) {
          const newUnitPrice = priceBasis === 'WEEKDAY' ? prod.priceWeekday : prod.priceWeekend;
          return { ...item, unitNormalPrice: newUnitPrice };
        }
      }
      return item;
    }));
  }, [priceBasis, venues]);

  // Add Product to Cart
  const handleAddToCart = (product: VenueProduct) => {
    const unitPrice = priceBasis === 'WEEKDAY' ? product.priceWeekday : product.priceWeekend;
    setCartItems(prev => {
      const idx = prev.findIndex(item => item.productId === product.productId);
      if (idx >= 0) {
        // Increment quantity
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + 1,
          unitNormalPrice: unitPrice
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.productId,
          venueName: product.standardVenueName || product.facilityName,
          venueCategory: product.venueCategory || 'TICKET',
          productName: product.productName,
          unitNormalPrice: unitPrice,
          quantity: 1,
          facilityCode: product.facilityCode,
          note: product.note
        }
      ];
    });
  };

  // Modify Quantity in Cart
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as BuilderCartItem[];
    });
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCartItems([]);
    setAllocations([]);
    setVerification(null);
  };

  // Preset Discount Button Click
  const handleApplyDiscountPreset = (rate: number) => {
    if (totalNormalPrice <= 0) return;
    const discounted = Math.round(totalNormalPrice * (1 - rate));
    setSellingPrice(discounted);
  };

  // Trigger Calculation with Backend API (action: 'CALCULATE')
  const handleCalculateAllocations = useCallback(async (customSplits?: VenueAllocation[]) => {
    if (cartItems.length === 0 || typeof sellingPrice !== 'number' || sellingPrice <= 0) {
      return;
    }

    try {
      setIsCalculating(true);
      const payload: any = {
        action: 'CALCULATE',
        packageName: packageName.trim() || '신규 복합 패키지',
        priceBasis,
        sellingPrice,
        items: cartItems.map(item => ({
          productId: item.productId,
          venueName: item.venueName,
          venueCategory: item.venueCategory,
          productName: item.productName,
          unitNormalPrice: item.unitNormalPrice,
          quantity: item.quantity
        })),
        customAllocations: Array.isArray(customSplits) && customSplits.length > 0
          ? customSplits.map(s => ({
              venueName: s.venueName,
              venueCategory: s.venueCategory,
              splitRatioPct: s.splitRatioPct,
              allocatedAmt: s.allocatedAmt
            }))
          : []
      };

      const res = await secureFetcher(`${API_BASE}/api/v6/leisure/package-builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (res && res.data) {
        setAllocations(res.data.allocations || []);
        setVerification(res.data.verification || null);
      }
    } finally {
      setIsCalculating(false);
    }
  }, [cartItems, sellingPrice, packageName, priceBasis]);

  // Recalculate automatically when items or selling price change significantly
  useEffect(() => {
    if (cartItems.length > 0 && typeof sellingPrice === 'number' && sellingPrice > 0) {
      handleCalculateAllocations();
    } else {
      setAllocations([]);
      setVerification(null);
    }
  }, [cartItems, sellingPrice, priceBasis, handleCalculateAllocations]);

  // Manual adjustment of split ratio (%) or allocated amount (원)
  const handleSplitRatioChange = (venueName: string, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    setAllocations(prev => prev.map(a => {
      if (a.venueName === venueName) {
        const newAmt = typeof sellingPrice === 'number' ? Math.round((sellingPrice * num) / 100) : 0;
        return { ...a, splitRatioPct: num, allocatedAmt: newAmt };
      }
      return a;
    }));
  };

  const handleAllocatedAmtChange = (venueName: string, valStr: string) => {
    const amt = parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0;
    setAllocations(prev => prev.map(a => {
      if (a.venueName === venueName) {
        const newRatio = typeof sellingPrice === 'number' && sellingPrice > 0
          ? Number(((amt / sellingPrice) * 100).toFixed(2))
          : 0;
        return { ...a, allocatedAmt: amt, splitRatioPct: newRatio };
      }
      return a;
    }));
  };

  // Re-balance with 0-Variance via Backend
  const handleRebalance0Variance = () => {
    handleCalculateAllocations(allocations);
  };

  // Save Package (action: 'SAVE')
  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      setSaveNotice({ type: 'error', message: '패키지 상품명을 입력해주세요.' });
      return;
    }
    if (cartItems.length === 0) {
      setSaveNotice({ type: 'error', message: '패키지에 포함할 상품을 최소 1개 이상 담아주세요.' });
      return;
    }
    if (typeof sellingPrice !== 'number' || sellingPrice <= 0) {
      setSaveNotice({ type: 'error', message: '유효한 패키지 판매가를 입력해주세요.' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveNotice(null);

      const payload = {
        action: 'SAVE',
        packageName: packageName.trim(),
        packageCode: packageCode.trim() || undefined,
        priceBasis,
        sellingPrice,
        items: cartItems.map(item => ({
          productId: item.productId,
          venueName: item.venueName,
          venueCategory: item.venueCategory,
          productName: item.productName,
          unitNormalPrice: item.unitNormalPrice,
          quantity: item.quantity
        })),
        customAllocations: allocations.map(s => ({
          venueName: s.venueName,
          venueCategory: s.venueCategory,
          splitRatioPct: s.splitRatioPct,
          allocatedAmt: s.allocatedAmt
        }))
      };

      const res = await secureFetcher(`${API_BASE}/api/v6/leisure/package-builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch((err) => ({ status: 'error', message: err.message }));

      if (res && (res.status === 'success' || res.success)) {
        setSaveNotice({
          type: 'success',
          message: res.message || `패키지 [${packageName}] 및 0-Variance 배분 규칙이 공식 SSOT DB에 성공적으로 저장되었습니다.`
        });
        // Reload saved packages list
        loadData();
      } else {
        setSaveNotice({
          type: 'error',
          message: res?.message || '저장 중 오류가 발생했습니다. 백엔드 연결 상태를 확인해주세요.'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Load Saved Package into Builder for Editing
  const handleLoadPackage = (pkg: SavedPackage) => {
    setPackageName(pkg.packageName);
    setPackageCode(pkg.packageCode || '');
    setSellingPrice(pkg.sellingPrice || 0);
    setAllocations(pkg.allocations || []);

    if (Array.isArray(pkg.components) && pkg.components.length > 0) {
      setCartItems(pkg.components.map((c, idx) => ({
        productId: c.productId || `custom-${idx}`,
        venueName: c.venueName || '기타',
        venueCategory: c.venueCategory || 'TICKET',
        productName: c.productName || '패키지 구성품',
        unitNormalPrice: c.unitNormalPrice || 0,
        quantity: c.quantity || 1
      })));
    } else {
      // Reconstruct basic cart items based on allocations if components not available
      const generatedItems: BuilderCartItem[] = (pkg.allocations || []).map((alloc, aIdx) => ({
        productId: `pkg-comp-${aIdx}`,
        venueName: alloc.venueName,
        venueCategory: alloc.venueCategory || 'TICKET',
        productName: `${alloc.venueName} 이용권`,
        unitNormalPrice: alloc.venueNormalPrice || alloc.allocatedAmt || 0,
        quantity: 1
      }));
      setCartItems(generatedItems);
    }

    setSaveNotice({
      type: 'success',
      message: `패키지 [${pkg.packageName}] 설정을 불러왔습니다. 수정 후 저장 버튼을 누르면 업데이트됩니다.`
    });

    // Smooth scroll to builder top
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Delete Package
  const handleDeletePackage = async (pkg: SavedPackage) => {
    if (!confirm(`패키지 [${pkg.packageName}]을(를) 삭제하시겠습니까?\n이 작업은 공식 데이터베이스에서 배분 규칙을 영구 삭제합니다.`)) {
      return;
    }

    try {
      const url = `${API_BASE}/api/v6/leisure/package-builder?packageName=${encodeURIComponent(pkg.packageName)}&packageCode=${encodeURIComponent(pkg.packageCode || '')}`;
      const res = await secureFetcher(url, { method: 'DELETE' }).catch(() => null);
      if (res && (res.status === 'success' || res.success)) {
        alert(res.message || `패키지 [${pkg.packageName}]이 삭제되었습니다.`);
        loadData();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (e: any) {
      alert(`삭제 오류: ${e.message}`);
    }
  };

  // Filtered Saved Packages Table
  const filteredSavedPackages = useMemo(() => {
    return savedPackages.filter(p => {
      if (onlyCustomFilter && !p.isCustomPackage) return false;
      if (!savedSearch.trim()) return true;
      const q = savedSearch.toLowerCase().trim();
      return (
        p.packageName.toLowerCase().includes(q) ||
        (p.packageCode && p.packageCode.toLowerCase().includes(q)) ||
        (Array.isArray(p.allocations) && p.allocations.some(a => a.venueName.toLowerCase().includes(q)))
      );
    });
  }, [savedPackages, onlyCustomFilter, savedSearch]);

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-20 relative">
      {/* Ambient Forest Banner */}
      <div className="w-full bg-[#284F42] h-[220px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#1B382E]/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 border border-white/10 shadow-2xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#284F42] border border-white/20 text-white/90 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET 0-VARIANCE PACKAGE ARCHITECTURE</span>
                <span className="text-[#CAAC86]">|</span>
                <span>SSOT 공식 배분 파이프라인</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Package className="text-[#CAAC86]" size={28} />
                <span>레저 복합 패키지 생성기 & 영업장별 매출 배분</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#B59269] text-white">
                  0-Variance Builder
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-white/80 max-w-3xl leading-relaxed">
                벨포레 공식 웹사이트(belleforetresort.com) 일일 크롤링 실측 단품을 조합하여 신규 복합 패키지를 생성하고, 영업장별 1원 오차 없는(Δ = 0원) 최대잔여법 매출 배분율(%)과 배분 금액(원)을 공식 데이터베이스에 저장합니다.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/70 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5FB878]"></span>
                  <span>단품 크롤링 출처: <strong className="text-white font-mono">belleforetresort.com</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#CAAC86]" />
                  <span>동기화 시각: <strong className="text-white font-mono">{crawledAt}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#5FB878]" />
                  <span>DB 상태: <strong className="text-[#5FB878] font-bold">CONNECTED (정규 마트 연동)</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                  <span>{isLoading ? '동기화 중...' : '크롤링 데이터 새로고침'}</span>
                </button>
              </div>
            </div>

            {/* Price Basis & Category Filter Controls */}
            <div className="flex flex-col gap-2 shrink-0 self-start md:self-center">
              <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20 text-xs font-bold backdrop-blur-md">
                <button
                  onClick={() => setPriceBasis('WEEKDAY')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    priceBasis === 'WEEKDAY'
                      ? 'bg-white text-[#1B382E] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Sun size={13} className={priceBasis === 'WEEKDAY' ? 'text-[#B59269]' : ''} />
                  <span>주중 정상가 기준</span>
                </button>
                <button
                  onClick={() => setPriceBasis('WEEKEND')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    priceBasis === 'WEEKEND'
                      ? 'bg-[#B59269] text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>주말·공휴일 기준</span>
                </button>
              </div>

              <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20 text-xs font-bold backdrop-blur-md">
                <button
                  onClick={() => setCategoryFilter('leisure')}
                  className={`flex-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-center ${
                    categoryFilter === 'leisure'
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🎢 레저본부 전용 ({venues.length}개 영업장)
                </button>
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`flex-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-center ${
                    categoryFilter === 'all'
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🌐 전사 통합 상품
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Notice Alert Banner */}
        {saveNotice && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-md transition-all ${
              saveNotice.type === 'success'
                ? 'bg-[#E8F2EE] border-[#284F42]/30 text-[#1B382E]'
                : 'bg-[#FDF0ED] border-[#8B2635]/30 text-[#8B2635]'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveNotice.type === 'success' ? (
                <CheckCircle2 size={18} className="text-[#284F42] shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-[#8B2635] shrink-0" />
              )}
              <span>{saveNotice.message}</span>
            </div>
            <button
              onClick={() => setSaveNotice(null)}
              className="text-xs underline hover:opacity-75 cursor-pointer shrink-0"
            >
              닫기
            </button>
          </div>
        )}

        {/* 3-STEP BUILDER WORKFLOW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: STEP 1 (영업장 선택 및 크롤링 상품 담기) - 5 Cols */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#D0C6BB]/75 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#D0C6BB]/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#284F42] text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-[#1B382E]">
                  영업장 & 크롤링 단품 선택
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#5A6B63] bg-[#F4F3EE] px-2 py-0.5 rounded-lg border border-[#D0C6BB]/60">
                {priceBasis === 'WEEKDAY' ? '주중 요금 적용 중' : '주말 요금 적용 중'}
              </span>
            </div>

            {/* Venue Search Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
              <input
                type="text"
                value={venueSearch}
                onChange={e => setVenueSearch(e.target.value)}
                placeholder="영업장 검색 (마운틴카트, 썰매, 목장 등)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F3EE] border border-[#D0C6BB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] focus:bg-white text-[#1B382E]"
              />
            </div>

            {/* Venue Chips Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredVenues.map(venue => {
                const isSelected = venue.facilityCode === selectedVenueCode;
                const count = venue.products?.length || 0;
                return (
                  <button
                    key={venue.facilityCode}
                    onClick={() => setSelectedVenueCode(venue.facilityCode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                        : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:bg-[#F4F3EE] hover:text-[#1B382E]'
                    }`}
                  >
                    <span>{venue.standardVenueName || venue.facilityName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F3EE] text-[#5A6B63]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Venue Header */}
            {currentVenue && (
              <div className="bg-[#E8F2EE]/50 border border-[#B4C6C1]/60 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1E523F]">
                    {currentVenue.facilityName}
                  </span>
                  {currentVenue.partName && (
                    <span className="text-[10px] font-bold bg-white text-[#1E523F] px-2 py-0.5 rounded-md border border-[#B4C6C1]">
                      {currentVenue.partName} 파트
                    </span>
                  )}
                </div>
                {currentVenue.representativePrice && (
                  <p className="text-[11px] text-[#5A6B63]">
                    {currentVenue.representativePrice}
                  </p>
                )}
              </div>
            )}

            {/* Products of Current Venue */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {currentVenue?.products?.map(prod => {
                const currentPrice = priceBasis === 'WEEKDAY' ? prod.priceWeekday : prod.priceWeekend;
                const altPrice = priceBasis === 'WEEKDAY' ? prod.priceWeekend : prod.priceWeekday;
                const altLabel = priceBasis === 'WEEKDAY' ? '주말' : '주중';
                
                const inCartItem = cartItems.find(i => i.productId === prod.productId);
                const inCartQty = inCartItem?.quantity || 0;

                return (
                  <div
                    key={prod.productId}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      inCartQty > 0
                        ? 'bg-[#E8F2EE]/40 border-[#284F42]/40 shadow-xs'
                        : 'bg-white border-[#D0C6BB]/70 hover:border-[#B4C6C1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[#1B382E]">
                            {prod.productName}
                          </h4>
                          {inCartQty > 0 && (
                            <span className="text-[10px] font-extrabold bg-[#284F42] text-white px-1.5 py-0.2 rounded-md">
                              담김 {inCartQty}개
                            </span>
                          )}
                        </div>
                        {prod.note && (
                          <p className="text-[10px] text-[#5A6B63] leading-snug">
                            {prod.note}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5 text-xs">
                          <span className="font-extrabold text-[#1B382E]">
                            {currentPrice.toLocaleString()}원
                          </span>
                          {currentPrice !== altPrice && (
                            <span className="text-[10px] text-[#5A6B63]">
                              ({altLabel} {altPrice.toLocaleString()}원)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(prod)}
                        className="px-3 py-1.5 rounded-xl bg-[#284F42] hover:bg-[#1E3E34] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0 self-center"
                      >
                        <Plus size={13} />
                        <span>담기</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: STEP 2 & STEP 3 (장바구니, 판매가, 0-Variance 배분) - 7 Cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 2. 패키지 상품명 및 판매가 설정 */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D0C6BB]/75 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#D0C6BB]/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#284F42] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-bold text-[#1B382E]">
                    패키지 상품명 & 판매가 설정
                  </h2>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-[#8B2635] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>전체 비우기</span>
                  </button>
                )}
              </div>

              {/* Package Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1B382E] flex items-center justify-between">
                  <span>신규 복합 패키지 상품명</span>
                  {packageCode && (
                    <span className="text-[10px] font-mono text-[#5A6B63]">
                      코드: {packageCode} (기존 패키지 수정 모드)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
                  <input
                    type="text"
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    placeholder="예: 2026 추계 액티비티 4종 패스_대인"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F4F3EE] border border-[#D0C6BB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#284F42] focus:bg-white text-[#1B382E] font-semibold"
                  />
                </div>
              </div>

              {/* Cart Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#5A6B63]">
                  <span>포함된 단품 구성 ({cartItems.length}종)</span>
                  <span>단품 정상가 소계 합산</span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-[#D0C6BB] text-center space-y-2 bg-[#F4F3EE]/50">
                    <Package size={28} className="mx-auto text-[#D0C6BB]" />
                    <p className="text-xs font-bold text-[#1B382E]">
                      장바구니에 담긴 상품이 없습니다
                    </p>
                    <p className="text-[11px] text-[#5A6B63]">
                      좌측에서 원하는 영업장의 크롤링 상품을 선택하여 <strong>[+ 담기]</strong> 버튼을 눌러주세요.
                    </p>
                  </div>
                ) : (
                  <div className="border border-[#D0C6BB]/70 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F3EE] text-[#5A6B63] font-bold border-b border-[#D0C6BB]/60">
                        <tr>
                          <th className="py-2.5 px-3">영업장</th>
                          <th className="py-2.5 px-3">상품명</th>
                          <th className="py-2.5 px-2 text-right">정상단가</th>
                          <th className="py-2.5 px-2 text-center">수량</th>
                          <th className="py-2.5 px-3 text-right">정상가 소계</th>
                          <th className="py-2.5 px-2 text-center">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0C6BB]/40">
                        {cartItems.map(item => (
                          <tr key={item.productId} className="hover:bg-[#F4F3EE]/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-[#1E523F]">
                              {item.venueName}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#1B382E] max-w-[180px] truncate" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-[#5A6B63]">
                              {item.unitNormalPrice.toLocaleString()}원
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex items-center gap-1 bg-[#F4F3EE] border border-[#D0C6BB]/60 rounded-lg p-0.5">
                                <button
                                  onClick={() => handleUpdateQuantity(item.productId, -1)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-[#1B382E] cursor-pointer"
                                  title="수량 감소"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="w-6 text-center font-bold font-mono text-xs">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.productId, 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-[#1B382E] cursor-pointer"
                                  title="수량 증가"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#1B382E] font-mono">
                              {(item.unitNormalPrice * item.quantity).toLocaleString()}원
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveFromCart(item.productId)}
                                className="p-1 rounded-md text-[#8B2635] hover:bg-[#FDF0ED] cursor-pointer transition-colors"
                                title="구성에서 제외"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Price Calculation Box */}
              {cartItems.length > 0 && (
                <div className="bg-[#F4F3EE] rounded-2xl p-4 border border-[#D0C6BB]/75 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#5A6B63]">
                        단품 정상가 총합
                      </span>
                      <p className="text-lg font-black text-[#1B382E] font-mono">
                        {totalNormalPrice.toLocaleString()}원
                      </p>
                    </div>

                    {/* Selling Price Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#1B382E] flex items-center gap-1">
                        <span>목표 패키지 판매가</span>
                        <span className="text-[10px] text-[#B59269] font-normal">(VAT 포함)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={sellingPrice}
                          onChange={e => setSellingPrice(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          className="w-40 sm:w-48 pl-3 pr-8 py-1.5 text-base font-black font-mono bg-white border border-[#284F42] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] text-[#1B382E]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5A6B63]">
                          원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discount Presets & Stats */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D0C6BB]/50">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-[#5A6B63] mr-1">할인율 프리셋:</span>
                      {[0.10, 0.15, 0.20, 0.25, 0.30, 0.40].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleApplyDiscountPreset(rate)}
                          className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-white hover:bg-[#284F42] hover:text-white border border-[#D0C6BB] text-[#1B382E] cursor-pointer transition-colors"
                        >
                          -{Math.round(rate * 100)}%
                        </button>
                      ))}
                    </div>

                    <div className="text-xs font-semibold text-[#5A6B63] flex items-center gap-2">
                      <span>할인 혜택:</span>
                      <strong className="text-[#8B2635] font-bold">
                        -{discountStats.amount.toLocaleString()}원 ({discountStats.ratePct}%)
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3. 영업장별 매출 배분(0-Variance) 조정 및 저장 */}
            {cartItems.length > 0 && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D0C6BB]/75 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D0C6BB]/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#B59269] text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <h2 className="text-base font-bold text-[#1B382E]">
                      영업장별 매출 배분율(%) 및 금액(원) 설정
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCalculateAllocations()}
                      disabled={isCalculating}
                      className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="단품 정상가 비율에 따라 백엔드 0-Variance 최대잔여법으로 자동 배분"
                    >
                      <Sliders size={12} className={isCalculating ? 'animate-spin' : ''} />
                      <span>정상가 비례 자동배분</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRebalance0Variance}
                      disabled={isCalculating}
                      className="px-3 py-1.5 rounded-xl bg-[#284F42] hover:bg-[#1E3E34] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      title="수정된 배분율/금액을 판매가 1원 오차 없이 100.00%로 재보정"
                    >
                      <ShieldCheck size={12} />
                      <span>1원 오차 보정 (0-Variance)</span>
                    </button>
                  </div>
                </div>

                {/* Allocation Table */}
                <div className="border border-[#D0C6BB]/70 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#284F42] text-white font-bold">
                      <tr>
                        <th className="py-2.5 px-3.5">영업장명 (파트)</th>
                        <th className="py-2.5 px-3">포함 상품 요약</th>
                        <th className="py-2.5 px-3 text-right">정상가 소계</th>
                        <th className="py-2.5 px-3 text-right">배분율 (%)</th>
                        <th className="py-2.5 px-3.5 text-right">영업장 배분 금액 (원)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D0C6BB]/40">
                      {allocations.map((alloc) => (
                        <tr key={alloc.venueName} className="hover:bg-[#F4F3EE]/50 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-[#1E523F]">
                            <span>{alloc.venueName}</span>
                            {alloc.partName && (
                              <span className="ml-1.5 text-[10px] text-[#5A6B63] font-normal">
                                ({alloc.partName})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-[#5A6B63] max-w-[200px] truncate" title={alloc.includedItemsSummary}>
                            {alloc.includedItemsSummary || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#5A6B63]">
                            {(alloc.venueNormalPrice || 0).toLocaleString()}원
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={alloc.splitRatioPct}
                                onChange={e => handleSplitRatioChange(alloc.venueName, e.target.value)}
                                className="w-16 px-1.5 py-1 text-right text-xs font-mono font-bold bg-[#F4F3EE] border border-[#D0C6BB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#284F42] focus:bg-white"
                              />
                              <span className="text-[#5A6B63] font-bold">%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={alloc.allocatedAmt.toLocaleString()}
                                onChange={e => handleAllocatedAmtChange(alloc.venueName, e.target.value)}
                                className="w-24 px-2 py-1 text-right text-xs font-mono font-black text-[#1B382E] bg-[#F4F3EE] border border-[#D0C6BB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#284F42] focus:bg-white"
                              />
                              <span className="text-[#5A6B63] font-bold">원</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Verification Footer (Zero-Variance Confirmation) */}
                    <tfoot className="bg-[#E8F2EE] font-bold border-t-2 border-[#284F42]/30 text-xs">
                      <tr>
                        <td colSpan={2} className="py-3 px-3.5 text-[#1B382E]">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-[#284F42]" />
                            <span>배분 합계 및 0-Variance 검증</span>
                            {verification?.varianceKrw === 0 && (
                              <span className="text-[10px] bg-[#284F42] text-white px-2 py-0.5 rounded-full font-mono">
                                Δ = 0원 (오차 0원 일치)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#5A6B63]">
                          {totalNormalPrice.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-mono px-2 py-0.5 rounded-md ${
                            Math.abs((verification?.sumSplitRatioPct || 0) - 100) < 0.01
                              ? 'bg-[#284F42] text-white font-black'
                              : 'bg-[#8B2635] text-white font-black animate-pulse'
                          }`}>
                            {(verification?.sumSplitRatioPct || allocations.reduce((s, a) => s + a.splitRatioPct, 0)).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-black font-mono text-sm text-[#1B382E]">
                          {(verification?.sumAllocatedAmt || allocations.reduce((s, a) => s + a.allocatedAmt, 0)).toLocaleString()}원
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePackage}
                    disabled={isSaving || cartItems.length === 0 || !packageName.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#B59269] hover:bg-[#9E7542] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>공식 DB에 패키지 및 배분 저장 중...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>신규 복합 패키지 및 0-Variance 배분 공식 저장</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: SAVED PACKAGES REGISTRY (등록된 44+개 복합 패키지 관리) */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D0C6BB]/40 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#1B382E] flex items-center gap-2">
                <Layers size={20} className="text-[#284F42]" />
                <span>등록된 복합 패키지 및 영업장 배분 공식 규칙</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]">
                  총 {savedPackages.length}개
                </span>
              </h3>
              <p className="text-xs text-[#5A6B63] mt-0.5">
                현재 벨포레 리조트 정규 DB에 등록된 복합 패키지와 각 영업장별 매출 배분 공식 규칙입니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6B63]" />
                <input
                  type="text"
                  value={savedSearch}
                  onChange={e => setSavedSearch(e.target.value)}
                  placeholder="패키지명, 코드, 영업장 검색..."
                  className="w-56 pl-9 pr-3 py-1.5 text-xs bg-[#F4F3EE] border border-[#D0C6BB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] focus:bg-white text-[#1B382E]"
                />
              </div>

              <button
                type="button"
                onClick={() => setOnlyCustomFilter(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  onlyCustomFilter
                    ? 'bg-[#284F42] text-white border-[#284F42]'
                    : 'bg-white text-[#5A6B63] border-[#D0C6BB] hover:bg-[#F4F3EE]'
                }`}
              >
                커스텀 생성 패키지만
              </button>
            </div>
          </div>

          {/* Saved Packages Table */}
          <div className="border border-[#D0C6BB]/70 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F3EE] text-[#5A6B63] font-bold border-b border-[#D0C6BB]/60">
                  <tr>
                    <th className="py-3 px-3.5">패키지 코드</th>
                    <th className="py-3 px-3.5">패키지 상품명</th>
                    <th className="py-3 px-3 text-right">판매가</th>
                    <th className="py-3 px-3 text-right">정상가 / 할인율</th>
                    <th className="py-3 px-4">영업장별 매출 배분 현황 (0-Variance)</th>
                    <th className="py-3 px-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/40">
                  {filteredSavedPackages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#5A6B63]">
                        일치하는 등록 패키지가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredSavedPackages.map(pkg => (
                      <tr key={`${pkg.packageName}-${pkg.packageCode}`} className="hover:bg-[#F4F3EE]/40 transition-colors">
                        <td className="py-3 px-3.5 font-mono text-[11px] text-[#5A6B63]">
                          {pkg.packageCode || '-'}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#1B382E]">
                                {pkg.packageName}
                              </span>
                              {pkg.isCustomPackage && (
                                <span className="text-[9px] bg-[#B59269] text-white px-1.5 py-0.2 rounded font-bold">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            {pkg.createdAt && (
                              <p className="text-[10px] text-[#5A6B63]">
                                등록: {pkg.createdAt.substring(0, 10)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#1B382E] font-mono">
                          {pkg.sellingPrice > 0 ? `${pkg.sellingPrice.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#5A6B63]">
                          {pkg.totalNormalPrice > 0 ? (
                            <div>
                              <span>{pkg.totalNormalPrice.toLocaleString()}원</span>
                              {pkg.discountRatePct > 0 && (
                                <span className="ml-1 text-[#8B2635] font-bold">
                                  (-{pkg.discountRatePct}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(pkg.allocations) && pkg.allocations.length > 0 ? (
                              pkg.allocations.map((a, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E8F2EE] border border-[#B4C6C1]/60 text-[11px] font-semibold text-[#1E523F]"
                                >
                                  <strong>{a.venueName}</strong>
                                  <span className="text-[#5A6B63] font-mono font-normal">
                                    {a.splitRatioPct}% ({a.allocatedAmt > 0 ? `${a.allocatedAmt.toLocaleString()}원` : '-'})
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[#5A6B63]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleLoadPackage(pkg)}
                              className="px-2 py-1 rounded-lg bg-[#284F42] hover:bg-[#1E3E34] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="이 패키지를 상단 빌더로 로드하여 수정"
                            >
                              <Edit3 size={11} />
                              <span>불러오기</span>
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg)}
                              className="p-1 rounded-lg text-[#8B2635] hover:bg-[#FDF0ED] cursor-pointer transition-colors"
                              title="패키지 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
