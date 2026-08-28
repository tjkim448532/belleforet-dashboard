import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Award, Search, Calendar, ChevronRight, User, 
  DollarSign, RefreshCw, Trophy, Flame, Phone
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export interface MemberVisitEntry {
  visitNo: number;
  date: string;
  facility: string;
  spend: number;
}

export interface MemberVisitorItem {
  memberNo: string;
  memberName: string;
  phone: string;
  memberType: '골프정회원' | '지정회원' | '콘도회원' | '창립회원' | 'VIP' | '일반회원';
  membershipName?: string;
  visitedFacility: string;
  categoryCode?: string;
  todaySpend: number;
  ytdVisitCount: number; // 올해 누적 방문 횟수
  ytdTotalSpend: number; // 올해 누적 총 결제액
  firstVisitThisYear?: string;
  lastVisitDate?: string;
  visitHistory?: MemberVisitEntry[];
  tierBadge?: string;
  tierColor?: string;
}

export default function Members() {
  const { startDate, endDate } = useDate();

  const [visitors, setVisitors] = useState<MemberVisitorItem[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalVisitors: number;
    totalSpend: number;
    avgSpendPerMember: number;
    totalYtdSpend?: number;
    topLoyalMember?: {
      memberName: string;
      memberNo: string;
      ytdVisitCount: number;
      ytdTotalSpend: number;
    };
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedLoyaltyFilter, setSelectedLoyaltyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'YTD_VISITS' | 'TODAY_SPEND' | 'YTD_SPEND' | 'NAME'>('YTD_VISITS');
  const [selectedMemberModal, setSelectedMemberModal] = useState<MemberVisitorItem | null>(null);

  // Fetch Member Visitors from API
  const fetchMemberVisitors = async () => {
    setLoading(true);
    try {
      const queryParams = endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/report/daily-member-visitors?${queryParams}`).catch(() => null);
      const payload = res?.data ?? res;

      if (payload && (payload.visitors || payload.summary)) {
        setVisitors(payload.visitors || []);
        setSummaryData(payload.summary || null);
      } else {
        // Fallback to empty list
        setVisitors([]);
        setSummaryData(null);
      }
    } catch (err) {
      console.error('Member Visitors Fetch Error:', err);
      setVisitors([]);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberVisitors();
  }, [startDate, endDate]);

  // Enrich with loyalty tier badges
  const enrichedVisitors = useMemo(() => {
    return visitors.map(m => {
      const visits = m.ytdVisitCount || 1;
      let tierBadge = '신규 1회';
      let tierColor = 'bg-slate-100 text-slate-600 border-slate-200';

      if (visits >= 10 || m.ytdTotalSpend >= 15000000) {
        tierBadge = `👑 다이아 VIP (${visits}회)`;
        tierColor = 'bg-purple-100 text-purple-800 border-purple-200';
      } else if (visits >= 5 || m.ytdTotalSpend >= 8000000) {
        tierBadge = `🥇 골드 (${visits}회)`;
        tierColor = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (visits >= 2) {
        tierBadge = `🥈 실버 (${visits}회)`;
        tierColor = 'bg-blue-50 text-blue-700 border-blue-200';
      }

      return {
        ...m,
        tierBadge,
        tierColor
      };
    });
  }, [visitors]);

  // Filter and Sort
  const filteredAndSortedVisitors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = enrichedVisitors.filter(m => {
      const matchType = selectedTypeFilter === 'ALL' || m.memberType.includes(selectedTypeFilter);

      let matchLoyalty = true;
      if (selectedLoyaltyFilter === 'REPEAT') {
        matchLoyalty = m.ytdVisitCount >= 2;
      } else if (selectedLoyaltyFilter === 'VIP') {
        matchLoyalty = m.ytdVisitCount >= 5;
      } else if (selectedLoyaltyFilter === 'NEW') {
        matchLoyalty = m.ytdVisitCount === 1;
      }

      const matchSearch = !q ||
        m.memberName.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.membershipName && m.membershipName.toLowerCase().includes(q)) ||
        m.visitedFacility.toLowerCase().includes(q);

      return matchType && matchLoyalty && matchSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'YTD_VISITS') return b.ytdVisitCount - a.ytdVisitCount;
      if (sortBy === 'TODAY_SPEND') return b.todaySpend - a.todaySpend;
      if (sortBy === 'YTD_SPEND') return b.ytdTotalSpend - a.ytdTotalSpend;
      if (sortBy === 'NAME') return a.memberName.localeCompare(b.memberName, 'ko');
      return 0;
    });
  }, [enrichedVisitors, selectedTypeFilter, selectedLoyaltyFilter, searchQuery, sortBy]);

  // Computed summary metrics (SSOT Pure Consumer)
  const metrics = useMemo(() => {
    const totalCount = summaryData?.totalVisitors || enrichedVisitors.length;
    const totalSpend = summaryData?.totalSpend || 0;
    const avgSpend = summaryData?.avgSpendPerMember || (totalCount > 0 ? Math.round(totalSpend / totalCount) : 0);
    const totalYtdSpend = summaryData?.totalYtdSpend || 0;

    const sortedByYtd = [...enrichedVisitors].sort((a, b) => b.ytdVisitCount - a.ytdVisitCount);
    const topMember = sortedByYtd[0] || null;

    return {
      totalCount,
      totalSpend,
      avgSpend,
      totalYtdSpend,
      topMember: summaryData?.topLoyalMember || (topMember ? {
        memberName: topMember.memberName,
        memberNo: topMember.memberNo,
        ytdVisitCount: topMember.ytdVisitCount,
        ytdTotalSpend: topMember.ytdTotalSpend
      } : null)
    };
  }, [enrichedVisitors, summaryData]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide uppercase">
                MEMBERSHIP & VIP LOYALTY INTELLIGENCE
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <Award size={12} className="text-brand-mint" /> 회원 이용 실적 및 연간 방문 추적
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-400/30 font-medium">
                <Calendar size={12} className="text-emerald-300" />
                조회일: <strong>{startDate} {endDate ? `~ ${endDate}` : '(1일)'}</strong>
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <Award className="text-brand-mint" size={32} />
              회원 이용 실적 및 올해 누적 방문 횟수(YTD) 분석
            </h1>
            <p className="text-emerald-100 mt-2 text-sm lg:text-base font-normal max-w-3xl">
              선택된 날짜에 골프CC, 콘도 객실, 식음, 레저를 이용한 회원 리스트와 각 회원의 2026년 올해 총 방문 횟수의 합(YTD) 및 누적 기여액을 실시간 추적합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker showPresets={true} />
            <button
              onClick={fetchMemberVisitors}
              disabled={loading}
              className="px-4 py-2.5 bg-brand-mint hover:bg-emerald-400 active:bg-emerald-600 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary (4-Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Total Daily Members */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <User size={16} className="text-emerald-600" /> 당일 이용 회원수
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              선택일 기준
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 my-1">
            {metrics.totalCount.toLocaleString()} <span className="text-sm font-medium text-slate-400">명</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            골프 내장 회원 및 콘도 투숙 회원 전수 집계
          </p>
        </div>

        {/* Card 2: Total Daily Member Spend */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <DollarSign size={16} className="text-indigo-600" /> 당일 회원 총 이용액
            </span>
            <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              순매출 합계
            </span>
          </div>
          <div className="text-3xl font-black text-indigo-600 my-1">
            ₩{formatCurrency(metrics.totalSpend)} <span className="text-sm font-medium text-slate-400">원</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            회원 1인당 평균: <strong>₩{formatCurrency(metrics.avgSpend)}원</strong>
          </p>
        </div>

        {/* Card 3: 🏆 올해 최다 방문 충성 회원 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5">
              <Trophy size={16} className="text-purple-600" /> 올해 최다 방문 VIP
            </span>
            <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              2026 YTD 1위
            </span>
          </div>
          <div className="text-2xl font-black text-purple-800 my-1 truncate">
            {metrics.topMember ? `${metrics.topMember.memberName} (${metrics.topMember.ytdVisitCount}회)` : '-'}
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate">
            올해 누적 결제액: <strong>₩{formatCurrency(metrics.topMember?.ytdTotalSpend || 0)}원</strong>
          </p>
        </div>

        {/* Card 4: 올해 누적 회원 총 기여액 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Flame size={16} className="text-amber-500" /> 올해 회원 누적 LTV
            </span>
            <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              당해 연간 누적
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600 my-1">
            ₩{formatCurrency(metrics.totalYtdSpend)} <span className="text-sm font-medium text-slate-400">원</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            선택일 방문 회원들의 2026년 전체 누적 결제액
          </p>
        </div>

      </div>

      {/* Main Section: Search, Filters & Member Table */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        
        {/* Controls Bar */}
        <div className="space-y-4 border-b border-slate-100 pb-6 mb-6">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Member Type Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'ALL', label: `전체 회원 (${enrichedVisitors.length}명)` },
                { key: '골프', label: '⛳ 골프회원' },
                { key: '콘도', label: '🏢 콘도회원' },
                { key: '창립', label: '👑 창립/VIP' },
                { key: '지정', label: '👥 지정회원' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTypeFilter(t.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                    selectedTypeFilter === t.key
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 ring-offset-1 scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="회원명, 회원번호, 연락처, 이용업장 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Loyalty Sub-Filters & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Trophy size={14} className="text-purple-600" /> 올해 방문 필터:
              </span>
              <button
                onClick={() => setSelectedLoyaltyFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('VIP')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'VIP'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                👑 올해 5회 이상 VIP
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('REPEAT')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'REPEAT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                🔁 2회 이상 재방문
              </button>
              <button
                onClick={() => setSelectedLoyaltyFilter('NEW')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLoyaltyFilter === 'NEW'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🆕 올해 첫 방문 (1회)
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">정렬 기준:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="YTD_VISITS">🔥 올해 방문 횟수의 합 높은순 ▾</option>
                <option value="TODAY_SPEND">당일 결제액 높은순 ▾</option>
                <option value="YTD_SPEND">올해 누적 LTV 지출액 높은순 ▾</option>
                <option value="NAME">회원명 가나다순 ▾</option>
              </select>
            </div>
          </div>

        </div>

        {/* Member Visitors Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">회원번호 / 회원권명</th>
                <th className="py-3.5 px-4">회원명</th>
                <th className="py-3.5 px-4">회원 구분</th>
                <th className="py-3.5 px-4">연락처</th>
                <th className="py-3.5 px-4">당일 이용 시설/내역</th>
                <th className="py-3.5 px-4 text-right">당일 결제액 (원)</th>
                <th className="py-3.5 px-6 text-center">🔥 올해 총 방문 횟수의 합 (YTD)</th>
                <th className="py-3.5 px-6 text-right">올해 누적 이용액 (LTV)</th>
                <th className="py-3.5 px-4 text-center rounded-r-xl">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedVisitors.length > 0 ? (
                filteredAndSortedVisitors.map((member, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedMemberModal(member)}
                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-brand-mint flex-shrink-0" />
                        <span>{member.memberNo}</span>
                      </div>
                      {member.membershipName && (
                        <span className="text-[11px] text-slate-400 font-normal ml-6 block">
                          {member.membershipName}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-extrabold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{member.memberName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${member.tierColor}`}>
                          {member.tierBadge}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {member.memberType}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" />
                        {member.phone}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-bold">
                        {member.visitedFacility}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-black text-slate-900">
                      ₩{formatCurrency(member.todaySpend)}
                    </td>

                    {/* 🔥 올해 방문 횟수의 합 (YTD) */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-black shadow-xs ${
                        member.ytdVisitCount >= 10 ? 'bg-purple-600 text-white shadow-purple-200' :
                        member.ytdVisitCount >= 5 ? 'bg-amber-500 text-white shadow-amber-200' :
                        member.ytdVisitCount >= 2 ? 'bg-blue-600 text-white shadow-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        <Flame size={12} /> 올해 총 {member.ytdVisitCount}회 방문
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-bold text-slate-800">
                      ₩{formatCurrency(member.ytdTotalSpend)}원
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Award size={36} className="mx-auto text-slate-300" />
                      <p className="font-medium text-sm text-slate-600">
                        {startDate}에 방문한 회원 데이터가 없거나 백엔드 API 연동 준비 중입니다.
                      </p>
                      <p className="text-xs text-slate-400">
                        골프 CC 내장객 및 콘도 회원 원천 데이터가 연결되면 당일 방문 회원과 올해 누적 방문 횟수가 자동 집계됩니다.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Member Detail Modal (With 2026 YTD History Timeline) */}
      {selectedMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 lg:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {selectedMemberModal.memberType}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    {selectedMemberModal.tierBadge}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {selectedMemberModal.memberName} 회원 ({selectedMemberModal.memberNo})
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  회원권: {selectedMemberModal.membershipName || '정규 회원권'} · 연락처: {selectedMemberModal.phone}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMemberModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 🏆 2026 YTD Loyalty Summary Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[11px] font-bold text-emerald-300 block uppercase tracking-wide">
                  2026년 올해 총 방문 횟수의 합 (YTD)
                </span>
                <div className="text-3xl font-black text-amber-300 mt-0.5 flex items-center gap-2">
                  <Flame size={24} className="text-amber-400" />
                  올해 총 {selectedMemberModal.ytdVisitCount}회 방문
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 font-medium block">올해 누적 이용액 (LTV)</span>
                <span className="text-xl font-bold text-white">
                  ₩{formatCurrency(selectedMemberModal.ytdTotalSpend)}원
                </span>
              </div>
            </div>

            {/* Past Visit Timeline */}
            {selectedMemberModal.visitHistory && selectedMemberModal.visitHistory.length > 0 ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-600" /> 2026년 방문 히스토리 상세 ({selectedMemberModal.visitHistory.length}회 기록)
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedMemberModal.visitHistory.map((h, hIdx) => (
                    <div key={hIdx} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-700 mr-2">[{h.visitNo}회차]</span>
                        <span className="font-semibold text-slate-800">{h.date}</span>
                        <span className="text-slate-400 ml-2">({h.facility})</span>
                      </div>
                      <strong className="text-slate-900">₩{formatCurrency(h.spend)}원</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500">
                <span className="font-bold text-slate-700 block mb-1">방문 정보 요약</span>
                <div>• 당일 이용 시설: <strong>{selectedMemberModal.visitedFacility}</strong> (₩{formatCurrency(selectedMemberModal.todaySpend)}원)</div>
                <div>• 2026년 첫 방문일: {selectedMemberModal.firstVisitThisYear || selectedMemberModal.lastVisitDate || startDate}</div>
                <div>• 2026년 최근 방문일: {selectedMemberModal.lastVisitDate || startDate}</div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center bg-emerald-50/70 p-4 rounded-2xl text-emerald-950 border border-emerald-100">
              <div>
                <span className="text-xs text-emerald-700 font-semibold block">당일 결제 금액</span>
                <span className="text-xs text-slate-500">{startDate} 이용 내역</span>
              </div>
              <div className="text-2xl font-black text-emerald-900">
                ₩{formatCurrency(selectedMemberModal.todaySpend)}원
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
