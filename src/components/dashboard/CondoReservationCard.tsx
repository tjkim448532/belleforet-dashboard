import { useState, useEffect } from 'react';
import { Building2, Users, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';
import { parseNum } from '../../lib/dataTransformers';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://belleforet-data.vercel.app';

interface RoomTypeStat {
  roomType: string;
  roomsSold: number;
  capacity: number;
  rate: number;
}

interface GroupBookingItem {
  channelName: string;
  corporateName: string;
  category: string;
  totalRooms: number;
  breakdown: string[];
}

interface CondoReservationData {
  targetDate: string;
  totalRooms: number;
  totalCapacity: number;
  physicalOccupancyRate: number | null;
  physicalOccupiedUnits: number | null;
  contractOccupancyRate: number | null;
  byType: RoomTypeStat[];
  groups: GroupBookingItem[];
  totalGroupRooms: number;
  isBackendMartPending: boolean;
}

interface CondoReservationCardProps {
  currentDate: string; // e.g. "2026-10-10"
}

export default function CondoReservationCard({ currentDate }: CondoReservationCardProps) {
  // 모드: 기본 'TODAY' (당일 확정 실측) vs 'NEXT_DAY' (익일 D+1 체크인 예약)
  const [viewMode, setViewMode] = useState<'TODAY' | 'NEXT_DAY'>('TODAY');
  const [loading, setLoading] = useState(false);
  const [resData, setResData] = useState<CondoReservationData | null>(null);

  // 날짜 계산 헬퍼: D+1 익일 계산
  const getNextDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return dateStr;
    }
  };

  // 한글 요일 계산 헬퍼
  const getDayOfWeek = (dateStr: string) => {
    try {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const d = new Date(dateStr + 'T00:00:00');
      return days[d.getDay()];
    } catch {
      return '';
    }
  };

  const nextDateStr = getNextDateStr(currentDate);
  const activeDate = viewMode === 'NEXT_DAY' ? nextDateStr : currentDate;
  const activeDayOfWeek = getDayOfWeek(activeDate);

  // 데이터 로드
  useEffect(() => {
    let isCancelled = false;

    async function fetchReservationData() {
      setLoading(true);
      try {
        // 1. 신규 전용 콘도 예약 API 우선 조회 시도 (Ticket 22 배포 시 SSOT)
        const dedicatedRes = await secureFetcher(`${API_BASE}/api/v6/dashboard/condo-reservations?date=${activeDate}`).catch(() => null);

        if (!isCancelled && dedicatedRes && dedicatedRes.success && dedicatedRes.summary) {
          const s = dedicatedRes.summary;
          setResData({
            targetDate: activeDate,
            totalRooms: parseNum(s.totalReservedRooms || 0),
            totalCapacity: parseNum(s.totalCapacity || s.totalRoomCap || 0),
            physicalOccupancyRate: s.occupancyRate !== undefined ? Number(s.occupancyRate) : null,
            physicalOccupiedUnits: parseNum(s.physicalOccupiedUnits || s.totalReservedRooms || 0),
            contractOccupancyRate: s.contractOccupancyRate !== undefined ? Number(s.contractOccupancyRate) : null,
            byType: (dedicatedRes.byRoomType || []).map((t: any) => ({
              roomType: t.roomType,
              roomsSold: parseNum(t.reservedRooms || t.roomsSold || 0),
              capacity: parseNum(t.capacity || t.fixedCapacity || 0),
              rate: Number(t.rate || 0)
            })),
            groups: (dedicatedRes.groups || []).map((g: any) => ({
              channelName: g.groupName || g.channel || '단체',
              corporateName: g.corporateName || g.groupName || '단체',
              category: g.categoryName || '단체/기업',
              totalRooms: parseNum(g.totalRooms || 0),
              breakdown: g.roomTypeBreakdown ? [g.roomTypeBreakdown] : []
            })),
            totalGroupRooms: parseNum(s.totalGroupRooms || 0),
            isBackendMartPending: false
          });
          setLoading(false);
          return;
        }

        // 2. 표준 V6 마트 엔드포인트 병렬 조회
        // - revenue-summary: 계약 판매 객실 및 평수별 판매 현황
        // - revenue-by-org: 물리 실운영 163실 가동 및 실점유율 93.1% (SSOT)
        // - corporate-group-sales: 실제 단체/기업 고객 공식 명칭 및 배정 객실 리스트
        const [sumRes, orgRes, corpRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?date=${activeDate}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-by-org?date=${activeDate}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?date=${activeDate}`).catch(() => null)
        ]);

        if (isCancelled) return;

        // 점유율 1: 물리 실가동 점유율 (163실 / 175실 = 93.1%) - 상단 주요 지표와 100% 일치
        const physicalMasterMetrics = orgRes?.data?.physicalRoomMaster?.metrics || orgRes?.physicalRoomMaster?.metrics;
        const physicalOccupancyRate = physicalMasterMetrics?.physicalOccupancyRate !== undefined 
          ? Number(physicalMasterMetrics.physicalOccupancyRate) 
          : (sumRes?.summary?.physicalOccRate !== undefined ? Number(sumRes.summary.physicalOccRate) : null);
        const physicalOccupiedUnits = parseNum(physicalMasterMetrics?.physicalOccupiedUnits || sumRes?.summary?.physicalOccupiedUnits || 0);

        // 점유율 2: 계약 판매 점유율 (122실 / 175실 = 69.7%)
        const totalRooms = parseNum(sumRes?.summary?.totalRooms || sumRes?.lodgingStats?.roomsSold || 0);
        const contractOccRate = sumRes?.lodgingStats?.physicalOccRate ?? sumRes?.summary?.totalOcc ?? null;

        // 평수별 현황
        const rawTypes = sumRes?.roomSummaryByType || [];
        const byType: RoomTypeStat[] = rawTypes.map((t: any) => ({
          roomType: t.roomType,
          roomsSold: parseNum(t.roomsSold || 0),
          capacity: parseNum(t.fixedCapacity || t.capacity || 0),
          rate: Number(t.fixedOccupancyRate ?? t.rate ?? 0)
        }));

        // 실제 단체/기업 고객 명단 파싱 (corporate-group-sales의 groups 원장)
        const rawCorpGroups = Array.isArray(corpRes?.groups) ? corpRes.groups : [];
        const corpMap = new Map<string, GroupBookingItem>();

        rawCorpGroups.forEach((g: any) => {
          const rawName = String(g.corporateName || g.groupName || '단체').trim();
          // 끝자리 _26 등 연도 태그 정리 (표시용)
          const cleanName = rawName.replace(/_26$/, '');
          const rooms = parseNum(g.spendingBreakdown?.roomsCount || 1);
          const types: string[] = Array.isArray(g.spendingBreakdown?.roomTypesUsed) ? g.spendingBreakdown.roomTypesUsed : [];

          if (!corpMap.has(cleanName)) {
            corpMap.set(cleanName, {
              channelName: cleanName,
              corporateName: rawName,
              category: g.categoryName || '기업 휴양소/세미나',
              totalRooms: 0,
              breakdown: []
            });
          }
          const item = corpMap.get(cleanName)!;
          item.totalRooms += rooms;
          if (types.length > 0) {
            item.breakdown.push(...types);
          }
        });

        const groups = Array.from(corpMap.values());
        let totalGroupRooms = 0;
        groups.forEach(g => {
          totalGroupRooms += g.totalRooms;
        });

        // 미래 일자 데이터가 0건인 경우 (PMS 예약 파이프라인 동기화 대기)
        const isBackendMartPending = totalRooms === 0 && byType.length === 0;

        setResData({
          targetDate: activeDate,
          totalRooms,
          totalCapacity: parseNum(sumRes?.lodgingStats?.totalCapacity || sumRes?.summary?.totalRoomCap || 0),
          physicalOccupancyRate,
          physicalOccupiedUnits,
          contractOccupancyRate: contractOccRate !== null ? Number(contractOccRate) : null,
          byType,
          groups,
          totalGroupRooms,
          isBackendMartPending
        });

      } catch (err) {
        console.error('Failed to fetch condo reservation data:', err);
        if (!isCancelled) {
          setResData(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchReservationData();

    return () => {
      isCancelled = true;
    };
  }, [activeDate]);

  // 단체 기업 예약의 전체 객실 대비 비중 (%)
  const groupSharePct = (resData?.totalRooms && resData.totalRooms > 0 && resData.totalGroupRooms) 
    ? ((resData.totalGroupRooms / resData.totalRooms) * 100).toFixed(1)
    : '0.0';

  // 대표 점유율 (상단 주요 지표 93.1%와 일치)
  const displayOccRate = resData?.physicalOccupancyRate ?? resData?.contractOccupancyRate;

  return (
    <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default shadow-xs">
      <div>
        {/* Header & Date Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="text-slate-800 font-bold text-base flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            <span>콘도(객실) 예약 및 체크인 현황</span>
          </div>

          {/* Toggle: 오늘(당일) 체크인 vs 내일(익일 D+1) 예약 */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-[11px] font-bold shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('TODAY')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'TODAY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              오늘(당일) 체크인
            </button>
            <button
              type="button"
              onClick={() => setViewMode('NEXT_DAY')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'NEXT_DAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              내일(익일 D+1) 예약
            </button>
          </div>
        </div>

        {/* Date Context Badge */}
        <div className="flex items-center justify-between text-xs mb-3 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
            <Calendar size={13} className="text-indigo-600" />
            <span>{activeDate} ({activeDayOfWeek})</span>
            <span className="text-indigo-600 text-[10px] font-semibold bg-indigo-100/80 px-1.5 py-0.5 rounded-md">
              {viewMode === 'NEXT_DAY' ? '체크인 예정 고객' : '실측 체크인 고객'}
            </span>
          </div>
          <span className="text-[11px] text-indigo-700/80 font-medium hidden sm:inline">
            물리 고정 175실 기준
          </span>
        </div>

        {/* Top 3 KPI Badges - 실제 객실수 및 93.1% 점유율 정합성 보장 */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. 총 예약 / 입실 객실수 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">
              {viewMode === 'NEXT_DAY' ? '총 예약 객실' : '총 입실 객실'}
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-slate-400 font-bold">-</span>
              ) : (
                <>
                  {resData?.totalRooms ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-1">실</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              전체 {resData?.totalCapacity}실 가용
            </div>
          </div>

          {/* 2. 객실 점유율 (Occ) - 상단 주요 지표 93.1% 및 69.7% 정합성 동시 표기 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap flex items-center justify-between">
              <span>객실 점유율</span>
              {resData?.physicalOccupiedUnits && resData.physicalOccupiedUnits > 0 && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded-sm">
                  {resData.physicalOccupiedUnits}실 가동
                </span>
              )}
            </div>
            <div className="text-2xl lg:text-3xl font-black text-indigo-600 tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-slate-400 font-bold">-</span>
              ) : displayOccRate !== null && displayOccRate !== undefined ? (
                <>
                  {displayOccRate.toFixed(1)}
                  <span className="text-sm font-normal text-indigo-500">%</span>
                </>
              ) : (
                '-'
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
              {resData?.physicalOccupiedUnits && resData.physicalOccupiedUnits > 0
                ? `실가동 ${resData.physicalOccupiedUnits}실 (계약 ${resData.totalRooms}실)`
                : '175실 재고 기준 SSOT'}
            </div>
          </div>

          {/* 3. 단체 / 기업 예약 객실수 및 전체 대비 비중 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-purple-600 font-semibold mb-1 whitespace-nowrap flex items-center justify-between">
              <span>단체·기업 예약</span>
              {resData && resData.groups.length > 0 && (
                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-md font-bold border border-purple-100">
                  {resData.groups.length}개사
                </span>
              )}
            </div>
            <div className="text-2xl lg:text-3xl font-black text-purple-700 tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-slate-400 font-bold">-</span>
              ) : (
                <>
                  {resData?.totalGroupRooms ?? 0}
                  <span className="text-sm font-normal text-purple-500 ml-1">실</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-purple-700 font-bold mt-0.5 truncate">
              전체 대비 {groupSharePct}%
            </div>
          </div>
        </div>

        {/* 상태별 본문 영역 */}
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>콘도 예약 데이터를 불러오는 중입니다...</span>
          </div>
        ) : resData?.isBackendMartPending ? (
          // Fail-Stop / Zero-Mocking 안내: 백엔드 산하 PMS 미래 예약 원장 연동 대기 알림
          <div className="mt-3.5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>익일({activeDate}) 산하 PMS 예약 원장 동기화 대기 중 [Ticket 22]</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              현재 백엔드 데이터 마트는 <strong>당일 마감 정산 실적(10월 10일)</strong>까지 적재되어 있습니다. 익일 사전 예약 데이터는 산하 PMS 원장 연동 완료 후 자동 반영됩니다.
            </p>
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-700">당일 체크인 실측 현황을 즉시 확인하시겠습니까?</span>
              <button
                type="button"
                onClick={() => setViewMode('TODAY')}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition shadow-xs"
              >
                오늘 실측 현황 조회 ➔
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-3.5">
            {/* 평수별 실제 객실수 현황 (16평, 35평, 51평 - 실제 객실숫자 중심) */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <span>📐</span> 평수별 {viewMode === 'NEXT_DAY' ? '예약' : '입실'} 현황 (실제 객실수)
                </span>
                <span className="text-[11px] font-normal text-slate-400">실제 객실수 기준</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(resData?.byType || []).map((t, idx) => {
                  const pct = Math.min(100, Math.max(0, t.rate || 0));
                  return (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between">
                      <div className="text-xs font-bold text-slate-600 mb-1">{t.roomType}</div>
                      <div className="text-xl lg:text-2xl font-black text-slate-900 tabular-nums my-0.5">
                        {t.roomsSold} <span className="text-xs font-bold text-slate-500">실</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        가용 {t.capacity}실 중
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 mb-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        점유 {pct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 단체 기업예약: 실제 단체/기업 공식 명칭 및 배정 객실 리스트 */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5 text-purple-900">
                  <Users size={14} className="text-purple-600" />
                  <span>단체 / 기업 예약 실제 명단</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    총 {resData?.totalGroupRooms ?? 0}실 ({groupSharePct}% 비중)
                  </span>
                </div>
              </div>

              {resData?.groups && resData.groups.length > 0 ? (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {resData.groups.map((grp, gIdx) => {
                    const itemShare = (resData.totalRooms > 0)
                      ? ((grp.totalRooms / resData.totalRooms) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <div
                        key={gIdx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs shadow-2xs gap-2 hover:border-purple-200 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                            <span className="truncate text-sm font-extrabold">{grp.channelName}</span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-md font-semibold shrink-0 border border-purple-100">
                              비중 {itemShare}%
                            </span>
                          </div>
                          {grp.breakdown.length > 0 && (
                            <div className="text-[11px] text-slate-500 truncate mt-1 ml-3.5 font-medium">
                              {grp.breakdown.join(' · ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap shrink-0 pl-2">
                          <span className="text-base font-black text-purple-700">{grp.totalRooms}</span>
                          <span className="text-xs font-bold text-slate-500 ml-0.5">실</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-center text-xs text-slate-500">
                  <CheckCircle2 size={14} className="inline text-emerald-500 mr-1" />
                  <span>확정된 단체 예약이 없습니다. (전원 일반/개별 고객 예약)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Subtext */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
        <span>산하 PMS 확정 예약 및 실운영 객실 실시간 연동 (16평/35평/51평 & 법인 단체)</span>
      </div>
    </div>
  );
}
