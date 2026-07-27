import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
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

  const applyPreset = (preset: 'TODAY' | 'WEEK' | 'MTD' | 'H1') => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'TODAY') {
      setIsRangeMode(false);
      setDraftStart(todayStr);
      setDraftEnd(todayStr);
      setStartDate(todayStr);
      setEndDate(null);
    } else if (preset === 'WEEK') {
      setIsRangeMode(true);
      const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const wYyyy = weekAgo.getFullYear();
      const wMm = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const wDd = String(weekAgo.getDate()).padStart(2, '0');
      const weekAgoStr = `${wYyyy}-${wMm}-${wDd}`;
      setDraftStart(weekAgoStr);
      setDraftEnd(todayStr);
      setStartDate(weekAgoStr);
      setEndDate(todayStr);
    } else if (preset === 'MTD') {
      setIsRangeMode(true);
      const firstDayStr = `${yyyy}-${mm}-01`;
      setDraftStart(firstDayStr);
      setDraftEnd(todayStr);
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    } else if (preset === 'H1') {
      setIsRangeMode(true);
      const h1Start = `${yyyy}-01-01`;
      const h1End = `${yyyy}-06-30`;
      setDraftStart(h1Start);
      setDraftEnd(h1End);
      setStartDate(h1Start);
      setEndDate(h1End);
    }
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
        >
          오늘
        </button>
        <button 
          type="button"
          onClick={() => applyPreset('WEEK')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
        >
          최근7일
        </button>
        <button 
          type="button"
          onClick={() => applyPreset('MTD')} 
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-medium text-slate-200 transition-colors"
        >
          금월
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
