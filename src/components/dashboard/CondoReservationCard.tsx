import { useState, useEffect } from 'react';
import { Building2, Users, Calendar, CheckCircle2, AlertCircle, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';
import { parseNum } from '../../lib/dataTransformers';
import { formatDate, getKSTNow } from '../../lib/dateUtils';

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
  occupancyRate: number | null;
  byType: RoomTypeStat[];
  groups: GroupBookingItem[];
  totalGroupRooms: number;
  isBackendMartPending: boolean;
  estimatedRevenue?: number | null;
  estimatedTotalRevenue?: number | null;
}

interface CondoReservationCardProps {
  currentDate: string; // e.g. "2026-10-10"
}

export default function CondoReservationCard({ currentDate }: CondoReservationCardProps) {
  const [loading, setLoading] = useState(false);
  const [resData, setResData] = useState<CondoReservationData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [forecastData, setForecastData] = useState<{
    roomRevenue: number | null;
    totalRevenue: number | null;
  } | null>(null);

  // 날짜 계산: 마감일(D-1) 기준 익일(D+1, 실제로는 오늘 도착) 체크인 날짜
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

  // 요일 계산 헬퍼
  const getDayOfWeek = (dateStr: string) => {
    try {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const d = new Date(dateStr + 'T00:00:00');
      return days[d.getDay()];
    } catch {
      return '';
    }
  };

  // 사용자가 요구한 타겟: "내일(실제로는 오늘) 예약자"
  const targetCheckInDate = getNextDateStr(currentDate);
  const targetDayOfWeek = getDayOfWeek(targetCheckInDate);

  // KST 오늘 기준 과거 마감 영업일 판별 (이미 체크인/퇴실 및 마감 완료된 일자)
  const todayStr = formatDate(getKSTNow());
  const isPastClosedDate = Boolean(targetCheckInDate && targetCheckInDate < todayStr);
  const isClosedHistory = isPastClosedDate && (!resData || resData.totalRooms === 0 || (resData.byType || []).length === 0);

  // 단체명 정제 헬퍼 (실제 기업/단체 이름 강조)
  const cleanGroupName = (raw: string) => {
    if (!raw) return '단체';
    let name = raw.trim();
    name = name.replace(/_26$/, '');
    name = name.replace(/^하드BL/, '');
    name = name.replace(/^\(\d+\)/, '');
    if (name === '농어촌공사') name = '한국농어촌공사';
    return name.trim();
  };

  // 익일(실제 오늘) 체크인 예약 원장 조회
  useEffect(() => {
    let isCancelled = false;

    async function loadReservationData() {
      setLoading(true);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/condo-reservations?date=${targetCheckInDate}`).catch(() => null);
        if (isCancelled) return;

        if (res && res.success && res.summary) {
          const s = res.summary;
          const parsedGroups: GroupBookingItem[] = (res.groups || []).map((g: any) => ({
            channelName: cleanGroupName(g.groupName || g.channel || '단체'),
            corporateName: g.groupName || '단체',
            category: g.channel || '기업영업(휴양소)',
            totalRooms: parseNum(g.totalRooms || 0),
            breakdown: g.roomTypeBreakdown ? [g.roomTypeBreakdown] : []
          }));

          const byType: RoomTypeStat[] = (res.byRoomType || [])
            .filter((t: any) => t.roomType !== '미지정')
            .map((t: any) => ({
              roomType: t.roomType,
              roomsSold: parseNum(t.reservedRooms || t.roomsSold || 0),
              capacity: parseNum(t.capacity || t.fixedCapacity || 0),
              rate: Number(t.rate || 0)
            }));

          setResData({
            targetDate: targetCheckInDate,
            totalRooms: parseNum(s.totalReservedRooms || 0),
            totalCapacity: parseNum(s.totalCapacity || 0),
            occupancyRate: s.occupancyRate !== undefined && s.occupancyRate !== null ? Number(s.occupancyRate) : null,
            byType,
            groups: parsedGroups,
            totalGroupRooms: parseNum(s.totalGroupRooms || 0),
            isBackendMartPending: false,
            estimatedRevenue: s.estimatedRevenue !== undefined && s.estimatedRevenue !== null ? parseNum(s.estimatedRevenue) : null,
            estimatedTotalRevenue: s.estimatedTotalRevenue !== undefined && s.estimatedTotalRevenue !== null ? parseNum(s.estimatedTotalRevenue) : null
          });
        } else {
          setResData({
            targetDate: targetCheckInDate,
            totalRooms: 0,
            totalCapacity: 0,
            occupancyRate: null,
            byType: [],
            groups: [],
            totalGroupRooms: 0,
            isBackendMartPending: true,
            estimatedRevenue: null,
            estimatedTotalRevenue: null
          });
        }
      } catch (err) {
        console.error('Failed to load condo reservation data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadReservationData();
    return () => { isCancelled = true; };
  }, [targetCheckInDate]);

  // 체크인 당일 예상 매출액 연동
  useEffect(() => {
    let isCancelled = false;

    async function loadForecast() {
      if (isClosedHistory) return;
      setForecastLoading(true);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/ancillary-revenue-forecast?date=${targetCheckInDate}`).catch(() => null);
        if (isCancelled || !res) return;

        if (res.success && res.forecastSummary) {
          setForecastData({
            roomRevenue: res.forecastSummary.totalRoomForecastRevenue ?? null,
            totalRevenue: res.forecastSummary.grandTotalForecastRevenue ?? null
          });
        }
      } catch (err) {
        console.error('Failed to load ancillary revenue forecast:', err);
      } finally {
        if (!isCancelled) setForecastLoading(false);
      }
    }

    loadForecast();
    return () => { isCancelled = true; };
  }, [targetCheckInDate, isClosedHistory]);

  const roomEstRev = resData?.estimatedRevenue ?? forecastData?.roomRevenue ?? null;
  const totalEstRev = resData?.estimatedTotalRevenue ?? forecastData?.totalRevenue ?? null;

  // 단체 기업 예약의 전체 객실 대비 비중 (%) - 백엔드 완제품 필드 (클라이언트 나눗셈 금지)
  const groupSharePct = (resData as any)?.groupSharePct ?? (resData as any)?.groupRatio ?? null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between hover:border-[#B59269]/60 transition-all cursor-default">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="text-[#1B382E] font-bold text-base flex items-center gap-2 whitespace-nowrap">
            <Building2 size={18} className="text-[#284F42]" />
            <span>콘도 체크인 예약 현황</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 bg-[#EAE6DF] text-[#1B382E] border border-[#D0C6BB]/60 whitespace-nowrap">
            <Calendar size={12} className="text-[#6C7A73]" />
            <span>{targetCheckInDate} ({targetDayOfWeek}) 도착</span>
            {isClosedHistory && (
              <span className="bg-[#D0C6BB] text-[#1B382E] text-[10px] px-1.5 py-0.5 rounded font-bold ml-0.5">
                마감 완료
              </span>
            )}
          </div>
        </div>

        {/* Top 3 KPI Grid (카드 중첩 제거 & 단일 3분할 디바이더) */}
        <div className="grid grid-cols-3 divide-x divide-[#D0C6BB]/60 bg-[#F4F3EE] p-3.5 rounded-2xl border border-[#D0C6BB]/70 text-center">
          {/* 1. 총 예약 객실수 */}
          <div className="px-2">
            <div className="text-xs font-semibold text-[#6C7A73] mb-1 whitespace-nowrap">
              총 예약 객실
            </div>
            <div className="text-2xl font-black text-[#1B382E] tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-[#6C7A73] font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-[#6C7A73] font-bold">-</span>
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-[#6C7A73]">마감</span>
              ) : (
                <>
                  {resData?.totalRooms ?? 0}
                  <span className="text-sm font-normal text-[#6C7A73] ml-0.5">실</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-[#6C7A73] font-medium mt-0.5">
              {isClosedHistory ? '정산 마감 완료' : (resData?.totalCapacity ? `가용 ${resData.totalCapacity}실 중` : '가용 객실 집계 중')}
            </div>
          </div>

          {/* 2. 예약 점유율 */}
          <div className="px-2">
            <div className="text-xs font-semibold text-[#6C7A73] mb-1 whitespace-nowrap">
              예약 점유율
            </div>
            <div className="text-2xl font-black text-[#1B382E] tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-[#6C7A73] font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-[#6C7A73] font-bold">-</span>
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-[#6C7A73]">마감</span>
              ) : resData?.occupancyRate !== null && resData?.occupancyRate !== undefined ? (
                <>
                  {resData.occupancyRate.toFixed(1)}
                  <span className="text-sm font-normal text-[#6C7A73] ml-0.5">%</span>
                </>
              ) : (
                '-'
              )}
            </div>
            <div 
              className="text-[11px] text-[#6C7A73] font-medium mt-0.5 truncate"
              title={isClosedHistory ? '상단 확정 점유율 참조' : `예약 ${resData?.totalRooms ?? 0}실 / ${resData?.totalCapacity ?? '-'}실`}
            >
              {isClosedHistory ? '상단 확정 점유율 참조' : `예약 ${resData?.totalRooms ?? 0}실 / ${resData?.totalCapacity ?? '-'}실`}
            </div>
          </div>

          {/* 3. 단체 / 기업 예약 객실수 */}
          <div className="px-2">
            <div className="text-xs font-semibold text-[#6C7A73] mb-1 whitespace-nowrap">
              단체·기업 예약
            </div>
            <div className="text-2xl font-black text-[#1B382E] tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-[#6C7A73] font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-[#6C7A73] font-bold">-</span>
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-[#6C7A73]">마감</span>
              ) : (
                <>
                  {resData?.totalGroupRooms ?? 0}
                  <span className="text-sm font-normal text-[#6C7A73] ml-0.5">실</span>
                </>
              )}
            </div>
            <div 
              className="text-[11px] text-[#6C7A73] font-medium mt-0.5 truncate"
              title={isClosedHistory ? '정산 마감 완료' : (groupSharePct != null ? `전체 대비 ${groupSharePct}%` : '-')}
            >
              {isClosedHistory ? '정산 마감 완료' : (groupSharePct != null ? `전체 대비 ${groupSharePct}%` : '-')}
            </div>
          </div>
        </div>

        {/* 상태별 본문 영역 */}
        {loading ? (
          <div className="py-10 text-center text-xs text-[#6C7A73] flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-[#284F42] border-t-transparent rounded-full animate-spin"></div>
            <span>체크인 예약 데이터를 불러오는 중입니다...</span>
          </div>
        ) : isClosedHistory ? (
          <div className="mt-3.5 p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#1B382E] text-sm">
              <CheckCircle2 size={16} className="text-[#284F42] shrink-0" />
              <span>{targetCheckInDate} ({targetDayOfWeek}) 일일 투숙 및 정산 마감 완료</span>
            </div>
            <p className="text-[11px] text-[#6C7A73] leading-relaxed">
              선택하신 일자는 이미 체크인 및 일마감이 완료된 과거 영업일입니다. 확정된 객실 실적은 상단 객실 지표에서 확인하실 수 있습니다.
            </p>
          </div>
        ) : resData?.isBackendMartPending ? (
          <div className="mt-3.5 p-4 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/60 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#1B382E]">
              <AlertCircle size={15} className="text-[#B59269] shrink-0" />
              <span>{targetCheckInDate} 사전 예약 내역 확인 중</span>
            </div>
            <p className="text-[11px] text-[#6C7A73] leading-relaxed">
              선택하신 일자의 체크인 사전 예약 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-3.5">
            {/* 아코디언 토글 버튼 */}
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full py-2 px-3 rounded-xl border border-[#D0C6BB]/70 bg-[#F4F3EE] hover:bg-[#EAE6DF] text-xs font-semibold text-[#1B382E] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>평수별 예약·단체 명단·예상 매출 상세</span>
              <div className="flex items-center gap-1 text-[11px] text-[#6C7A73] font-normal">
                <span>{isDetailsOpen ? '접기' : '상세보기'}</span>
                {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {isDetailsOpen && (
              <div className="space-y-3 pt-1">
                {/* 평수별 실제 객실수 현황 (16평, 35평, 51평 - 카드 중첩 제거) */}
                <div className="pt-3 border-t border-[#D0C6BB]/50">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1B382E] mb-2 px-1">
                    <span>평수별 체크인 예약 현황</span>
                    <span className="text-[11px] font-normal text-[#6C7A73]">실제 객실수 기준</span>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[#D0C6BB]/60 bg-[#F4F3EE] p-3 rounded-2xl border border-[#D0C6BB]/70 text-center">
                    {(resData?.byType || []).map((t, idx) => {
                      const pct = Math.min(100, Math.max(0, t.rate || 0));
                      return (
                        <div key={idx} className="px-1.5">
                          <div className="text-xs font-semibold text-[#6C7A73] mb-0.5">{t.roomType}</div>
                          <div className="text-lg font-black text-[#1B382E] tabular-nums my-0.5">
                            {t.roomsSold} <span className="text-xs font-normal text-[#6C7A73]">실</span>
                          </div>
                          <div className="text-[10px] text-[#6C7A73] font-medium">
                            가용 {t.capacity}실
                          </div>
                          <div className="w-full bg-[#D0C6BB]/60 h-1.5 rounded-full overflow-hidden mt-1.5 mb-1">
                            <div
                              className="h-full bg-[#284F42] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-[#1B382E] font-semibold">
                            점유 {pct.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 단체 기업예약: 실제 단체/기업 공식 명칭 및 배정 객실 리스트 */}
                <div className="pt-3 border-t border-[#D0C6BB]/50">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1B382E] mb-2 px-1">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-[#284F42]" />
                      <span>단체 / 기업 예약 명단</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#6C7A73]">
                      총 {resData?.totalGroupRooms ?? 0}실 {groupSharePct != null ? `(${groupSharePct}% 비중)` : ''}
                    </span>
                  </div>

                  {resData?.groups && resData.groups.length > 0 ? (
                    <div className="space-y-1.5">
                      {resData.groups.map((grp, gIdx) => {
                        const itemShare = (grp as any)?.sharePct ?? (grp as any)?.roomSharePct ?? null;
                        return (
                          <div
                            key={gIdx}
                            className="p-2.5 rounded-xl border border-[#D0C6BB]/60 bg-[#F4F3EE] flex items-center justify-between text-xs gap-2 hover:bg-[#EAE6DF] transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[#1B382E] flex items-center gap-1.5" title={grp.channelName}>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#284F42] shrink-0"></span>
                                <span className="truncate text-xs font-bold" title={grp.channelName}>{grp.channelName}</span>
                                {itemShare != null && (
                                  <span className="text-[10px] bg-[#B59269]/20 text-[#8C6839] px-1.5 py-0.2 rounded font-semibold shrink-0">
                                    {itemShare}%
                                  </span>
                                )}
                              </div>
                              {grp.breakdown.length > 0 && (
                                <div className="text-[11px] text-[#6C7A73] truncate mt-0.5 ml-3 font-medium" title={grp.breakdown.join(' · ')}>
                                  {grp.breakdown.join(' · ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right whitespace-nowrap shrink-0 pl-2">
                              <span className="text-sm font-black text-[#1B382E]">{grp.totalRooms}</span>
                              <span className="text-xs font-normal text-[#6C7A73] ml-0.5">실</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F4F3EE] rounded-xl border border-[#D0C6BB]/60 text-center text-xs text-[#6C7A73]">
                      <span>확정된 단체 예약이 없습니다. (일반/개별 고객 예약)</span>
                    </div>
                  )}
                </div>

                {/* 체크인 당일 예상 매출액 */}
                <div className="pt-3 border-t border-[#D0C6BB]/50">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1B382E] mb-2 px-1">
                    <span className="flex items-center gap-1.5">
                      <Coins size={14} className="text-[#284F42]" />
                      <span>체크인 당일 예상 매출액</span>
                    </span>
                    <span className="text-[11px] font-normal text-[#6C7A73]">
                      예약 원장 및 운영 모델 기준
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-[#D0C6BB]/60 bg-[#F4F3EE] p-3 rounded-2xl border border-[#D0C6BB]/70 text-center">
                    {/* 1. 객실 부문 예상 매출액 */}
                    <div className="px-2">
                      <div className="text-xs font-semibold text-[#6C7A73] mb-1">
                        객실 예상 매출
                      </div>
                      <div className="text-lg font-black text-[#1B382E] tabular-nums my-0.5">
                        {forecastLoading ? (
                          <span className="text-xs text-[#6C7A73] font-normal animate-pulse">산출 중...</span>
                        ) : roomEstRev !== null && roomEstRev !== undefined ? (
                          <>
                            {new Intl.NumberFormat('ko-KR').format(roomEstRev)}
                            <span className="text-xs font-normal text-[#6C7A73] ml-0.5">원</span>
                          </>
                        ) : (
                          <span className="text-[#6C7A73]">-</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#6C7A73] font-medium">
                        {resData?.totalRooms ?? 0}실 기준
                      </div>
                    </div>

                    {/* 2. 리조트 전체 파급 예상 매출액 */}
                    <div className="px-2">
                      <div className="text-xs font-semibold text-[#6C7A73] mb-1">
                        전체 예상 매출
                      </div>
                      <div className="text-lg font-black text-[#1B382E] tabular-nums my-0.5">
                        {forecastLoading ? (
                          <span className="text-xs text-[#6C7A73] font-normal animate-pulse">산출 중...</span>
                        ) : totalEstRev !== null && totalEstRev !== undefined ? (
                          <>
                            {new Intl.NumberFormat('ko-KR').format(totalEstRev)}
                            <span className="text-xs font-normal text-[#6C7A73] ml-0.5">원</span>
                          </>
                        ) : (
                          <span className="text-[#6C7A73]">-</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#6C7A73] font-medium">
                        부대·식음 파급 합산
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Subtext */}
      <div className="text-[11px] text-[#6C7A73] mt-4 pt-3 border-t border-[#D0C6BB]/50 flex items-center justify-between">
        <span>PMS 실시간 체크인 예약 원장</span>
      </div>
    </div>
  );
}
