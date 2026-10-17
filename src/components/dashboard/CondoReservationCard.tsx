import { useState, useEffect } from 'react';
import { Building2, Users, Calendar, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
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

  // 익일(실제 오늘) 체크인 예약 원장 조회 (초고속 전용 V6 API: ~200ms)
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

  // 체크인 당일 예상 매출액 연동 (BESM v6.3 예측 모델 SSOT)
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

  // 단체 기업 예약의 전체 객실 대비 비중 (%) - 백엔드 완제품 필드만 사용 (클라이언트 나눗셈 금지)
  const groupSharePct = (resData as any)?.groupSharePct ?? (resData as any)?.groupRatio ?? null;

  return (
    <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default shadow-xs">
      <div>
        {/* Header: 체크인 예약 현황 전용 (당일 과거 실적 제거) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="text-slate-800 font-bold text-base flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            <span>콘도(객실) 체크인 예약 현황</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto border ${
            isClosedHistory 
              ? 'bg-slate-100 border-slate-200 text-slate-700' 
              : 'bg-indigo-50 border-indigo-100 text-indigo-900'
          }`}>
            <Calendar size={13} className={isClosedHistory ? 'text-slate-500' : 'text-indigo-600'} />
            <span>{targetCheckInDate} ({targetDayOfWeek}) 도착 예약</span>
            {isClosedHistory && (
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                마감 완료
              </span>
            )}
          </div>
        </div>

        {/* Date Context Badge: 실제 오늘/익일 체크인 안내 */}
        <div className={`flex items-center justify-between text-xs mb-3 border rounded-xl px-3 py-1.5 ${
          isClosedHistory 
            ? 'bg-slate-100/80 border-slate-200 text-slate-700' 
            : 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <span className={`w-2 h-2 rounded-full ${isClosedHistory ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span>{isClosedHistory ? '영업 마감 완료 일자' : '체크인 예정 예약 고객 현황'}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
              isClosedHistory 
                ? 'bg-slate-200 text-slate-700' 
                : 'bg-indigo-100/80 text-indigo-600'
            }`}>
              {isClosedHistory ? '투숙 및 정산 마감' : 'PMS 실시간 예약 원장'}
            </span>
          </div>
          <span className={`text-[11px] font-medium hidden sm:inline ${
            isClosedHistory ? 'text-slate-500' : 'text-indigo-700/80'
          }`}>
            {isClosedHistory ? '확정 실적은 상단 객실 실적 지표 참조' : '물리 고정 175실 기준 SSOT'}
          </span>
        </div>

        {/* Top 3 KPI Badges - 실제 객실수 및 예약 점유율 표기 */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. 총 예약 객실수 (실제 객실 숫자 중심) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">
              총 예약 객실
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-slate-400 font-bold">-</span>
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-slate-500">마감</span>
              ) : (
                <>
                  {resData?.totalRooms ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-1">실</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {isClosedHistory ? '상단 확정 객실 실적 참조' : `전체 ${resData?.totalCapacity ?? 0}실 가용`}
            </div>
          </div>

          {/* 2. 예약 점유율 (Occ) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap flex items-center justify-between">
              <span>예약 점유율</span>
              <span className={`text-[10px] font-bold px-1 py-0.2 rounded-sm border ${
                isClosedHistory 
                  ? 'bg-slate-100 text-slate-600 border-slate-200' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}>
                {isClosedHistory ? '마감' : '체크인 예정'}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-indigo-600 tabular-nums whitespace-nowrap">
              {loading ? (
                <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
              ) : resData?.isBackendMartPending ? (
                <span className="text-lg text-slate-400 font-bold">-</span>
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-slate-500">마감</span>
              ) : resData?.occupancyRate !== null && resData?.occupancyRate !== undefined ? (
                <>
                  {resData.occupancyRate.toFixed(1)}
                  <span className="text-sm font-normal text-indigo-500">%</span>
                </>
              ) : (
                '-'
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
              {isClosedHistory ? '상단 확정 점유율 참조' : `총 예약 ${resData?.totalRooms ?? 0}실 / 175실 기준`}
            </div>
          </div>

          {/* 3. 단체 / 기업 예약 객실수 및 전체 대비 비중 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs text-purple-600 font-semibold mb-1 whitespace-nowrap flex items-center justify-between">
              <span>단체·기업 예약</span>
              {!isClosedHistory && resData && resData.groups.length > 0 && (
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
              ) : isClosedHistory ? (
                <span className="text-xl font-bold text-slate-500">마감</span>
              ) : (
                <>
                  {resData?.totalGroupRooms ?? 0}
                  <span className="text-sm font-normal text-purple-500 ml-1">실</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-purple-700 font-bold mt-0.5 truncate">
              {isClosedHistory ? '정산 마감 완료' : `전체 대비 ${groupSharePct}%`}
            </div>
          </div>
        </div>

        {/* 상태별 본문 영역 */}
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>체크인 예약 데이터를 불러오는 중입니다...</span>
          </div>
        ) : isClosedHistory ? (
          <div className="mt-3.5 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 text-xs space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
              <span>{targetCheckInDate} ({targetDayOfWeek}) 일일 투숙 및 정산 마감 완료</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              선택하신 일자는 이미 체크인 및 일마감(Night Audit)이 완료된 <strong>과거 영업일</strong>입니다.<br />
              해당 일자의 확정된 객실 투숙 실적과 매출은 <strong>상단 메인 대시보드 지표(객실 판매 실적)</strong>에서 확인하실 수 있습니다.
            </p>
            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
              <span className="text-indigo-600 font-bold shrink-0">💡</span>
              <span>
                <strong>PMS 실시간 예약 원장 안내:</strong> 본 카드는 당일 및 익일 입실 예정 고객을 위한 실시간 대기 원장입니다. 마감 완료된 과거 일자는 예약 버퍼가 자동 이관되므로 상단 마감 실적을 단일 진실 공급원(SSOT)으로 삼습니다.
              </span>
            </div>
          </div>
        ) : resData?.isBackendMartPending ? (
          <div className="mt-3.5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>{targetCheckInDate} 산하 PMS 예약 원장 동기화 대기 중</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              선택하신 일자의 체크인 사전 예약 데이터가 PMS로부터 연동 대기 중입니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-3.5">
            {/* 평수별 실제 객실수 현황 (16평, 35평, 51평 - %가 아닌 실제 객실숫자 중심) */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <span>📐</span> 평수별 체크인 예약 현황 (실제 객실수)
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
                    총 {resData?.totalGroupRooms ?? 0}실 {groupSharePct != null ? `(${groupSharePct}% 비중)` : ''}
                  </span>
                </div>
              </div>

              {resData?.groups && resData.groups.length > 0 ? (
                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                  {resData.groups.map((grp, gIdx) => {
                    const itemShare = (grp as any)?.sharePct ?? (grp as any)?.roomSharePct ?? null;
                    return (
                      <div
                        key={gIdx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs shadow-2xs gap-2 hover:border-purple-200 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                            <span className="truncate text-sm font-extrabold">{grp.channelName}</span>
                            {itemShare != null && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-md font-semibold shrink-0 border border-purple-100">
                                비중 {itemShare}%
                              </span>
                            )}
                            {grp.category && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-sm shrink-0 hidden sm:inline">
                                {grp.category}
                              </span>
                            )}
                          </div>
                          {grp.breakdown.length > 0 && (
                            <div className="text-[11px] text-slate-600 truncate mt-1 ml-3.5 font-medium flex items-center gap-2">
                              <span className="text-purple-600 font-semibold">{grp.breakdown.join(' · ')}</span>
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

            {/* 🌟 체크인 당일 예상 매출액 (Estimated Revenue) */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5 text-emerald-900">
                  <Coins size={14} className="text-emerald-600" />
                  <span>체크인 당일 예상 매출액</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  실시간 예약 원장 &amp; BESM 모델 SSOT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. 객실 부문 예상 매출액 */}
                <div className="bg-white p-3 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                    <span>🛏️ 객실 예상 매출</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      {resData?.totalRooms ?? 0}실 확정
                    </span>
                  </div>
                  <div className="text-xl lg:text-2xl font-black text-slate-900 tabular-nums my-1">
                    {forecastLoading ? (
                      <span className="text-xs text-slate-400 font-normal animate-pulse">산출 중...</span>
                    ) : roomEstRev !== null && roomEstRev !== undefined ? (
                      <>
                        {new Intl.NumberFormat('ko-KR').format(roomEstRev)}
                        <span className="text-xs font-bold text-slate-500 ml-0.5">원</span>
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    PMS 예약 확정 및 기저 단가 연동
                  </div>
                </div>

                {/* 2. 리조트 전체 파급 예상 매출액 */}
                <div className="bg-white p-3 rounded-2xl border border-indigo-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                    <span>🌐 전체 예상 매출</span>
                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                      부대·스필오버
                    </span>
                  </div>
                  <div className="text-xl lg:text-2xl font-black text-indigo-600 tabular-nums my-1">
                    {forecastLoading ? (
                      <span className="text-xs text-slate-400 font-normal animate-pulse">산출 중...</span>
                    ) : totalEstRev !== null && totalEstRev !== undefined ? (
                      <>
                        {new Intl.NumberFormat('ko-KR').format(totalEstRev)}
                        <span className="text-xs font-bold text-indigo-500 ml-0.5">원</span>
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    투숙객 식음·레저 파급 합산
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Subtext */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
        <span>산하 PMS 실시간 예약 원장 연동 (16평/35평/51평 실제 배정 객실 & 법인 단체)</span>
      </div>
    </div>
  );
}
