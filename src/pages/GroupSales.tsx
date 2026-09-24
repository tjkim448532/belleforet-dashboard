import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { Building2, DollarSign, Users, RefreshCw, BedDouble, TrendingUp } from 'lucide-react';
import type { CorporateGroupSalesV2Response } from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function GroupSales() {
  const { startDate, endDate, setStartDate, setEndDate } = useDate();
  
  const [data, setData] = useState<CorporateGroupSalesV2Response | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        : `startDate=${startDate}&endDate=${startDate}`;

      const res = await secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales-v2?${queryParams}`).catch(() => null);
      if (res?.data && res.data.success) {
        setData(res.data);
      } else if (res && res.success) {
        setData(res);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Corporate Group Sales Fetch Error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupSales();
  }, [startDate, endDate]);

  const summary = data?.meta?.summary;
  const segments = data?.segments || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100/80">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight break-keep whitespace-nowrap">
                법인/단체 객실 실적
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                V2
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 break-keep">
              법인 및 단체의 객실 실적을 세그먼트별로 정확히 분석합니다. (SSOT)
            </p>
          </div>
        </div>

        {/* Global Date & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { key: 'WEEK', label: '최근 7일' },
              { key: 'MTD', label: '당월' },
              { key: 'PAST_6M', label: '6개월' },
              { key: 'YTD', label: '연간' }
            ].map(p => {
              const active = isPresetActive(p.key as DatePresetType);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key as DatePresetType)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <GlobalDatePicker showPresets={false} />
          <button
            onClick={fetchGroupSales}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            조회
          </button>
        </div>
      </div>

      {/* 2. Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign size={15} className="text-emerald-600" /> 총 매출액
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
              순매출
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {summary?.totalRevenueFormatted || '0'}원
            </div>
          </div>
        </div>

        {/* Card 2: Rooms Sold */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BedDouble size={15} className="text-blue-600" /> 판매 객실
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {summary?.totalRoomsSoldFormatted || '0'}
              <span className="text-sm font-semibold text-slate-500 ml-1">실</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Guests */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <Users size={15} className="text-purple-600" /> 총 투숙객
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {summary?.totalGuestsFormatted || '0'}
              <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
            </div>
          </div>
        </div>

        {/* Card 4: ADR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp size={15} className="text-amber-600" /> ADR (객단가)
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums whitespace-nowrap">
              {summary?.adrFormatted || '0'}원
            </div>
          </div>
        </div>

      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-5 overflow-hidden">
        <h3 className="text-lg font-black text-slate-900">세그먼트별 실적 상세</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-sm font-bold text-slate-900">
                <th className="py-4 px-4 whitespace-nowrap">세그먼트 그룹</th>
                <th className="py-4 px-4 whitespace-nowrap">세그먼트명</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">판매 객실</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">매출액</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">투숙객</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">ADR</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {segments.map((seg, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md">
                      {seg.ticketGroup || (seg as any).segment_name || (seg as any).ticket_group}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-bold text-slate-800 whitespace-nowrap">{seg.venueName || (seg as any).venue_name}</td>
                  <td className="py-4 px-4 text-sm text-right text-slate-700 whitespace-nowrap">{seg.roomsSoldFormatted || (seg as any).rooms_sold_formatted}</td>
                  <td className="py-4 px-4 text-sm font-bold text-slate-900 text-right whitespace-nowrap">{seg.revenueFormatted || (seg as any).revenue_formatted}</td>
                  <td className="py-4 px-4 text-sm text-right text-slate-700 whitespace-nowrap">{seg.guestCountFormatted || (seg as any).visitor_count_formatted}</td>
                  <td className="py-4 px-4 text-sm text-right text-slate-700 whitespace-nowrap">{seg.adrFormatted || ((seg as any).adr ? (seg as any).adr.toLocaleString() : (Number((seg as any).rooms_sold || 0) > 0 ? Math.round(Number((seg as any).revenue || 0) / Number((seg as any).rooms_sold)).toLocaleString() : "-"))}</td>
                  <td className="py-4 px-4 text-sm text-right font-medium text-slate-500 whitespace-nowrap">
                    {Number(seg.revenueSharePct ?? (seg as any).revenue_share_pct ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {segments.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    해당 기간의 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
