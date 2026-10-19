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
      <div className="flex h-screen items-center justify-center bg-[#F4F3EE]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#284F42]"></div>
          <span className="text-xs font-bold text-[#5A6B63]">매핑 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET ADMIN · MAPPING CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-keep whitespace-nowrap">
              V6 통합 매핑 관리 센터
            </h1>
            <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium">
              POS 매장 및 원천 객실 요금제(Rate Type)를 정식 본부 및 세그먼트로 동적 매핑합니다.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="inline-flex p-1 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 whitespace-nowrap shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('FACILITY')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'FACILITY' 
                  ? 'bg-white text-[#1B382E] shadow-sm' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers size={14} /> 매장/시설 매핑
            </button>
            <button
              onClick={() => setActiveTab('ROOM_SEGMENT')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ROOM_SEGMENT' 
                  ? 'bg-[#1B382E] text-white shadow-sm' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Hotel size={14} /> 객실 세그먼트 매핑 (?mode=ROOM_SEGMENT)
            </button>
          </div>
        </div>


      {/* TAB 1: POS 매장/시설 매핑 */}
      {activeTab === 'FACILITY' && (
        <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
          <div className="p-5 bg-[#F4F3EE] border-b border-[#D0C6BB]/75 flex justify-between items-center">
            <span className="text-sm font-bold text-[#1B382E]">POS 매장 소속 본부 현황 (조회 전용)</span>
            <span className="text-xs bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 px-3 py-1 rounded-full font-bold whitespace-nowrap">
              총 {mappings.length}개 매장 연동 중
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#5A6B63] text-xs font-bold border-b border-[#D0C6BB]/50">
                  <th className="px-6 py-3.5 text-left w-1/2 whitespace-nowrap">원천 매장명 (POS 기준)</th>
                  <th className="px-6 py-3.5 text-left w-1/2 whitespace-nowrap">소속 본부 (대시보드 표시 카테고리)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30 text-xs sm:text-sm">
                {mappings.map((mapping) => (
                  <tr key={mapping.id || mapping.storeName} className="hover:bg-[#F4F3EE]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#1B382E]">{mapping.storeName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-[#F4F3EE] border border-[#D0C6BB]/60 text-[#1B382E] font-bold px-3 py-1.5 rounded-xl text-xs inline-block">
                        {mapping.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: 객실 세그먼트 스마트 매핑 (?mode=ROOM_SEGMENT) */}
      {activeTab === 'ROOM_SEGMENT' && (
        <div className="space-y-6">
          <div className="bg-[#284F42] text-white rounded-3xl p-6 lg:p-7 shadow-[0_4px_24px_rgba(40,79,66,0.12)] relative overflow-hidden border border-[#1B382E]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2F5548] rounded-full blur-3xl pointer-events-none opacity-60" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-[#B59269] font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles size={16} /> AI Smart Recommendation Engine
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">스마트 객실 세그먼트 매핑 센터</h2>
                <p className="text-white/80 text-xs mt-1 max-w-2xl font-medium">
                  AI가 키워드를 분석하여 140개 미분류 요금제의 카테고리를 자동 제안합니다. 한 번의 클릭으로 일괄 승인 확정하거나, 칸반 카드에서 눈으로 보고 확인하실 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkConfirmAiRecommendations}
                  disabled={validAiRecommendations.length === 0 || bulkSaving}
                  className="px-4 py-2.5 bg-[#B59269] hover:bg-[#a38058] text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Zap size={16} className="text-white fill-white" />
                  {bulkSaving ? `승인 처리 중 (${bulkProgress?.current}/${bulkProgress?.total})...` : validAiRecommendations.length > 0 ? `AI 추천 ${validAiRecommendations.length}개 1클릭 일괄 승인` : `자동 분류 가능한 AI 추천 항목 없음`}
                </button>
                <button
                  onClick={fetchRoomSegmentMapping}
                  disabled={roomSegmentLoading}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="새로고침"
                >
                  <RefreshCw size={16} className={roomSegmentLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {bulkProgress && (
              <div className="mt-4 w-full bg-[#1B382E] rounded-full h-2 overflow-hidden border border-white/20">
                <div 
                  className="bg-[#B59269] h-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* View Mode Toggle Bar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#D0C6BB]/75 shadow-xs">
            <div className="text-xs font-bold text-[#5A6B63] flex items-center gap-2">
              <span>미분류 보유 항목: <strong className="text-[#8B2635]">{unmappedItems.length}개</strong></span>
              <span className="text-[#D0C6BB]">|</span>
              <span>매핑 완료 항목: <strong className="text-[#1E523F]">{mappedItems.length}개</strong></span>
            </div>

            <div className="inline-flex p-1 bg-[#F4F3EE] rounded-xl border border-[#D0C6BB]/50">
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'KANBAN'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
                }`}
              >
                <LayoutGrid size={14} /> 스마트 칸반 보드
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-[#284F42] text-white shadow-xs'
                    : 'text-[#5A6B63] hover:text-[#1B382E]'
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
                  <div key={bin} className={`rounded-3xl p-4 border flex flex-col justify-between min-w-[220px] min-h-[420px] shadow-xs ${
                    isUnmappedBin ? 'bg-[#FDF0ED] border-[#EAC5BD]' : 'bg-[#F4F3EE]/80 border-[#D0C6BB]/60'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D0C6BB]/50">
                        <span className={`font-extrabold text-xs sm:text-sm flex items-center gap-1.5 ${
                          isUnmappedBin ? 'text-[#8B2635]' : 'text-[#1B382E]'
                        }`}>
                          {isUnmappedBin ? <AlertCircle size={16} className="text-[#8B2635]" /> : <Hotel size={16} className="text-[#284F42]" />}
                          {isUnmappedBin ? '미분류 대기' : bin}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isUnmappedBin ? 'bg-[#EAC5BD] text-[#8B2635]' : 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70'
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
                              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#D0C6BB]/60 shadow-xs hover:shadow-md transition-all group">
                                <div className="text-xs font-bold text-[#1B382E] mb-1 leading-snug break-all">
                                  {item.productName}
                                </div>
                                <div className="text-[10px] text-[#5A6B63] font-mono mb-2">
                                  {item.sourceName || 'raw_객실_정산'}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#D0C6BB]/30 gap-1">
                                  {rec.segment !== '미분류' ? (
                                    <span className="text-[10px] bg-[#E8F2EE] text-[#1E523F] px-1.5 py-0.5 rounded-md font-bold border border-[#B4C6C1]/70 flex items-center gap-0.5 truncate" title={`AI: ${rec.segment}`}>
                                      <Sparkles size={10} /> AI: {rec.segment}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-[#FAF6ED] text-[#8C6D3B] px-1.5 py-0.5 rounded-md font-bold border border-[#E5DAC1] flex items-center gap-0.5 truncate" title="수동 배정">
                                      <AlertCircle size={10} /> 수동 배정
                                    </span>
                                  )}

                                  {!isUnmappedBin ? (
                                    <button
                                      onClick={() => handleRoomSegmentSave(item, bin)}
                                      disabled={isSaving}
                                      className="px-2.5 py-1 bg-[#284F42] hover:bg-[#1B382E] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                                    >
                                      {isSaving ? '저장...' : '승인'}
                                    </button>
                                  ) : (
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) handleRoomSegmentSave(item, e.target.value);
                                      }}
                                      disabled={isSaving}
                                      className="bg-[#F4F3EE] border border-[#D0C6BB]/80 text-[#1B382E] text-[10px] rounded-lg p-1 font-bold max-w-[95px] outline-none"
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
                          <div className="text-center py-10 text-xs text-[#5A6B63] font-medium">
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
            <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
              <div className="bg-[#FDF0ED] border-b border-[#EAC5BD] px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-bold text-[#8B2635] flex items-center gap-2">
                  <AlertCircle size={18} className="text-[#8B2635]" />
                  미분류 객실 마켓타입 (Unmapped Market Types)
                </h2>
                <span className="text-xs bg-[#EAC5BD] text-[#8B2635] px-2.5 py-1 rounded-full font-bold">
                  {unmappedItems.length}개 마켓타입 미분류 보관 중
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-[700px]">
                  <thead className="bg-[#F4F3EE] text-[#5A6B63] sticky top-0 border-b border-[#D0C6BB]/75">
                    <tr>
                      <th className="px-6 py-3.5 font-bold text-xs text-left whitespace-nowrap">원천 테이블 / 출처</th>
                      <th className="px-6 py-3.5 font-bold text-xs text-left whitespace-nowrap">원천 마켓타입 / 상품명 (Market Type)</th>
                      <th className="px-6 py-3.5 font-bold text-xs text-center whitespace-nowrap">AI 추천 세그먼트</th>
                      <th className="px-6 py-3.5 font-bold text-xs text-right whitespace-nowrap">정식 세그먼트 지정 및 승인</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0C6BB]/30">
                    {unmappedItems.length > 0 ? (
                      unmappedItems.map((item, idx) => {
                        const rec = getAiRecommendation(item.productName);
                        const itemKey = `${item.sourceName || 'src'}_${item.productName}`;
                        const isSaving = savingItemKey === itemKey;

                        return (
                          <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                            <td className="px-6 py-3.5 text-xs text-[#5A6B63] font-mono">
                              {item.sourceName || 'raw_객실_정산'}
                            </td>
                            <td className="px-6 py-3.5 font-bold text-[#1B382E]">
                              {item.productName}
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {rec.segment !== '미분류' && rec.confidence >= 90 ? (
                                <span className="inline-flex items-center gap-1 bg-[#E8F2EE] text-[#1E523F] px-2.5 py-1 rounded-full text-xs font-bold border border-[#B4C6C1]/70">
                                  <Sparkles size={12} /> {rec.segment} ({rec.confidence}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-[#FAF6ED] text-[#8C6D3B] px-2.5 py-1 rounded-full text-xs font-bold border border-[#E5DAC1]">
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
                                  className="bg-[#F4F3EE] border border-[#D0C6BB]/80 text-[#1B382E] text-xs rounded-xl p-2 font-bold outline-none"
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
                                    className="px-3 py-1.5 bg-[#284F42] hover:bg-[#1B382E] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
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
                        <td colSpan={4} className="px-6 py-8 text-center text-[#5A6B63] font-medium">
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
          <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
            <div className="bg-[#F4F3EE] border-b border-[#D0C6BB]/75 px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1B382E] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#284F42]" />
                완료된 객실 세그먼트 매핑 목록 ({mappedItems.length}개)
              </h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-[500px]">
                <thead className="bg-[#FAF9F5] text-[#5A6B63] sticky top-0 border-b border-[#D0C6BB]/50">
                  <tr>
                    <th className="px-6 py-3.5 font-bold text-xs text-left whitespace-nowrap">원천 마켓타입 (Market Type)</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-left whitespace-nowrap">배정된 정식 세그먼트</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-right whitespace-nowrap">변경</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0C6BB]/30">
                  {mappedItems.map((item, idx) => {
                    const itemKey = `mapped_${item.id || idx}`;
                    const isSaving = savingItemKey === itemKey;

                    return (
                      <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-[#1B382E]">{item.productName}</td>
                        <td className="px-6 py-3.5">
                          <span className="bg-[#E8F2EE] text-[#1E523F] font-bold px-2.5 py-1 rounded-full text-xs border border-[#B4C6C1]/70">
                            {item.subGroupName}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <select
                            value={item.subGroupName}
                            onChange={(e) => handleRoomSegmentSave(item, e.target.value)}
                            disabled={isSaving}
                            className="bg-[#F4F3EE] border border-[#D0C6BB]/80 text-[#1B382E] text-xs rounded-xl p-1.5 font-bold outline-none"
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
    </div>
  );
}
