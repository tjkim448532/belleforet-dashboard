import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { Calendar, RefreshCw } from 'lucide-react';

export default function GlobalDatePicker({ showPresets = true }: { showPresets?: boolean }) {
  const { startDate, endDate, isRange, setDateRange } = useDate();

  const [isRangeMode, setIsRangeMode] = useState<boolean>(isRange);
  const [draftStart, setDraftStart] = useState<string>(startDate);
  const [draftEnd, setDraftEnd] = useState<string>(endDate || startDate);

  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate || startDate);
    setIsRangeMode(isRange);
  }, [startDate, endDate, isRange]);

  const handleApply = () => {
    if (isRangeMode && draftEnd) {
      let start = draftStart;
      let end = draftEnd;
      // Auto-swap if start > end to prevent 404 API error
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
        setDraftStart(start);
        setDraftEnd(end);
      }
      setDateRange(start, end, true);
    } else {
      setDateRange(draftStart, null, false);
    }
  };

  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setDraftStart(res.startDate);
    setDraftEnd(res.endDate || res.startDate);
    setDateRange(res.startDate, res.endDate, res.isRange);
  };

  // Helper to determine if a preset matches current startDate & endDate
  const isPresetActive = (preset: DatePresetType) => {
    const p = getPresetDateRange(preset);
    if (p.isRange) {
      return startDate === p.startDate && endDate === p.endDate;
    }
    return startDate === p.startDate && !endDate;
  };

  return (
    <div className="flex items-center gap-1.5 bg-[#1B382E]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 text-white shadow-xl flex-wrap lg:flex-nowrap transition-all duration-200">
      
      {/* Mode Switcher Buttons */}
      <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsRangeMode(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none whitespace-nowrap cursor-pointer ${
            !isRangeMode 
              ? 'bg-[#B59269] text-white shadow-sm ring-1 ring-white/20 font-bold' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          단일 1일
        </button>
        <button
          type="button"
          onClick={() => setIsRangeMode(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none whitespace-nowrap cursor-pointer ${
            isRangeMode 
              ? 'bg-[#B59269] text-white shadow-sm ring-1 ring-white/20 font-bold' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          기간 범위
        </button>
      </div>

      {/* Quick Presets (Optional compact) */}
      {showPresets && (
        <div className="hidden xl:flex items-center gap-1 border-l border-white/15 pl-1.5 flex-shrink-0">
          {(['TODAY', 'WEEK', 'MTD', 'YTD'] as DatePresetType[]).map(p => {
            const active = isPresetActive(p);
            const labelMap: Record<string, string> = {
              TODAY: '어제 (D-1)',
              WEEK: '7일',
              MTD: '당월',
              YTD: '연간'
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 select-none whitespace-nowrap cursor-pointer ${
                  active 
                    ? 'bg-[#B59269] text-white shadow-xs font-bold ring-1 ring-white/30' 
                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                }`}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>
      )}

      {/* Date Pickers & Apply Button */}
      <div className="flex items-center gap-1.5 border-l border-white/15 pl-1.5 flex-shrink-0">
        <Calendar size={14} className="text-[#CAAC86] flex-shrink-0" />
        
        <input 
          type="date" 
          value={draftStart} 
          onChange={(e) => setDraftStart(e.target.value)}
          className="bg-black/30 hover:bg-black/40 focus:bg-black/50 border border-white/20 text-white text-xs font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-[#B59269] focus:ring-1 focus:ring-[#B59269] cursor-pointer [&::-webkit-calendar-picker-indicator]:invert whitespace-nowrap transition-colors"
        />

        {isRangeMode && (
          <>
            <span className="text-white/70 text-xs font-bold px-0.5">~</span>
            <input 
              type="date" 
              value={draftEnd} 
              onChange={(e) => setDraftEnd(e.target.value)}
              className="bg-black/30 hover:bg-black/40 focus:bg-black/50 border border-white/20 text-white text-xs font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-[#B59269] focus:ring-1 focus:ring-[#B59269] cursor-pointer [&::-webkit-calendar-picker-indicator]:invert whitespace-nowrap transition-colors"
            />
          </>
        )}

        <button 
          type="button"
          onClick={handleApply}
          className="bg-[#B59269] hover:bg-[#9E7542] active:scale-95 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all duration-150 shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none"
        >
          <RefreshCw size={12} className="shrink-0" />
          <span>조회</span>
        </button>
      </div>

    </div>
  );
}
