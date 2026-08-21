import { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, Plus, Trash2, CheckCircle2, 
  Filter, ShieldCheck, Gauge
} from 'lucide-react';
import type { FacilityCapacityItem } from '../types/simulation';

// Default SSOT Capacity Master Seeds for Belleforet Facilities
export const DEFAULT_CAPACITY_SEEDS: FacilityCapacityItem[] = [
  // 🏨 숙박 (ROOM)
  {
    id: 'cap_room_condo',
    shopCode: 'SHOP_ROOM_CONDO',
    shopName: '벨포레 리조트 콘도미니엄',
    category: 'ROOM',
    categoryLabel: '숙박',
    maxDailyUnits: 175,
    unitName: '실',
    baseUnitPrice: 165000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 35,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '전체 보유 175실 (51평 35세트 물리 70실 포함)'
  },
  
  // ⛳ 골프 (GOLF)
  {
    id: 'cap_golf_cc',
    shopCode: 'SHOP_GOLF_CC',
    shopName: '벨포레 컨트리클럽 (C.C)',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 80,
    unitName: '팀',
    baseUnitPrice: 140000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 30,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '1부(24팀) + 2부(35팀) + 3부(21팀) 최대 80팀'
  },

  // 🎢 레저 (LEISURE)
  {
    id: 'cap_leisure_luge',
    shopCode: 'SHOP_LEISURE_LUGE',
    shopName: '익스트림 루지 (Extreme Luge)',
    category: 'LEISURE',
    categoryLabel: '레저',
    maxDailyUnits: 1500,
    unitName: '명',
    baseUnitPrice: 18000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 1,
    notes: '트랙 시간당 안전 탑승 정원 한계 1,500명/일'
  },
  {
    id: 'cap_leisure_sled',
    shopCode: 'SHOP_LEISURE_SLED',
    shopName: '사계절 썰매장 (All-Season Sled)',
    category: 'LEISURE',
    categoryLabel: '레저',
    maxDailyUnits: 1000,
    unitName: '명',
    baseUnitPrice: 12000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 2,
    notes: '슬로프 일일 최대 수용 인원 1,000명'
  },
  {
    id: 'cap_leisure_media',
    shopCode: 'SHOP_LEISURE_MEDIA',
    shopName: '미디어아트센터 & 목장 (Media Art)',
    category: 'LEISURE',
    categoryLabel: '레저',
    maxDailyUnits: 2000,
    unitName: '명',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '체험형 전시관 및 목장 일일 입장 한계'
  },
  {
    id: 'cap_leisure_marina',
    shopCode: 'SHOP_LEISURE_MARINA',
    shopName: '마리나클럽 & 요트 (Marina Club)',
    category: 'LEISURE',
    categoryLabel: '레저',
    maxDailyUnits: 400,
    unitName: '명',
    baseUnitPrice: 25000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '보트/요트 시간대별 운항 정원 한계'
  },

  // 🏎️ 모토아레나 (MOTO)
  {
    id: 'cap_moto_kart',
    shopCode: 'SHOP_MOTO_KART',
    shopName: '모토아레나 카트 경기장 (Karting)',
    category: 'MOTO',
    categoryLabel: '모토아레나',
    maxDailyUnits: 500,
    unitName: '세션',
    baseUnitPrice: 35000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 5,
    notes: '서킷 주행 세션 및 카트 정비 회전 한계'
  },
  {
    id: 'cap_moto_track',
    shopCode: 'SHOP_MOTO_TRACK',
    shopName: '모토아레나 트랙 대관/스포츠주행',
    category: 'MOTO',
    categoryLabel: '모토아레나',
    maxDailyUnits: 6,
    unitName: '건',
    baseUnitPrice: 2500000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 40,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '기업 서킷 대관 및 전문 주행 세션'
  },

  // 🍽️ 식음 (FNB)
  {
    id: 'cap_fnb_namdo',
    shopCode: 'SHOP_FNB_NAMDO',
    shopName: '남도 한식당 (Namdo Korean Dining)',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 600,
    unitName: '석',
    baseUnitPrice: 22000,
    maxTurnoverRate: 3.0,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 6,
    notes: '200석 × 일평균 회전율 3회'
  },
  {
    id: 'cap_fnb_clubhouse',
    shopCode: 'SHOP_FNB_CLUBHOUSE',
    shopName: '골프 클럽하우스 레스토랑',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 320,
    unitName: '석',
    baseUnitPrice: 28000,
    maxTurnoverRate: 2.5,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '골프 내장객 80팀 × 4인 연계 식음'
  },
  {
    id: 'cap_fnb_cafe',
    shopCode: 'SHOP_FNB_CAFE',
    shopName: '투썸플레이스 & 브런치 베이커리 카페',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 1200,
    unitName: '건',
    baseUnitPrice: 7500,
    maxTurnoverRate: 4.0,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 7,
    notes: '테이크아웃 및 베이커리 회전 한계'
  },

  // 🏛️ 대관/연회 (BANQUET)
  {
    id: 'cap_banquet_grand',
    shopCode: 'SHOP_BANQUET_GRAND',
    shopName: '벨포레 그랜드볼룸 & 세미나홀',
    category: 'BANQUET',
    categoryLabel: '대관/연회',
    maxDailyUnits: 500,
    unitName: '명',
    baseUnitPrice: 3500000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 50,
    allowSpillover: true,
    spilloverPriority: 10,
    notes: 'MICE, 기업 연수, 웨딩 완충 버퍼 흡수'
  }
];

