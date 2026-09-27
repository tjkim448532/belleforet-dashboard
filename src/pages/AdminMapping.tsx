import { useState, useEffect, useMemo } from 'react';
import { useMapping } from '../contexts/MappingContext';
import { AlertCircle, Layers, Hotel, RefreshCw, Sparkles, Zap, LayoutGrid, List } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

interface RoomSegmentItem {
  id?: number;
  categoryCode?: string;
  sourceName?: string;
  productName: string;
  subGroupName: string;
}

// AI Smart Recommendation: SSOT 무결성 원칙 준수 (프론트엔드 임의 정규표현식 및 가짜 신뢰도 생성 전면 철거)
// 오타/매핑 추론은 데이터 엔지니어링의 영역이며, 프론트엔드는 임의 매핑을 배제하고 관리자가 직접 검토/배정하도록 보존함
const getAiRecommendation = (_productName: string): { segment: string; confidence: number } => {
  return { segment: '미분류', confidence: 0 };
};

export default function AdminMapping() {
  const { mappings, loading } = useMapping();
  const [activeTab, setActiveTab] = useState<'FACILITY' | 'ROOM_SEGMENT'>('FACILITY');

  // V6 Room Segment State
  const [roomSegmentLoading, setRoomSegmentLoading] = useState(false);
  const [unmappedItems, setUnmappedItems] = useState<RoomSegmentItem[]>([]);
  const [mappedItems, setMappedItems] = useState<RoomSegmentItem[]>([]);
  const [bins, setBins] = useState<string[]>(['MICE', 'OTA', '자사채널', '법인', '분양회원', '제휴&기타']);
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  
  // Bulk Approval State
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchRoomSegmentMapping = async () => {
    setRoomSegmentLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      const res = await secureFetcher(`${API_BASE}/api/v6/admin/mapping/facility-groups?mode=ROOM_SEGMENT`);
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

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      await secureFetcher(`${API_BASE}/api/v6/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            {
              productName: item.productName,
              subGroupName: newSegment
            }
          ],
          rebuildEtl: true
        })
      });
      await fetchRoomSegmentMapping();
    } catch (err) {
      console.error('Failed to update room segment mapping:', err);
      alert('세그먼트 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingItemKey(null);
    }
  };

  // 유효한 AI 스마트 추천 항목 (미분류 제외 및 확신도 90% 이상)
  const validAiRecommendations = useMemo(() => {
    return unmappedItems
      .map(item => ({ item, rec: getAiRecommendation(item.productName) }))
      .filter(({ rec }) => rec.segment !== '미분류' && rec.confidence >= 90);
  }, [unmappedItems]);

  // 1-Click AI Recommendation Bulk Confirm Handler
  const handleBulkConfirmAiRecommendations = async () => {
    if (validAiRecommendations.length === 0) {
      alert('AI 스마트 추천으로 자동 분류 가능한 항목이 없습니다. 수동으로 배정해 주세요.');
      return;
    }

    const unclassifiableCount = unmappedItems.length - validAiRecommendations.length;
    const confirmMessage = unclassifiableCount > 0
      ? `총 ${unmappedItems.length}개의 미분류 요금제 중 명확히 분류 가능한 ${validAiRecommendations.length}개 항목만 일괄 승인 배정하시겠습니까?\n\n(추천 근거가 없는 ${unclassifiableCount}개 항목은 안전하게 '미분류'로 보존됩니다.)`
      : `총 ${validAiRecommendations.length}개의 요금제를 AI 스마트 추천 세그먼트로 일괄 승인 배정하시겠습니까?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkSaving(true);
    setBulkProgress({ current: 0, total: validAiRecommendations.length });
    const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

    try {
      const updates = validAiRecommendations.map(({ item, rec }) => ({
        productName: item.productName,
        subGroupName: rec.segment
      }));

      await secureFetcher(`${API_BASE}/api/v6/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          rebuildEtl: true
        })
      });
      
      setBulkProgress({ current: validAiRecommendations.length, total: validAiRecommendations.length });
      await fetchRoomSegmentMapping();
    } catch (err) {
      console.error('Failed bulk confirmation:', err);
      alert('일괄 승인 중 오류가 발생했습니다.');
    } finally {
      setBulkSaving(false);
      setBulkProgress(null);
    }
  };

  // Group unmapped items by AI recommended segment for Kanban Column rendering
  const kanbanColumns = useMemo(() => {
    const cols: Record<string, RoomSegmentItem[]> = {};
    bins.forEach(b => { cols[b] = []; });
    cols['UNMAPPED'] = [];

    unmappedItems.forEach(item => {
      const rec = getAiRecommendation(item.productName);
      if (rec.segment !== '미분류' && cols[rec.segment]) {
        cols[rec.segment].push(item);
      } else {
        cols['UNMAPPED'].push(item);
      }
    });

    return cols;
  }, [unmappedItems, bins]);

  const allKanbanBins = useMemo(() => {
    const list = [...bins];
    if (kanbanColumns['UNMAPPED'] && kanbanColumns['UNMAPPED'].length > 0 && !list.includes('UNMAPPED')) {
      list.push('UNMAPPED');
    }
    return list;
  }, [bins, kanbanColumns]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-800 tracking-tight break-keep whitespace-nowrap">V6 통합 매핑 관리 센터</h1>
          <p className="text-slate-500 mt-1 text-sm">
            POS 매장 및 원천 객실 요금제(Rate Type)를 정식 본부 및 세그먼트로 동적 매핑합니다.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl whitespace-nowrap shrink-0">
          <button
            onClick={() => setActiveTab('FACILITY')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'FACILITY' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> 매장/시설 매핑
          </button>
          <button
            onClick={() => setActiveTab('ROOM_SEGMENT')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'ROOM_SEGMENT' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hotel size={14} /> 객실 세그먼트 매핑 (?mode=ROOM_SEGMENT)
          </button>
        </div>
      </div>


      {/* TAB 1: POS 매장/시설 매핑 */}
      {activeTab === 'FACILITY' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">POS 매장 소속 본부 현황 (조회 전용)</span>
              <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">총 {mappings.length}개 매장 연동 중</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold w-1/2 whitespace-nowrap">원천 매장명 (POS 기준)</th>
                    <th className="px-6 py-4 font-semibold w-1/2 whitespace-nowrap">소속 본부 (대시보드 표시 카테고리)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map((mapping) => (
                    <tr key={mapping.id || mapping.storeName} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{mapping.storeName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-sm inline-block">
                          {mapping.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: 객실 세그먼트 스마트 매핑 (?mode=ROOM_SEGMENT) */}
      {activeTab === 'ROOM_SEGMENT' && (
        <div className="space-y-6">
          <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles size={16} /> AI Smart Recommendation Engine
                </div>
                <h2 className="text-xl font-bold tracking-tight">스마트 객실 세그먼트 매핑 센터</h2>
                <p className="text-emerald-200/80 text-xs mt-1 max-w-2xl">
                  AI가 키워드를 분석하여 140개 미분류 요금제의 카테고리를 자동 제안합니다. 한 번의 클릭으로 일괄 승인 확정하거나, 칸반 카드에서 눈으로 보고 확인하실 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkConfirmAiRecommendations}
                  disabled={validAiRecommendations.length === 0 || bulkSaving}
                  className="px-4 py-2.5 bg-brand-mint hover:bg-emerald-400 text-slate-900 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap size={16} className="text-slate-900 fill-slate-900" />
                  {bulkSaving ? `승인 처리 중 (${bulkProgress?.current}/${bulkProgress?.total})...` : validAiRecommendations.length > 0 ? `AI 추천 ${validAiRecommendations.length}개 1클릭 일괄 승인` : `자동 분류 가능한 AI 추천 항목 없음`}
                </button>
                <button
                  onClick={fetchRoomSegmentMapping}
                  disabled={roomSegmentLoading}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="새로고침"
                >
                  <RefreshCw size={16} className={roomSegmentLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {bulkProgress && (
              <div className="mt-4 w-full bg-emerald-950/60 rounded-full h-2 overflow-hidden border border-emerald-700/50">
                <div 
                  className="bg-brand-mint h-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* View Mode Toggle Bar */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              <span>미분류 보유 항목: <strong className="text-amber-600">{unmappedItems.length}개</strong></span>
              <span className="text-slate-300">|</span>
              <span>매핑 완료 항목: <strong className="text-emerald-600">{mappedItems.length}개</strong></span>
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'KANBAN'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} /> 스마트 칸반 보드
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List size={14} /> 테이블 목록 보기
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: SMART KANBAN BOARD */}
          {viewMode === 'KANBAN' && (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
              {allKanbanBins.map((bin) => {
                const isUnmappedBin = bin === 'UNMAPPED';
                const columnItems = kanbanColumns[bin] || [];

                return (
                  <div key={bin} className={`rounded-2xl p-4 border flex flex-col justify-between min-w-[200px] min-h-[420px] ${
                    isUnmappedBin ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                        <span className={`font-extrabold text-sm flex items-center gap-1.5 ${
                          isUnmappedBin ? 'text-amber-800' : 'text-slate-800'
                        }`}>
                          {isUnmappedBin ? <AlertCircle size={16} className="text-amber-600" /> : <Hotel size={16} className="text-emerald-600" />}
                          {isUnmappedBin ? '미분류 대기' : bin}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isUnmappedBin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {columnItems.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {columnItems.length > 0 ? (
                          columnItems.map((item, idx) => {
                            const rec = getAiRecommendation(item.productName);
                            const itemKey = `${item.sourceName || 'src'}_${item.productName}`;
                            const isSaving = savingItemKey === itemKey;

                            return (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all group">
                                <div className="text-xs font-bold text-slate-800 mb-1 leading-snug break-all">
                                  {item.productName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mb-2">
                                  {item.sourceName || 'raw_객실_정산'}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
                                  {rec.segment !== '미분류' ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-100 flex items-center gap-0.5 truncate">
                                      <Sparkles size={10} /> AI: {rec.segment}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium border border-amber-200 flex items-center gap-0.5 truncate">
                                      <AlertCircle size={10} /> 수동 배정
                                    </span>
                                  )}

                                  {!isUnmappedBin ? (
                                    <button
                                      onClick={() => handleRoomSegmentSave(item, bin)}
                                      disabled={isSaving}
                                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition-all shadow-xs shrink-0"
                                    >
                                      {isSaving ? '저장...' : '승인'}
                                    </button>
                                  ) : (
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) handleRoomSegmentSave(item, e.target.value);
                                      }}
                                      disabled={isSaving}
                                      className="bg-white border border-slate-300 text-slate-700 text-[10px] rounded p-1 font-semibold max-w-[90px]"
                                      defaultValue=""
                                    >
                                      <option value="" disabled>배정...</option>
                                      {bins.filter(b => b !== 'UNMAPPED').map(b => (
                                        <option key={b} value={b}>{b}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 text-xs text-slate-400 font-medium">
                            {isUnmappedBin ? '미분류 항목 없음' : '추천 항목 없음'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: TABLE LIST */}
          {viewMode === 'TABLE' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-600" />
                  미분류 객실 마켓타입 (Unmapped Market Types)
                </h2>
                <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full font-bold">
                  {unmappedItems.length}개 마켓타입 미분류 보관 중
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold whitespace-nowrap">원천 테이블 / 출처</th>
                      <th className="px-6 py-3 font-semibold whitespace-nowrap">원천 마켓타입 / 상품명 (Market Type)</th>
                      <th className="px-6 py-3 font-semibold text-center whitespace-nowrap">AI 추천 세그먼트</th>
                      <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">정식 세그먼트 지정 및 승인</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unmappedItems.length > 0 ? (
                      unmappedItems.map((item, idx) => {
                        const rec = getAiRecommendation(item.productName);
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
                            <td className="px-6 py-3.5 text-center">
                              {rec.segment !== '미분류' && rec.confidence >= 90 ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                                  <Sparkles size={12} /> {rec.segment} ({rec.confidence}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                                  <AlertCircle size={12} /> 추천 없음 (수동 지정)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  defaultValue={rec.segment !== '미분류' ? rec.segment : ''}
                                  onChange={(e) => {
                                    if (e.target.value) handleRoomSegmentSave(item, e.target.value);
                                  }}
                                  disabled={isSaving}
                                  className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-2 font-semibold"
                                >
                                  <option value="" disabled>세그먼트 선택...</option>
                                  {bins.filter(b => b !== 'UNMAPPED').map(bin => (
                                    <option key={bin} value={bin}>{bin}</option>
                                  ))}
                                </select>
                                {rec.segment !== '미분류' && (
                                  <button
                                    onClick={() => handleRoomSegmentSave(item, rec.segment)}
                                    disabled={isSaving}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                  >
                                    {isSaving ? '저장 중...' : '승인'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">
                          미분류된 객실 요금제가 없습니다. (100% 매핑 완료!)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mapped Rate Types Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                완료된 객실 세그먼트 매핑 목록 ({mappedItems.length}개)
              </h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-[500px]">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">원천 마켓타입 (Market Type)</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">배정된 정식 세그먼트</th>
                    <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">변경</th>
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
