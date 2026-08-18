import { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  Building2, Phone, DollarSign, Search, 
  ChevronRight, RefreshCw, Layers, Award, Calendar, Check
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export interface GroupFacilityItem {
  facilityName: string;
  category: 'ROOM' | 'BANQUET' | 'FNB' | 'GOLF' | 'LEISURE' | 'OTHER';
  revenue: number;
}

export interface CorporateGroupItem {
  groupId: string;
  groupName: string;
  category: 'RESORT_CORP' | 'SEMINAR' | 'GOLF_GROUP' | 'BANQUET' | 'OTHER';
  categoryName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  salesManager?: string;
  checkInDate: string;
  checkOutDate: string;
  stayDays: number;
  paxCount: number;
  totalRevenue: number;
  avgSpendPerPax: number;
  spendingBreakdown: {
    roomRevenue: number;
    roomsCount?: number;
    roomTypesUsed?: string[];
    fnbRevenue: number;
    golfRevenue: number;
    golfTeams?: number;
    leisureRevenue: number;
  };
  facilitiesUsed: GroupFacilityItem[];
  paymentMethod?: string;
  notes?: string;
}

export default function GroupSales() {
  const { startDate, endDate, setStartDate, setEndDate } = useDate();
  
  const [groupList, setGroupList] = useState<CorporateGroupItem[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalGroups: number;
    totalPax: number;
    totalRevenue: number;
    avgSpendPerGroup: number;
    avgSpendPerPax: number;
    roomRevenue: number;
    fnbRevenue: number;
    golfRevenue: number;
    leisureRevenue: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<CorporateGroupItem | null>(null);

  const applyPreset = (preset: DatePresetType) => {
    const range = getPresetDateRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const isPresetActive = (preset: DatePresetType) => {
    const p = getPresetDateRange(preset);
    if (p.isRange) {
      return startDate === p.startDate && endDate === p.endDate;
    }
    return startDate === p.startDate && !endDate;
  };

  const fetchGroupSales = async () => {
    setLoading(true);
    try {
      const queryParams = endDate
        ? `startDate=${startDate}&endDate=${endDate}`
        : `date=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v5/report/corporate-group-sales?${queryParams}`).catch(() => null);
      const payload = res?.data ?? res;

      if (payload && (payload.groups || payload.summary)) {
        setGroupList(payload.groups || []);
        setSummaryData(payload.summary || null);
      } else {
        // API 대기 상태 - 빈 배열로 안전 초기화 (가짜 데이터 표시 금지)
        setGroupList([]);
        setSummaryData(null);
      }
    } catch (err) {
      console.error('Corporate Group Sales Fetch Error:', err);
      setGroupList([]);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupSales();
  }, [startDate, endDate]);

  // 필터링 및 검색 적용
  const filteredGroups = useMemo(() => {
    return groupList.filter(g => {
      const matchCategory = selectedCategory === 'ALL' || g.category === selectedCategory;
      const matchSearch = !searchKeyword.trim() || 
        g.groupName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        g.contactPhone.includes(searchKeyword);
      return matchCategory && matchSearch;
    });
  }, [groupList, selectedCategory, searchKeyword]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: groupList.length,
      RESORT_CORP: groupList.filter(g => g.category === 'RESORT_CORP').length,
      SEMINAR: groupList.filter(g => g.category === 'SEMINAR').length,
      GOLF_GROUP: groupList.filter(g => g.category === 'GOLF_GROUP').length,
      BANQUET: groupList.filter(g => g.category === 'BANQUET').length,
    };
  }, [groupList]);

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-indigo-400/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 tracking-wide uppercase">
                B2B CORPORATE & GROUP SALES INTELLIGENCE
              </span>
              <span className="bg-white/10 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                <Building2 size={12} className="text-indigo-400" /> 단체 고객 정밀 분석
              </span>
              <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-indigo-400/30 font-medium">
                <Calendar size={12} className="text-indigo-300" />
                조회 기간: <strong>{startDate} {endDate ? `~ ${endDate}` : '(1일)'}</strong>
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <Building2 className="text-indigo-400" size={32} />
              영업 / 단체(B2B) 실적 및 이용 동선 분석
            </h1>
            <p className="text-indigo-100 mt-2 text-sm lg:text-base font-normal max-w-3xl">
              기업 휴양소, 세미나/워크샵, 골프 단체, 만찬 연회 등 B2B 단체별 담당자 연락처, 총 매출 지출액, 객실·식음·골프·레저 교차 이용 동선을 6개월/1년 단위로 전수 분석합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker showPresets={false} />
            <button
              onClick={fetchGroupSales}
              disabled={loading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        {/* 6개월 / 1년 빠른 기간 선택 퀵 바 */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-indigo-300 font-bold mr-1 flex items-center gap-1">
            <Calendar size={14} /> 빠른 기간 선택:
          </span>

          {[
            { key: 'TODAY', label: '오늘(어제)' },
            { key: 'WEEK', label: '최근 7일' },
            { key: 'MTD', label: '금월(당월)' },
            { key: 'H1', label: '상반기 (1~6월)' },
            { key: 'PAST_6M', label: '📅 최근 6개월 (180일 누적)' },
            { key: 'YTD', label: '📊 연간 누적 (1월~현재)' },
            { key: 'PAST_1Y', label: '🏆 최근 1년 (365일 전수)' },
          ].map(p => {
            const active = isPresetActive(p.key as DatePresetType);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key as DatePresetType)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none flex items-center gap-1.5 ${
                  active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 hover:border-white/25'
                }`}
              >
                {active && <Check size={13} className="text-white" />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Overview Summary (4-Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Total Groups */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 size={16} className="text-indigo-600" /> 유치 단체수
            </span>
            <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              B2B 모수
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 my-1">
            {summaryData?.totalGroups || groupList.length} <span className="text-sm font-medium text-slate-400">개 단체</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            총 참여 인원: <strong>{(summaryData?.totalPax || 0).toLocaleString()}명</strong>
          </p>
        </div>

        {/* Card 2: Total B2B Revenue */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <DollarSign size={16} className="text-emerald-600" /> 단체 총 발생 매출
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              순매출 기준
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 my-1">
            ₩{formatCurrency(summaryData?.totalRevenue || 0)} <span className="text-sm font-medium text-slate-400">원</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            단체당 평균: ₩{formatCurrency(summaryData?.avgSpendPerGroup || 0)}원
          </p>
        </div>

        {/* Card 3: 1인당 평균 객단가 (ARPU) */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Award size={16} className="text-amber-500" /> 1인당 평균 지출액
            </span>
            <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              B2B ARPU
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600 my-1">
            ₩{formatCurrency(summaryData?.avgSpendPerPax || 0)} <span className="text-sm font-medium text-slate-400">원/인</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            일반 개인 고객 대비 높은 부대시설 동반 지출
          </p>
        </div>

        {/* Card 4: 부대시설 교차 매출 비중 */}
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Layers size={16} className="text-cyan-600" /> 부대시설 교차 기여
            </span>
            <span className="text-[11px] font-extrabold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
              식음·골프·레저
            </span>
          </div>
          <div className="text-3xl font-black text-cyan-600 my-1">
            {summaryData && summaryData.totalRevenue > 0
              ? Math.round(((summaryData.fnbRevenue + summaryData.golfRevenue + summaryData.leisureRevenue) / summaryData.totalRevenue) * 100)
              : 0}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            식음 ₩{formatCurrency(summaryData?.fnbRevenue || 0)} · 골프 ₩{formatCurrency(summaryData?.golfRevenue || 0)}
          </p>
        </div>

      </div>

      {/* Main Section: Search, Filters & Group Ledger Table */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
        
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          
          {/* Segment Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 단체 ({categoryCounts.ALL}개)
            </button>
            <button
              onClick={() => setSelectedCategory('RESORT_CORP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                selectedCategory === 'RESORT_CORP'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 ring-offset-1 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏢 기업 휴양소 ({categoryCounts.RESORT_CORP}개)
            </button>
            <button
              onClick={() => setSelectedCategory('SEMINAR')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                selectedCategory === 'SEMINAR'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👥 세미나/워크샵 ({categoryCounts.SEMINAR}개)
            </button>
            <button
              onClick={() => setSelectedCategory('GOLF_GROUP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                selectedCategory === 'GOLF_GROUP'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 ring-offset-1 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⛳ 골프 단체 ({categoryCounts.GOLF_GROUP}개)
            </button>
            <button
              onClick={() => setSelectedCategory('BANQUET')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer select-none ${
                selectedCategory === 'BANQUET'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 ring-offset-1 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🍽️ 연회/만찬 ({categoryCounts.BANQUET}개)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="단체명, 담당자, 연락처 검색..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Group Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-6 rounded-l-xl">단체명 / 기업명</th>
                <th className="py-3.5 px-4">구분</th>
                <th className="py-3.5 px-4">담당자 / 연락처</th>
                <th className="py-3.5 px-4">행사 기간 (체류)</th>
                <th className="py-3.5 px-4 text-right">인원 (명)</th>
                <th className="py-3.5 px-6 text-right">총 결제액 (원)</th>
                <th className="py-3.5 px-6">이용 영업장 내역</th>
                <th className="py-3.5 px-4 text-center rounded-r-xl">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedGroupModal(group)}
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600 flex-shrink-0" />
                        <span>{group.groupName}</span>
                      </div>
                      {group.salesManager && (
                        <span className="text-[11px] text-slate-400 font-normal ml-6 block">
                          영업 담당: {group.salesManager}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {group.categoryName || group.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{group.contactName}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {group.contactPhone}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-600">
                      <div>{group.checkInDate} ~ {group.checkOutDate}</div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {group.stayDays}박
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-medium text-slate-800">
                      {group.paxCount.toLocaleString()}명
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ₩{formatCurrency(group.totalRevenue)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        인당 ₩{formatCurrency(group.avgSpendPerPax)}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 flex-wrap">
                        {group.facilitiesUsed?.slice(0, 3).map((f, fIdx) => (
                          <span key={fIdx} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium">
                            {f.facilityName}
                          </span>
                        ))}
                        {(group.facilitiesUsed?.length || 0) > 3 && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            +{(group.facilitiesUsed?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Building2 size={36} className="mx-auto text-slate-300" />
                      <p className="font-medium text-sm text-slate-600">
                        조회된 기간 내 B2B 단체 실적 데이터가 없거나 백엔드 API 연동 준비 중입니다.
                      </p>
                      <p className="text-xs text-slate-400">
                        산하 PMS 및 연회/골프 POS 단체 원천 데이터를 연결하면 본 테이블에 실시간 집계됩니다.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Group Detail Modal */}
      {selectedGroupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 lg:p-8 shadow-2xl border border-slate-100 space-y-6">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {selectedGroupModal.categoryName || selectedGroupModal.category}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedGroupModal.groupName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  행사 기간: {selectedGroupModal.checkInDate} ~ {selectedGroupModal.checkOutDate} ({selectedGroupModal.stayDays}박) · 총 {selectedGroupModal.paxCount}명 참가
                </p>
              </div>
              <button 
                onClick={() => setSelectedGroupModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Contact & Account Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              <div>
                <span className="text-slate-400 block mb-0.5">단체 담당자</span>
                <strong className="text-slate-900 text-sm">{selectedGroupModal.contactName}</strong>
                <span className="block text-slate-500 mt-0.5">{selectedGroupModal.contactPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">결제 방식 / 영업 담당</span>
                <strong className="text-slate-900">{selectedGroupModal.paymentMethod || '법인 후정산'}</strong>
                <span className="block text-slate-500 mt-0.5">{selectedGroupModal.salesManager || '영업팀'}</span>
              </div>
            </div>

            {/* Facility Spending Ledger */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Layers size={16} className="text-indigo-600" /> 이용 영업장 및 지출 상세
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedGroupModal.facilitiesUsed?.map((fac, fIdx) => (
                  <div key={fIdx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{fac.facilityName}</span>
                    <strong className="text-slate-900">₩{formatCurrency(fac.revenue)}원</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center bg-indigo-50/70 p-4 rounded-2xl text-indigo-950 border border-indigo-100">
              <div>
                <span className="text-xs text-indigo-700 font-semibold block">총 발생 결제액</span>
                <span className="text-xs text-slate-500">1인당 평균 ₩{formatCurrency(selectedGroupModal.avgSpendPerPax)}원</span>
              </div>
              <div className="text-2xl font-black text-indigo-900">
                ₩{formatCurrency(selectedGroupModal.totalRevenue)}원
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