export default function AdminCapacity() {
  const [items, setItems] = useState<FacilityCapacityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    loadCapacityMaster();
  }, []);

  const loadCapacityMaster = async () => {
    setLoading(true);
    try {
      // 1. Try Firebase Firestore
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'simulationMaster', 'facilityCapacities'));
        if (docSnap.exists() && Array.isArray(docSnap.data()?.items)) {
          setItems(docSnap.data().items);
          setLoading(false);
          return;
        }
      } catch (fbErr) {
        console.warn('Firebase fetch skipped, checking localStorage cache:', fbErr);
      }

      // 2. Fallback to LocalStorage Cache
      const cached = localStorage.getItem('BELLEFORET_CAPACITY_MASTER');
      if (cached) {
        setItems(JSON.parse(cached));
      } else {
        // 3. Fallback to Initial Default Seeds
        setItems(DEFAULT_CAPACITY_SEEDS);
        localStorage.setItem('BELLEFORET_CAPACITY_MASTER', JSON.stringify(DEFAULT_CAPACITY_SEEDS));
      }
    } catch (err) {
      console.error('Failed to load capacity master:', err);
      setItems(DEFAULT_CAPACITY_SEEDS);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof FacilityCapacityItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // 1. Save to LocalStorage cache
      localStorage.setItem('BELLEFORET_CAPACITY_MASTER', JSON.stringify(items));

      // 2. Save to Firebase Firestore
      try {
        const { db } = await import('../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'simulationMaster', 'facilityCapacities'), {
          items,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        });
      } catch (fbErr) {
        console.warn('Firebase sync warning (local cache preserved):', fbErr);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save capacity master:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('기본 표준 캐파 설정값으로 초기화하시겠습니까?')) {
      setItems(DEFAULT_CAPACITY_SEEDS);
      localStorage.setItem('BELLEFORET_CAPACITY_MASTER', JSON.stringify(DEFAULT_CAPACITY_SEEDS));
    }
  };

  const handleAddNewItem = () => {
    const newItem: FacilityCapacityItem = {
      id: `cap_custom_${Date.now()}`,
      shopCode: `SHOP_CUSTOM_${items.length + 1}`,
      shopName: '신규 영업장',
      category: 'LEISURE',
      categoryLabel: '레저',
      maxDailyUnits: 500,
      unitName: '명',
      baseUnitPrice: 20000,
      allowPriceLeverage: true,
      maxPriceHikeRate: 20,
      allowSpillover: true,
      spilloverPriority: 10,
      notes: '신규 추가 영업장'
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('해당 영업장의 캐파 설정을 삭제하시겠습니까?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const filteredItems = items.filter(item => {
    if (filterCategory === 'ALL') return true;
    return item.category === filterCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                영업장별 물리적 캐파(Capacity) 및 단가 마스터 관리
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Target Simulator SSOT
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                목표 시뮬레이터가 역추산 시 적용할 <strong>영업장별 1일 최대 수용량(객실, 티타임, 탑승정원, 좌석수)과 단가 인상/재배분 정책</strong>을 설정합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            기본값 복구
          </button>
          <button
            onClick={handleAddNewItem}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            영업장 추가
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
              saveSuccess 
                ? 'bg-emerald-600' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                저장 완료!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '전체 캐파 마스터 저장'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-teal-50/50 to-slate-50 border border-indigo-100 text-xs text-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg mt-0.5 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm mb-0.5">
              💡 캐파 제약 기반 역추산 규칙 (Capacity Constraint Rules)
            </div>
            <div className="text-slate-600 leading-relaxed">
              1. <strong>수용량(Q) 초과 시:</strong> [단가 인상 허용]이 켜져 있으면 목표 수용량을 캐파 한계에 고정하고 객단가(ADR/그린피/이용료) 인상 목표를 제시합니다.<br/>
              2. <strong>초과분 재배분:</strong> [초과분 재배분]이 켜져 있으면 감당 불가능한 매출 목표를 대관/연회, 식음 등 캐파 여유 영업장으로 자동 이전합니다.
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 pl-3 pr-2 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> 부문 필터:
        </span>
        {[
          { id: 'ALL', label: '전체 보기', icon: '🌐' },
          { id: 'ROOM', label: '숙박', icon: '🏨' },
          { id: 'GOLF', label: '골프', icon: '⛳' },
          { id: 'LEISURE', label: '레저', icon: '🎢' },
          { id: 'MOTO', label: '모토아레나', icon: '🏎️' },
          { id: 'FNB', label: '식음', icon: '🍽️' },
          { id: 'BANQUET', label: '대관/연회', icon: '🏛️' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label} ({cat.id === 'ALL' ? items.length : items.filter(i => i.category === cat.id).length})
          </button>
        ))}
      </div>

      {/* Capacity Master Table */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs animate-pulse">
            영업장별 캐파 마스터 설정을 불러오는 중입니다...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 min-w-[200px]">영업장명 (Facility)</th>
                <th className="py-3.5 px-4 min-w-[100px]">부문</th>
                <th className="py-3.5 px-4 min-w-[140px]">1일 최대 캐파 (수용량)</th>
                <th className="py-3.5 px-4 min-w-[140px]">기준 평균단가 (원)</th>
                <th className="py-3.5 px-4 min-w-[130px] text-center">단가인상 허용</th>
                <th className="py-3.5 px-4 min-w-[120px] text-center">초과분 재배분</th>
                <th className="py-3.5 px-4 min-w-[220px]">비고 및 산출 근거</th>
                <th className="py-3.5 px-4 w-16 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  
                  {/* Shop Name */}
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <input
                      type="text"
                      value={item.shopName}
                      onChange={(e) => handleFieldChange(item.id, 'shopName', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-indigo-500"
                    />
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const cat = e.target.value as any;
                        const labels: Record<string, string> = {
                          ROOM: '숙박', GOLF: '골프', LEISURE: '레저', MOTO: '모토아레나', FNB: '식음', BANQUET: '대관/연회', OTHER: '기타'
                        };
                        handleFieldChange(item.id, 'category', cat);
                        handleFieldChange(item.id, 'categoryLabel', labels[cat] || '기타');
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-700"
                    >
                      <option value="ROOM">🏨 숙박</option>
                      <option value="GOLF">⛳ 골프</option>
                      <option value="LEISURE">🎢 레저</option>
                      <option value="MOTO">🏎️ 모토</option>
                      <option value="FNB">🍽️ 식음</option>
                      <option value="BANQUET">🏛️ 대관</option>
                      <option value="OTHER">📦 기타</option>
                    </select>
                  </td>

                  {/* Max Daily Units */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={item.maxDailyUnits}
                        onChange={(e) => handleFieldChange(item.id, 'maxDailyUnits', Number(e.target.value))}
                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 font-black text-indigo-900 text-right tabular-nums focus:outline-indigo-500"
                      />
                      <input
                        type="text"
                        value={item.unitName}
                        onChange={(e) => handleFieldChange(item.id, 'unitName', e.target.value)}
                        className="w-12 px-1.5 py-1 rounded-lg border border-slate-200 text-center font-bold text-slate-600"
                        placeholder="단위"
                      />
                      <span className="text-slate-400 text-[11px]">/일</span>
                    </div>
                  </td>

                  {/* Base Unit Price */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">₩</span>
                      <input
                        type="number"
                        value={item.baseUnitPrice}
                        onChange={(e) => handleFieldChange(item.id, 'baseUnitPrice', Number(e.target.value))}
                        className="w-28 px-2.5 py-1 rounded-lg border border-slate-200 font-black text-slate-900 text-right tabular-nums focus:outline-indigo-500"
                      />
                    </div>
                  </td>

                  {/* Allow Price Leverage */}
                  <td className="py-3 px-4 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowPriceLeverage}
                        onChange={(e) => handleFieldChange(item.id, 'allowPriceLeverage', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold ${item.allowPriceLeverage ? 'text-teal-700' : 'text-slate-400'}`}>
                        {item.allowPriceLeverage ? '허용' : '고정'}
                      </span>
                    </label>
                  </td>

                  {/* Allow Spillover */}
                  <td className="py-3 px-4 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowSpillover}
                        onChange={(e) => handleFieldChange(item.id, 'allowSpillover', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold ${item.allowSpillover ? 'text-amber-700' : 'text-slate-400'}`}>
                        {item.allowSpillover ? '전이' : '제외'}
                      </span>
                    </label>
                  </td>

                  {/* Notes */}
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleFieldChange(item.id, 'notes', e.target.value)}
                      placeholder="캐파 근거 및 메모"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-indigo-500"
                    />
                  </td>

                  {/* Delete Action */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="영업장 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
