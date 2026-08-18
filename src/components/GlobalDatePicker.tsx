import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { Calendar, RefreshCw } from 'lucide-react';

export default function GlobalDatePicker() {
  const { startDate, endDate, setStartDate, setEndDate } = useDate();

  const [isRangeMode, setIsRangeMode] = useState<boolean>(() => {
    return !!endDate || localStorage.getItem('isRange') === 'true';
  });

  const [draftStart, setDraftStart] = useState<string>(startDate);
  const [draftEnd, setDraftEnd] = useState<string>(endDate || startDate);

  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate || startDate);
    if (endDate) {
      setIsRangeMode(true);
    }
  }, [startDate, endDate]);

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
      setStartDate(start);
      setEndDate(end);
    } else {
      setStartDate(draftStart);
      setEndDate(null);
    }
  };

  const applyPreset = (preset: DatePresetType) => {
    const res = getPresetDateRange(preset);
    setIsRangeMode(res.isRange);
    setDraftStart(res.startDate);
    setDraftEnd(res.endDate || res.startDate);
    setStartDate(res.startDate);
    setEndDate(res.endDate);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/25 backdrop-blur-md p-2 rounded-2xl border border-white/20 text-white shadow-lg">
      
      {/* Mode Switcher Buttons */}
      <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setIsRangeMode(false);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            !isRangeMode ? 'bg-brand-mint text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          단일 1일
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRangeMode(true);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            isRangeMode ? 'bg-brand-mint text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          기간 범위
        </button>
      </div>

      {/* Quick Presets */}
      <div className="hidden lg:flex items-center gap-1 border-l border-white/15 pl-2">
        <button 
          type="button"
          onClick={() => applyPreset('TODAY')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
          title="마감된 최신 영업일 (어제)"
        >
          오늘(어제)
        </button>
        <button 
          type="button"
          onClick={() => applyPreset('WEEK')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
          title="어제 기준 최근 7일간"
        >
          최근 7일
        </button>
        <button 
          type="button"
          onClick={() => applyPreset('MTD')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
          title="당월 1일 ~ 어제"
        >
          금월(당월)
        </button>
        <button 
          type="button"
          onClick={() => applyPreset('H1')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
        >
          상반기
        </button>
      </div>

      {/* Date Pickers & Apply Button */}
      <div className="flex items-center gap-2 border-l border-white/15 pl-2">
        <Calendar size={14} className="text-brand-mint flex-shrink-0" />
        
        <input 
          type="date" 
          value={draftStart} 
          onChange={(e) => setDraftStart(e.target.value)}
          className="bg-black/30 border border-white/20 text-white text-xs font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-brand-mint cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
        />

        {isRangeMode && (
          <>
            <span className="text-slate-300 text-xs font-bold">~</span>
            <input 
              type="date" 
              value={draftEnd} 
              onChange={(e) => setDraftEnd(e.target.value)}
              className="bg-black/30 border border-white/20 text-white text-xs font-medium rounded-xl px-2.5 py-1.5 outline-none focus:border-brand-mint cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
            />
          </>
        )}

        <button 
          type="button"
          onClick={handleApply}
          className="bg-brand-mint hover:bg-emerald-400 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
        >
          <RefreshCw size={12} />
          조회
        </button>
      </div>

    </div>
  );
}
