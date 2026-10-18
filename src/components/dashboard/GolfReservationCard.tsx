import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { secureFetcher } from '../../lib/secureFetcher';
import { parseNum } from '../../lib/dataTransformers';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://belleforet-data.vercel.app';

interface TodayGolfSummary {
  reservedTeams: number;
  visitedTeams: number;
  canceledTeams: number;
  pendingTeams: number;
  golfParts?: {
    part1?: { name?: string; timeRange?: string; reservedTeams: number; visitedTeams: number; pendingTeams: number; avgGreenFee?: number; avgGreenFeeFormatted?: string };
    part2?: { name?: string; timeRange?: string; reservedTeams: number; visitedTeams: number; pendingTeams: number; avgGreenFee?: number; avgGreenFeeFormatted?: string };
    part3?: { name?: string; timeRange?: string; reservedTeams: number; visitedTeams: number; pendingTeams: number; avgGreenFee?: number; avgGreenFeeFormatted?: string };
  };
}

interface NextDayGolfData {
  targetDate: string;
  reservedTeams: number;
  visitedTeams: number;
  canceledTeams: number;
  pendingTeams: number;
  part1Reserved: number | null;
  part2Reserved: number | null;
  part3Reserved: number | null;
  part1AvgGreenFee: number | null;
  part2AvgGreenFee: number | null;
  part3AvgGreenFee: number | null;
}

interface GolfReservationCardProps {
  currentDate: string; // e.g. "2026-10-10"
  todaySummary: TodayGolfSummary;
  isRangeMode?: boolean;
}

