import { useState, useEffect } from 'react';
import { useMapping } from '../contexts/MappingContext';
import type { Category } from '../lib/defaultMappings';
import { Save, AlertCircle, Plus, Trash2, Layers, Hotel, CheckCircle, RefreshCw } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

interface RoomSegmentItem {
  id?: number;
  categoryCode?: string;
  sourceName?: string;
  productName: string;
  subGroupName: string;
}

export default function AdminMapping() {
  const { mappings, categories, loading, updateMapping, addCategory, deleteCategory } = useMapping();
  const [activeTab, setActiveTab] = useState<'FACILITY' | 'ROOM_SEGMENT'>('FACILITY');

  // V5 Room Segment State
  const [roomSegmentLoading, setRoomSegmentLoading] = useState(false);
  const [unmappedItems, setUnmappedItems] = useState<RoomSegmentItem[]>([]);
  const [mappedItems, setMappedItems] = useState<RoomSegmentItem[]>([]);
  const [bins, setBins] = useState<string[]>(['MICE', 'OTA', '자사채널', '법인', '분양회원', '제휴&기타']);
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Facility Mappings State
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const fetchRoomSegmentMapping = async () => {
    setRoomSegmentLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      const res = await secureFetcher(`${API_BASE}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT`);
      const payload = res.data || res;

      if (payload) {
        if (Array.isArray(payload.bins)) setBins(payload.bins);
        if (Array.isArray(payload.unmapped)) setUnmappedItems(payload.unmapped);
        if (Array.isArray(payload.mapped)) setMappedItems(payload.mapped);
      }
    } catch (err) {
      console.error('Failed to fetch ROOM_SEGMENT mapping:', err);
    } finally {
      setRoomSegmentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ROOM_SEGMENT') {
      fetchRoomSegmentMapping();
    }
  }, [activeTab]);

  const handleRoomSegmentSave = async (item: RoomSegmentItem, newSegment: string) => {
    const itemKey = `${item.sourceName || 'src'}_${item.productName}`;
    setSavingItemKey(itemKey);
    setSaveSuccessMsg(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      await secureFetcher(`${API_BASE}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceName: item.sourceName || 'raw_객실_정산',
          productName: item.productName,
          subGroupName: newSegment
        })
      });

      setSaveSuccessMsg(`'${item.productName}' 요금제가 '${newSegment}' 세그먼트로 배정되었습니다.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      await fetchRoomSegmentMapping();
    } catch (err) {
      console.error('Failed to update room segment mapping:', err);
      alert('세그먼트 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleCategoryChange = async (id: string, newCategory: Category) => {
    if (!id || id.startsWith('local-')) return;
    try {
      setSavingId(id);
      await updateMapping(id, newCategory);
    } catch (error) {
      console.error(error);
      alert("매핑 업데이트 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert("이미 존재하는 본부명입니다.");
      return;
    }
    try {
      setIsAddingCategory(true);
      await addCategory(trimmed);
      setNewCategoryName('');
    } catch (error) {
      console.error(error);
      alert("본부 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (window.confirm(`'${name}' 본부를 정말 삭제하시겠습니까?\n이 본부에 속했던 매장들은 '미분류'로 변경됩니다.`)) {
      try {
        await deleteCategory(name);
      } catch (error) {
        console.error(error);
        alert("본부 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-800 tracking-tight">V5 통합 매핑 관리 센터</h1>
          <p className="text-slate-500 mt-1 text-sm">
            POS 매장 및 원천 객실 요금제(Rate Type)를 정식 본부 및 세그먼트로 동적 매핑합니다.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('FACILITY')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'FACILITY' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> 매장/시설 매핑
          </button>
          <button
            onClick={() => setActiveTab('ROOM_SEGMENT')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ROOM_SEGMENT' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hotel size={14} /> 객실 세그먼트 매핑 (?mode=ROOM_SEGMENT)
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-fadeIn">
          <CheckCircle size={18} className="text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      {/* TAB 1: POS 매장/시설 매핑 */}
      {activeTab === 'FACILITY' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
            <AlertCircle size={20} className="shrink-0 text-blue-500" />
            <p>
              신규 매장이 추가되거나 기존 매장의 본부 소속이 변경되었을 때, 이 페이지에서 
              <strong> 셀렉트박스(드롭다운)</strong>를 변경하시면 즉시 클라우드에 반영됩니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">본부 목록 관리</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <div key={cat} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm">
                  <span className="font-medium">{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-slate-200"
                    title="본부 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="새 본부명 입력 (예: 기타, 외주업체)"
                className="flex-1 max-w-sm bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block p-2.5"
                disabled={isAddingCategory}
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || isAddingCategory}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
                본부 추가
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold w-1/2">원천 매장명 (POS 기준)</th>
                    <th className="px-6 py-4 font-semibold w-1/2">소속 본부 (대시보드 표시 카테고리)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map((mapping) => (
                    <tr key={mapping.id || mapping.storeName} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700">{mapping.storeName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <select
                            value={mapping.category}
                            onChange={(e) => handleCategoryChange(mapping.id!, e.target.value as Category)}
                            disabled={savingId === mapping.id}
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block w-full p-2.5 max-w-[200px]"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          {savingId === mapping.id && (
                            <span className="text-xs text-brand-mint animate-pulse flex items-center gap-1">
                              <Save size={14} /> 저장 중...
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: 객실 세그먼트 매핑 (?mode=ROOM_SEGMENT) */}
      {activeTab === 'ROOM_SEGMENT' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center text-sm text-emerald-900">
            <div className="flex items-center gap-3">
              <Hotel size={20} className="shrink-0 text-emerald-600" />
              <div>
                <strong>[REQ-V5-20260726-01] 객실 세그먼트 매핑 엔진 (?mode=ROOM_SEGMENT)</strong>
                <p className="text-xs text-emerald-700 mt-0.5">
                  원천 객실 정산의 미분류 요금제(삼성디스플레이, 네이버휴양소, OTA 프로모션 코드 등)를 MICE, OTA, 자사채널, 법인, 분양회원 세그먼트로 배정하면 즉시 ETL 재구동 후 대시보드가 리프레시됩니다.
                </p>
              </div>
            </div>
            <button
              onClick={fetchRoomSegmentMapping}
              disabled={roomSegmentLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} className={roomSegmentLoading ? 'animate-spin' : ''} /> 새로고침
            </button>
          </div>

          {/* Unmapped Rate Types Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                미분류 객실 요금제 (Unmapped Rate Types)
              </h2>
              <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full font-bold">
                {unmappedItems.length}개 요금제 미분류 보관 중
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">원천 테이블 / 출처</th>
                    <th className="px-6 py-3 font-semibold">원천 요금제 / 상품명 (Rate Type)</th>
                    <th className="px-6 py-3 font-semibold text-right">정식 세그먼트 지정 (Drag/Dropdown)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unmappedItems.length > 0 ? (
                    unmappedItems.map((item, idx) => {
                      const itemKey = `${item.sourceName || 'src'}_${item.productName}`;
                      const isSaving = savingItemKey === itemKey;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                            {item.sourceName || 'raw_객실_정산'}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-800">
                            {item.productName}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) handleRoomSegmentSave(item, e.target.value);
                                }}
                                disabled={isSaving}
                                className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-2 font-semibold"
                              >
                                <option value="" disabled>-- 세그먼트 선택 --</option>
                                {bins.map(bin => (
                                  <option key={bin} value={bin}>{bin}</option>
                                ))}
                              </select>
                              {isSaving && (
                                <span className="text-xs text-emerald-600 animate-pulse font-medium">저장 중...</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-medium">
                        미분류된 객실 요금제가 없습니다. (100% 매핑 완료!)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mapped Rate Types Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                완료된 객실 세그먼트 매핑 목록 ({mappedItems.length}개)
              </h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">원천 요금제 (Rate Type)</th>
                    <th className="px-6 py-3 font-semibold">배정된 정식 세그먼트</th>
                    <th className="px-6 py-3 font-semibold text-right">변경</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedItems.map((item, idx) => {
                    const itemKey = `mapped_${item.id || idx}`;
                    const isSaving = savingItemKey === itemKey;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{item.productName}</td>
                        <td className="px-6 py-3">
                          <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full text-xs">
                            {item.subGroupName}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <select
                            value={item.subGroupName}
                            onChange={(e) => handleRoomSegmentSave(item, e.target.value)}
                            disabled={isSaving}
                            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg p-1.5 font-medium"
                          >
                            {bins.map(bin => (
                              <option key={bin} value={bin}>{bin}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
