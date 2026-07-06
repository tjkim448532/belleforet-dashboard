import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';

interface GlobalDatePickerProps {
  allowRange?: boolean;
}

export default function GlobalDatePicker({ allowRange = true }: GlobalDatePickerProps) {
  const { startDate, endDate, isRange, setDateRange, setIsRange } = useDate();
  
  // Local Draft State
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [draftIsRange, setDraftIsRange] = useState(allowRange ? isRange : false);

  // Sync draft state with context if context changes externally
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    if (allowRange) {
      setDraftIsRange(isRange);
    }
  }, [startDate, endDate, isRange, allowRange]);

  const handleApply = () => {
    if (allowRange) {
      setIsRange(draftIsRange);
    } else {
      setIsRange(false);
    }
    
    // If single date, ensure endDate is same as startDate
    if (!draftIsRange) {
      setDateRange(draftStart, draftStart);
    } else {
      setDateRange(draftStart, draftEnd);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Toggle Buttons (only if range is allowed) */}
      {allowRange && (
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => {
              setDraftIsRange(false);
              setDraftEnd(draftStart);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !draftIsRange 
                ? 'bg-brand-mint text-white shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            단일 조회
          </button>
          <button
            onClick={() => setDraftIsRange(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              draftIsRange 
                ? 'bg-brand-mint text-white shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            기간 조회
          </button>
        </div>
      )}

      {/* Inputs & Apply Button */}
      <div className="flex items-center bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm text-white border border-white/15 focus-within:ring-2 focus-within:ring-brand-mint/50 transition-all">
        <span className="mr-2 opacity-80">🗓️</span>
        {!draftIsRange ? (
          <input 
            type="date" 
            value={draftStart} 
            onChange={(e) => {
              setDraftStart(e.target.value);
              setDraftEnd(e.target.value);
            }}
            className="bg-transparent border-none text-base font-medium text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={draftStart} 
              onChange={(e) => setDraftStart(e.target.value)}
              className="bg-transparent border-none text-base font-medium text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80"
            />
            <span className="text-white/50 font-medium">~</span>
            <input 
              type="date" 
              value={draftEnd} 
              onChange={(e) => setDraftEnd(e.target.value)}
              className="bg-transparent border-none text-base font-medium text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80"
            />
          </div>
        )}

        <button 
          onClick={handleApply}
          className="ml-4 bg-brand-mint hover:bg-emerald-400 text-white text-sm font-medium py-1 px-3 rounded-lg transition-colors shadow-sm"
        >
          조회
        </button>
      </div>
    </div>
  );
}
