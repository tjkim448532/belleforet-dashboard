import { useState, useEffect } from 'react';
import { 
  UserCheck, Calendar, Flame, Building2, 
  Sparkles, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface VenueHeadcountItem {
  id: number;
  categoryCode?: string;
  teamName?: string;
  partName?: string;
  venueName: string;
  leaderName: string;
  regularHeadcount: number;
  weekdayHeadcount: number;
  weekendHeadcount: number;
  dailyWorkerWeekday?: number;
  dailyWorkerWeekend?: number;
  isOutsourced: number; // 1이면 외주
  memo: string;
  updatedAt?: string;
}

export interface PartGroup {
  partName: string;
  totalRegular: number;
  totalWeekday: number;
  totalWeekend: number;
  venues: VenueHeadcountItem[];
}

export interface LeisureOrgResponse {
  status: 'success' | 'error';
  division: string;
  summary: {
    totalVenues: number;
    totalRegularHeadcount: number;
    totalWeekdayHeadcount: number;
    totalWeekendHeadcount: number;
  };
  parts: PartGroup[];
}

export default function LeisureOrganization() {
  const [data, setData] = useState<LeisureOrgResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/leisure-organization`);
      const payload: LeisureOrgResponse = res?.data ?? res;
      if (payload && payload.status === 'success' && Array.isArray(payload.parts)) {
        setData(payload);
      } else {
        setError('조직도 데이터를 불러오는 데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching leisure organization:', err);
      setError(err?.message || '조직도 API 호출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-mint"></div>
          <p className="text-sm font-medium text-slate-500">레저본부 조직도 및 인력 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-base">데이터 로드 오류</h3>
              <p className="text-sm text-rose-600 mt-0.5">{error || '데이터가 없습니다.'}</p>
            </div>
          </div>
          <button
            onClick={fetchOrganizationData}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs"
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { summary, parts, division } = data;

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* 1. Header Banner */}
        <div className="bg-[#284F42] rounded-3xl p-7 lg:p-8 text-white relative overflow-hidden shadow-xl border border-[#1B382E]">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#5FB878]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-20 w-64 h-64 bg-[#B59269]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · LEISURE WORKFORCE</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap break-keep">
                <span className="whitespace-nowrap">{division} 조직도 및 영업장 인력 현황</span>
                <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                  4대 파트 · 12개 영업장
                </span>
              </h1>
              <p className="text-sm text-white/80 mt-2 break-keep">
                통합 데이터 통제 센터(Admin)와 실시간 연동된 레저본부 영업장별 책임자, 정규직 및 주중/주말 운영 투입 인력 현황입니다.
              </p>
            </div>

            <button
              onClick={fetchOrganizationData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs lg:text-sm font-bold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw size={15} /> 새로고침
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards (4-Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          
          {/* Total Venues */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">총 관리 영업장</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <Building2 size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black text-[#1B382E] tabular-nums">{summary.totalVenues}</span>
              <span className="text-sm font-bold text-[#5A6B63]">개소</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium whitespace-nowrap">
              액티비티 · 목장 · 미디어 · 놀이동산
            </div>
          </div>

          {/* Total Regular Headcount */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">정규직 총원</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black text-[#1B382E] tabular-nums">{summary.totalRegularHeadcount}</span>
              <span className="text-sm font-bold text-[#5A6B63]">명</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium whitespace-nowrap">
              레저본부 소속 정규직 (책임자 포함)
            </div>
          </div>

          {/* Total Weekday Headcount */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">주중 운영 투입</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <Calendar size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black text-[#1B382E] tabular-nums">{summary.totalWeekdayHeadcount}</span>
              <span className="text-sm font-bold text-[#5A6B63]">명</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium whitespace-nowrap">
              주중 평일 현장 배치 인원 (정규직+알바)
            </div>
          </div>

          {/* Total Weekend Headcount */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">주말 집중 투입</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <Flame size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black text-[#1B382E] tabular-nums">{summary.totalWeekendHeadcount}</span>
              <span className="text-sm font-bold text-[#5A6B63]">명</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium whitespace-nowrap">
              주말/공휴일 피크 투입 인원 ({(summary as any).weekendExtraHeadcount != null ? `+${(summary as any).weekendExtraHeadcount}` : '-'}명 증원)
            </div>
          </div>

        </div>

        {/* 3. 4대 파트별 인력 현황 테이블 & 카드 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-[#1B382E] flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#284F42]" />
              4대 파트별 상세 조직 및 영업장 인력 현황
            </h2>
            <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] border border-[#B4C6C1]/70 px-3.5 py-1 rounded-full">
              실시간 동기화
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {parts.map((part, pIdx) => {
              const isAmusement = part.partName === '놀이동산';

              return (
                <div 
                  key={pIdx} 
                  className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden transition-all duration-300"
                >
                  {/* Part Header Bar */}
                  <div className="bg-[#284F42] p-5 lg:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B382E]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white border border-white/20">
                        {pIdx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap break-keep">
                          <span className="whitespace-nowrap">{part.partName} 파트</span>
                          <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {part.venues.length}개 영업장
                          </span>
                        </h3>
                        <p className="text-xs text-white/80 mt-0.5 font-normal break-keep">
                          {isAmusement ? '전문 운영사 위탁 관리 파트' : '레저본부 직영 운영 및 현장 지원 파트'}
                        </p>
                      </div>
                    </div>

                    {/* Part Subtotal Badges (Backend SSOT) */}
                    <div className="flex flex-wrap items-center gap-2">
                      {part.totalRegular > 0 && (
                        <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                          <UserCheck size={14} className="text-[#5FB878]" />
                          정규직 <b className="text-white tabular-nums">{part.totalRegular}명</b>
                        </span>
                      )}
                      {part.totalWeekday > 0 && (
                        <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar size={14} className="text-[#5FB878]" />
                          주중 <b className="text-white tabular-nums">{part.totalWeekday}명</b>
                        </span>
                      )}
                      {part.totalWeekend > 0 && (
                        <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                          <Flame size={14} className="text-[#B59269]" />
                          주말 <b className="text-white tabular-nums">{part.totalWeekend}명</b>
                        </span>
                      )}
                      {isAmusement && (
                        <span className="bg-[#B59269]/80 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                          <Sparkles size={14} />
                          외주 위탁 운영
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Venues Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                      <thead className="whitespace-nowrap">
                        <tr className="bg-[#F4F3EE] border-b border-[#D0C6BB]/75 text-xs font-bold text-[#1B382E] tracking-wider uppercase whitespace-nowrap">
                          <th className="py-3.5 px-5 lg:px-6 text-left whitespace-nowrap">영업장명</th>
                          <th className="py-3.5 px-4 text-left whitespace-nowrap">선임 / 책임자</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">정규직</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">주중 투입</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap">주말 투입</th>
                          <th className="py-3.5 px-5 lg:px-6 text-left min-w-[200px] whitespace-nowrap">특이사항 및 운영 메모</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0C6BB]/30 text-sm font-medium text-[#1B382E]">
                        {part.venues.map((venue) => (
                          <tr 
                            key={venue.id}
                            className="hover:bg-[#F4F3EE]/50 transition-colors"
                          >
                            {/* 영업장명 */}
                            <td className="py-4 px-5 lg:px-6 font-bold text-[#1B382E] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span>{venue.venueName}</span>
                                {venue.isOutsourced === 1 && (
                                  <span className="inline-flex items-center text-[11px] font-bold text-[#B59269] bg-[#F4F3EE] border border-[#D0C6BB] px-2 py-0.5 rounded-md whitespace-nowrap">
                                    외주
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 선임/책임자 */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {venue.leaderName ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B382E] bg-[#F4F3EE] px-2.5 py-1 rounded-xl border border-[#D0C6BB]/70 whitespace-nowrap">
                                  <UserCheck size={13} className="text-[#284F42]" />
                                  {venue.leaderName}
                                </span>
                              ) : (
                                <span className="text-[#D0C6BB] text-xs">-</span>
                              )}
                            </td>

                            {/* 정규직 */}
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              {venue.regularHeadcount > 0 ? (
                                <span className="inline-flex items-center justify-center font-bold text-[#1E523F] bg-[#E8F2EE] border border-[#B4C6C1]/70 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                  {venue.regularHeadcount}명
                                </span>
                              ) : (
                                <span className="text-[#D0C6BB] text-xs">-</span>
                              )}
                            </td>

                            {/* 주중 투입 */}
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              {venue.weekdayHeadcount > 0 ? (
                                <span className="inline-flex items-center justify-center font-bold text-[#1B382E] bg-[#F4F3EE] border border-[#D0C6BB]/70 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                  {venue.weekdayHeadcount}명
                                </span>
                              ) : (
                                <span className="text-[#D0C6BB] text-xs">-</span>
                              )}
                            </td>

                            {/* 주말 투입 */}
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              {venue.weekendHeadcount > 0 ? (
                                <span className="inline-flex items-center justify-center font-bold text-[#B59269] bg-[#FDF0ED] border border-[#D0C6BB]/70 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                  {venue.weekendHeadcount}명
                                </span>
                              ) : (
                                <span className="text-[#D0C6BB] text-xs">-</span>
                              )}
                            </td>

                            {/* 특이사항 및 메모 */}
                            <td className="py-4 px-5 lg:px-6 text-xs text-[#5A6B63] font-normal break-keep">
                              {venue.memo ? (
                                <span className="text-[#1B382E] bg-[#F4F3EE] px-2.5 py-1 rounded-xl border border-[#D0C6BB]/60 inline-block">
                                  {venue.memo}
                                </span>
                              ) : (
                                <span className="text-[#D0C6BB]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