export default function GolfReservationCard({ currentDate, todaySummary, isRangeMode = false }: GolfReservationCardProps) {
  const [loading, setLoading] = useState(false);
  const [nextDayGolf, setNextDayGolf] = useState<NextDayGolfData | null>(null);
  const [viewMode, setViewMode] = useState<'RESERVATION' | 'CLOSED'>('RESERVATION');
  const [isPartsOpen, setIsPartsOpen] = useState(false);

  // 날짜 계산 헬퍼: D+1 익일(다음날, 실제로는 오늘 도착) 계산
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

  const currentDayOfWeek = getDayOfWeek(currentDate);
  const nextDateStr = getNextDateStr(currentDate);
  const nextDayOfWeek = getDayOfWeek(nextDateStr);

  // 다음날(익일 D+1) 골프 예약 현황 조회
  useEffect(() => {
    let isCancelled = false;

    async function loadNextDayGolf() {
      setLoading(true);
      try {
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?date=${nextDateStr}`).catch(() => null);
        if (isCancelled) return;

        if (res && res.success && res.summary) {
          const s = res.summary;
          const p1 = s.golfPart1ReservedTeams ?? s.totalGolfPart1Teams ?? s.golfPart1Teams ?? s.golfParts?.part1ReservedTeams ?? s.golfParts?.part1?.reservedTeams ?? s.golfParts?.part1 ?? null;
          const p2 = s.golfPart2ReservedTeams ?? s.totalGolfPart2Teams ?? s.golfPart2Teams ?? s.golfParts?.part2ReservedTeams ?? s.golfParts?.part2?.reservedTeams ?? s.golfParts?.part2 ?? null;
          const p3 = s.golfPart3ReservedTeams ?? s.totalGolfPart3Teams ?? s.golfPart3Teams ?? s.golfParts?.part3ReservedTeams ?? s.golfParts?.part3?.reservedTeams ?? s.golfParts?.part3 ?? null;

          const p1Fee = s.golfPart1AvgGreenFee ?? s.part1AvgGreenFee ?? s.golfParts?.part1?.avgGreenFee ?? null;
          const p2Fee = s.golfPart2AvgGreenFee ?? s.part2AvgGreenFee ?? s.golfParts?.part2?.avgGreenFee ?? null;
          const p3Fee = s.golfPart3AvgGreenFee ?? s.part3AvgGreenFee ?? s.golfParts?.part3?.avgGreenFee ?? null;

          setNextDayGolf({
            targetDate: nextDateStr,
            reservedTeams: parseNum(s.totalGolfReservedTeams || 0),
            visitedTeams: parseNum(s.totalGolfVisitedTeams || s.totalGolfTeams || 0),
            canceledTeams: parseNum(s.totalGolfCanceledTeams || 0),
            pendingTeams: parseNum(s.totalGolfPendingTeams || 0),
            part1Reserved: p1 !== null && p1 !== undefined ? parseNum(p1) : null,
            part2Reserved: p2 !== null && p2 !== undefined ? parseNum(p2) : null,
            part3Reserved: p3 !== null && p3 !== undefined ? parseNum(p3) : null,
            part1AvgGreenFee: p1Fee !== null && p1Fee !== undefined ? parseNum(p1Fee) : null,
            part2AvgGreenFee: p2Fee !== null && p2Fee !== undefined ? parseNum(p2Fee) : null,
            part3AvgGreenFee: p3Fee !== null && p3Fee !== undefined ? parseNum(p3Fee) : null
          });
        } else {
          setNextDayGolf({
            targetDate: nextDateStr,
            reservedTeams: 0,
            visitedTeams: 0,
            canceledTeams: 0,
            pendingTeams: 0,
            part1Reserved: null,
            part2Reserved: null,
            part3Reserved: null,
            part1AvgGreenFee: null,
            part2AvgGreenFee: null,
            part3AvgGreenFee: null
          });
        }
      } catch (err) {
        console.error('Failed to load next day golf reservations:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadNextDayGolf();
    return () => { isCancelled = true; };
  }, [nextDateStr]);

  const todayCanceledAndPending = (todaySummary.canceledTeams || 0) + (todaySummary.pendingTeams || 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-default">
      <div>
        {/* Card Main Title & Time-Axis Segment Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="text-slate-800 font-bold text-base flex items-center gap-2">
            <Users size={18} className="text-slate-700" />
            <span>골프 예약 및 입장 현황</span>
          </div>

          {/* Clean Segment Switcher (시간축 분리 토글) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('RESERVATION')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'RESERVATION'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              도착 예약 ({nextDateStr})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CLOSED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'CLOSED'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              마감 실적 ({currentDate})
            </button>
          </div>
        </div>

        {/* 1. 도착 예약 현황 탭 (기본 메인 뷰) */}
        {viewMode === 'RESERVATION' && (
          <div>
            {/* Context Sub-header */}
            <div className="flex items-center justify-between text-xs mb-3 px-3 py-1.5 bg-slate-50/80 border border-slate-100 rounded-xl">
              <span className="font-semibold text-slate-700">
                {nextDateStr} ({nextDayOfWeek}) 실시간 도착 예약
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                예약 원장 집계
              </span>
            </div>

            {/* 3대 KPI 그리드 (카드 중첩 제거 & 단일 3분할 디바이더) */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/70 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 text-center">
              {/* 총 예약 접수 */}
              <div className="px-2">
                <div className="text-xs font-semibold text-slate-500 mb-1 whitespace-nowrap">총 예약</div>
                <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                  {loading ? (
                    <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                  ) : (
                    <>
                      {nextDayGolf?.reservedTeams ?? 0}
                      <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">전체 접수</div>
              </div>

              {/* 도착 예정 (유효 예약) */}
              <div className="px-2">
                <div className="text-xs font-semibold text-slate-500 mb-1 whitespace-nowrap">도착 예정</div>
                <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                  {loading ? (
                    <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                  ) : (
                    <>
                      {Math.max(0, (nextDayGolf?.reservedTeams ?? 0) - (nextDayGolf?.canceledTeams ?? 0))}
                      <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">유효 예약</div>
              </div>

              {/* 예약 취소 */}
              <div className="px-2">
                <div className="text-xs font-semibold text-rose-500 mb-1 whitespace-nowrap">예약 취소</div>
                <div className="text-2xl font-black text-rose-600 tabular-nums whitespace-nowrap">
                  {loading ? (
                    <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                  ) : (
                    <>
                      {nextDayGolf?.canceledTeams ?? 0}
                      <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                    </>
                  )}
                </div>
                <div 
                  className="text-[11px] text-slate-400 font-medium mt-0.5 truncate"
                  title={`취소율 ${(nextDayGolf as any)?.cancelRate != null ? `${(nextDayGolf as any).cancelRate}%` : '-'}`}
                >
                  취소율 {(nextDayGolf as any)?.cancelRate != null ? `${(nextDayGolf as any).cancelRate}%` : '-'}
                </div>
              </div>
            </div>

            {/* 아코디언 토글 버튼 */}
            <button
              type="button"
              onClick={() => setIsPartsOpen(!isPartsOpen)}
              className="w-full mt-3 py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>티타임 파트별(1·2·3부) 상세 현황</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                <span>{isPartsOpen ? '접기' : '상세보기'}</span>
                {isPartsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {/* 1부 / 2부 / 3부 티타임 파트별 예약 현황 */}
            {isPartsOpen && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2 px-1">
                  <span className="font-bold text-slate-700">티타임 파트별 예약 현황</span>
                  <span className="text-[11px] text-slate-400">
                    {nextDayGolf?.part1Reserved !== null && nextDayGolf?.part1Reserved !== undefined
                      ? '실시간 파트별 집계'
                      : '1부·2부·3부 예약 내역 없음'}
                  </span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-200/70 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 text-center">
                  {/* 1부 */}
                  <div className="px-1.5">
                    <div className="text-xs font-semibold text-slate-600 mb-0.5">1부 (오전)</div>
                    <div className="text-lg font-black text-slate-900 tabular-nums my-0.5">
                      {nextDayGolf?.part1Reserved !== null && nextDayGolf?.part1Reserved !== undefined ? (
                        <>{nextDayGolf.part1Reserved} <span className="text-xs font-normal text-slate-400">팀</span></>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">- 팀</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">06:00~11:00</div>
                    {nextDayGolf?.part1AvgGreenFee !== null && nextDayGolf?.part1AvgGreenFee !== undefined && nextDayGolf.part1AvgGreenFee > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                        <div className="text-[10px] text-slate-400">평균 단가</div>
                        <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                          {nextDayGolf.part1AvgGreenFee.toLocaleString()}원
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2부 */}
                  <div className="px-1.5">
                    <div className="text-xs font-semibold text-slate-600 mb-0.5">2부 (오후)</div>
                    <div className="text-lg font-black text-slate-900 tabular-nums my-0.5">
                      {nextDayGolf?.part2Reserved !== null && nextDayGolf?.part2Reserved !== undefined ? (
                        <>{nextDayGolf.part2Reserved} <span className="text-xs font-normal text-slate-400">팀</span></>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">- 팀</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">11:00~14:00</div>
                    {nextDayGolf?.part2AvgGreenFee !== null && nextDayGolf?.part2AvgGreenFee !== undefined && nextDayGolf.part2AvgGreenFee > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                        <div className="text-[10px] text-slate-400">평균 단가</div>
                        <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                          {nextDayGolf.part2AvgGreenFee.toLocaleString()}원
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3부 */}
                  <div className="px-1.5">
                    <div className="text-xs font-semibold text-slate-600 mb-0.5">3부 (야간)</div>
                    <div className="text-lg font-black text-slate-900 tabular-nums my-0.5">
                      {nextDayGolf?.part3Reserved !== null && nextDayGolf?.part3Reserved !== undefined ? (
                        <>{nextDayGolf.part3Reserved} <span className="text-xs font-normal text-slate-400">팀</span></>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">- 팀</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">14:00~마감</div>
                    {nextDayGolf?.part3AvgGreenFee !== null && nextDayGolf?.part3AvgGreenFee !== undefined && nextDayGolf.part3AvgGreenFee > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                        <div className="text-[10px] text-slate-400">평균 단가</div>
                        <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                          {nextDayGolf.part3AvgGreenFee.toLocaleString()}원
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. 기준일 마감 실적 탭 */}
        {viewMode === 'CLOSED' && (
          <div>
            {/* Context Sub-header */}
            <div className="flex items-center justify-between text-xs mb-3 px-3 py-1.5 bg-slate-50/80 border border-slate-100 rounded-xl">
              <span className="font-semibold text-slate-700">
                {currentDate} ({currentDayOfWeek}) {isRangeMode ? '선택 기간 합산' : '일마감 실적'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                정산 완료
              </span>
            </div>

            {/* 3대 KPI 그리드 */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/70 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 text-center">
              {/* 총 예약 팀수 */}
              <div className="px-2">
                <div className="text-xs font-semibold text-slate-500 mb-1 whitespace-nowrap">총 예약</div>
                <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                  {todaySummary.reservedTeams}
                  <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">당일 총 예약</div>
              </div>

              {/* 실제 입장 (내장) */}
              <div className="px-2">
                <div className="text-xs font-semibold text-slate-500 mb-1 whitespace-nowrap">실제 내장</div>
                <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                  {todaySummary.visitedTeams}
                  <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">라운딩 완료</div>
              </div>

              {/* 취소 / 미내장 */}
              <div className="px-2">
                <div className="text-xs font-semibold text-rose-500 mb-1 whitespace-nowrap">취소 / 미내장</div>
                <div className="text-2xl font-black text-rose-600 tabular-nums whitespace-nowrap">
                  {todayCanceledAndPending}
                  <span className="text-sm font-normal text-slate-400 ml-0.5">팀</span>
                </div>
                <div 
                  className="text-[11px] text-slate-400 font-medium mt-0.5 truncate"
                  title={todaySummary.pendingTeams > 0
                    ? `취소 ${todaySummary.canceledTeams}팀 · 미내장 ${todaySummary.pendingTeams}팀`
                    : `취소 ${todaySummary.canceledTeams}팀`}
                >
                  취소 {todaySummary.canceledTeams}팀
                </div>
              </div>
            </div>

            {/* 기준일 1부 / 2부 / 3부 티타임 파트별 마감 실적 */}
            {todaySummary.golfParts && (
              <>
                <button
                  type="button"
                  onClick={() => setIsPartsOpen(!isPartsOpen)}
                  className="w-full mt-3 py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>티타임 파트별(1·2·3부) 상세 실적</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                    <span>{isPartsOpen ? '접기' : '상세보기'}</span>
                    {isPartsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isPartsOpen && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-2 px-1">
                      <span className="font-bold text-slate-700">티타임 파트별 마감 실적</span>
                      <span className="text-[11px] text-slate-400">1부·2부·3부 정산 완료</span>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-slate-200/70 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 text-center">
                      {[
                        { key: 'part1', data: todaySummary.golfParts.part1, label: '1부 (오전)', time: '06:00~11:00' },
                        { key: 'part2', data: todaySummary.golfParts.part2, label: '2부 (오후)', time: '11:00~14:00' },
                        { key: 'part3', data: todaySummary.golfParts.part3, label: '3부 (야간)', time: '14:00~마감' }
                      ].map(({ key, data: p, label, time }) => {
                        if (!p) return null;
                        return (
                          <div key={key} className="px-1.5">
                            <div className="text-xs font-semibold text-slate-600 mb-0.5">{label}</div>
                            <div className="text-lg font-black text-slate-900 tabular-nums my-0.5">
                              {p.visitedTeams} <span className="text-xs font-normal text-slate-400">팀</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">{time}</div>
                            {p.avgGreenFee !== undefined && p.avgGreenFee > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                                <div className="text-[10px] text-slate-400">평균 단가</div>
                                <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                                  {p.avgGreenFeeFormatted || `${p.avgGreenFee.toLocaleString()}원`}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Subtext */}
      <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span>골프장 실시간 예약 원장 및 마감 실적</span>
      </div>
    </div>
  );
}
