import { useState, useEffect } from 'react';
import { Users, Calendar } from 'lucide-react';
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
    <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-md transition-all duration-300 cursor-default shadow-xs">
      <div>
        {/* Card Main Title */}
        <div className="text-slate-800 font-bold text-base mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-mint" />
            <span>골프 예약 및 입장 현황</span>
          </div>
        </div>

        {/* 1. 기준일 마감 실적 섹션 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2.5 px-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Calendar size={13} className="text-slate-500" />
              <span>{currentDate} ({currentDayOfWeek}) {isRangeMode ? '선택 기간 합산 실적' : '마감 실적'}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
              정산 완료
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* 총 예약 팀수 */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">총 예약 팀수</div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                {todaySummary.reservedTeams} <span className="text-sm font-normal text-slate-500">팀</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                당일 총 예약
              </div>
            </div>

            {/* 실제 입장 (내장) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">실제 입장 (내장)</div>
              <div className="text-2xl lg:text-3xl font-black text-brand-mint tabular-nums whitespace-nowrap">
                {todaySummary.visitedTeams} <span className="text-sm font-normal text-slate-500">팀</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                라운딩 완료
              </div>
            </div>

            {/* 취소 / 미내장 */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-rose-500 font-semibold mb-1 whitespace-nowrap">취소 / 미내장</div>
              <div className="text-2xl lg:text-3xl font-black text-rose-500 tabular-nums whitespace-nowrap">
                {todayCanceledAndPending} <span className="text-sm font-normal text-slate-500">팀</span>
              </div>
              <div 
                className="text-[10px] text-slate-500 font-medium mt-0.5 truncate"
                title={todaySummary.pendingTeams > 0
                  ? `취소 ${todaySummary.canceledTeams}팀 · 미내장 ${todaySummary.pendingTeams}팀`
                  : `취소 ${todaySummary.canceledTeams}팀`}
              >
                {todaySummary.pendingTeams > 0
                  ? `취소 ${todaySummary.canceledTeams}팀 · 미내장 ${todaySummary.pendingTeams}팀`
                  : `취소 ${todaySummary.canceledTeams}팀`}
              </div>
            </div>
          </div>

          {/* 🌟 1-B. 기준일 1부 / 2부 / 3부 티타임 파트별 실적 */}
          {todaySummary.golfParts && (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-2 px-0.5">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <span>⏰</span> 티타임 파트별 마감 실적
                </span>
                <span className="text-[10px] text-slate-400 font-medium">1부·2부·3부 실시간 집계</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'part1', data: todaySummary.golfParts.part1, label: '1부 (오전)', time: '06:00~11:00' },
                  { key: 'part2', data: todaySummary.golfParts.part2, label: '2부 (오후)', time: '11:00~14:00' },
                  { key: 'part3', data: todaySummary.golfParts.part3, label: '3부 (야간)', time: '14:00~마감' }
                ].map(({ key, data: p, label }) => {
                  if (!p) return null;
                  return (
                    <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-800 mb-0.5">{label}</div>
                        <div className="text-base font-black text-slate-900 tabular-nums">
                          {p.visitedTeams} <span className="text-xs font-normal text-slate-500">팀 완료</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          총 예약 {p.reservedTeams}팀 {p.pendingTeams > 0 ? `(대기 ${p.pendingTeams})` : ''}
                        </div>
                      </div>
                      {p.avgGreenFee !== undefined && p.avgGreenFee > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col items-center">
                          <span className="text-[9px] text-slate-400">평균 그린피</span>
                          <span className="text-xs font-extrabold text-slate-800 tabular-nums">
                            {p.avgGreenFeeFormatted || `${p.avgGreenFee.toLocaleString()}원`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. 다음날 날짜와 예약 현황 섹션 (사용자 신규 요청: 실제 오늘/익일 도착 예약) */}
        <div className="pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between text-xs mb-2.5 px-1 bg-teal-50/70 border border-teal-100/90 rounded-xl py-1.5 px-3">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>다음날({nextDateStr} {nextDayOfWeek}) 골프 예약 현황</span>
            </div>
            <span className="text-[10px] font-bold text-teal-700 bg-white/90 px-2 py-0.5 rounded-md border border-teal-200/80">
              실시간 예약 원장
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* 다음날 총 예약 팀수 */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">총 예약 팀수</div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 tabular-nums whitespace-nowrap">
                {loading ? (
                  <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                ) : (
                  <>
                    {nextDayGolf?.reservedTeams ?? 0} <span className="text-sm font-normal text-slate-500">팀</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                전체 예약 접수
              </div>
            </div>

            {/* 다음날 도착 예정 (유효 예약 = 총예약 - 취소) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold mb-1 whitespace-nowrap">도착 예정 (유효 예약)</div>
              <div className="text-2xl lg:text-3xl font-black text-teal-600 tabular-nums whitespace-nowrap">
                {loading ? (
                  <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                ) : (
                  <>
                    {Math.max(0, (nextDayGolf?.reservedTeams ?? 0) - (nextDayGolf?.canceledTeams ?? 0))} <span className="text-sm font-normal text-slate-500">팀</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                취소 제외 라운딩 예정
              </div>
            </div>

            {/* 다음날 예약 취소 */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-rose-500 font-semibold mb-1 whitespace-nowrap">예약 취소</div>
              <div className="text-2xl lg:text-3xl font-black text-rose-500 tabular-nums whitespace-nowrap">
                {loading ? (
                  <span className="text-xs text-slate-400 font-normal animate-pulse">조회 중...</span>
                ) : (
                  <>
                    {nextDayGolf?.canceledTeams ?? 0} <span className="text-sm font-normal text-slate-500">팀</span>
                  </>
                )}
              </div>
              <div 
                className="text-[10px] text-slate-500 font-medium mt-0.5 truncate"
                title={`취소율 ${(nextDayGolf as any)?.cancelRate != null ? `${(nextDayGolf as any).cancelRate}%` : '-'}`}
              >
                취소율 {(nextDayGolf as any)?.cancelRate != null ? `${(nextDayGolf as any).cancelRate}%` : '-'}
              </div>
            </div>
          </div>

          {/* 🌟 2-B. 1부 / 2부 / 3부 티타임 파트별 예약 현황 (사용자 명시 요청) */}
          <div className="mt-3.5 pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-2 px-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="text-sm">⏰</span>
                <span>티타임 파트별 예약 현황</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {nextDayGolf?.part1Reserved !== null && nextDayGolf?.part1Reserved !== undefined
                  ? '실시간 파트별 집계'
                  : '1부·2부·3부 예약 내역 없음'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 1부 */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 py-0.5 rounded-md mb-1">
                    1부 (오전)
                  </div>
                  <div className="text-xl font-black text-slate-900 tabular-nums my-0.5">
                    {nextDayGolf?.part1Reserved !== null && nextDayGolf?.part1Reserved !== undefined ? (
                      <>{nextDayGolf.part1Reserved} <span className="text-xs font-normal text-slate-500">팀</span></>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 팀</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    06:00 ~ 11:00
                  </div>
                </div>

                {/* 1부 평균 그린피 (맨밑) */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-medium">평균 그린피</span>
                  <span className="text-xs sm:text-sm font-extrabold text-indigo-700 tabular-nums mt-0.5">
                    {nextDayGolf?.part1AvgGreenFee !== null && nextDayGolf?.part1AvgGreenFee !== undefined && nextDayGolf.part1AvgGreenFee > 0 ? (
                      <>{nextDayGolf.part1AvgGreenFee.toLocaleString()}원</>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 원</span>
                    )}
                  </span>
                </div>
              </div>

              {/* 2부 */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 bg-teal-50/80 py-0.5 rounded-md mb-1">
                    2부 (오후)
                  </div>
                  <div className="text-xl font-black text-slate-900 tabular-nums my-0.5">
                    {nextDayGolf?.part2Reserved !== null && nextDayGolf?.part2Reserved !== undefined ? (
                      <>{nextDayGolf.part2Reserved} <span className="text-xs font-normal text-slate-500">팀</span></>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 팀</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    11:00 ~ 14:00
                  </div>
                </div>

                {/* 2부 평균 그린피 (맨밑) */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-medium">평균 그린피</span>
                  <span className="text-xs sm:text-sm font-extrabold text-teal-700 tabular-nums mt-0.5">
                    {nextDayGolf?.part2AvgGreenFee !== null && nextDayGolf?.part2AvgGreenFee !== undefined && nextDayGolf.part2AvgGreenFee > 0 ? (
                      <>{nextDayGolf.part2AvgGreenFee.toLocaleString()}원</>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 원</span>
                    )}
                  </span>
                </div>
              </div>

              {/* 3부 */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-700 bg-amber-50/80 py-0.5 rounded-md mb-1">
                    3부 (야간/라이트)
                  </div>
                  <div className="text-xl font-black text-slate-900 tabular-nums my-0.5">
                    {nextDayGolf?.part3Reserved !== null && nextDayGolf?.part3Reserved !== undefined ? (
                      <>{nextDayGolf.part3Reserved} <span className="text-xs font-normal text-slate-500">팀</span></>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 팀</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    14:00 ~ 마감
                  </div>
                </div>

                {/* 3부 평균 그린피 (맨밑) */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-medium">평균 그린피</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-700 tabular-nums mt-0.5">
                    {nextDayGolf?.part3AvgGreenFee !== null && nextDayGolf?.part3AvgGreenFee !== undefined && nextDayGolf.part3AvgGreenFee > 0 ? (
                      <>{nextDayGolf.part3AvgGreenFee.toLocaleString()}원</>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">- 원</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Subtext */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
        <span>골프장 실시간 예약 원장 및 마감 라운딩 실적 데이터</span>
      </div>
    </div>
  );
}
