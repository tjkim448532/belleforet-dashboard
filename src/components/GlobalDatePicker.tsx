import { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';

export default function GlobalDatePicker() {
  const { startDate, setStartDate } = useDate();
  const [draftStart, setDraftStart] = useState(startDate);

  useEffect(() => {
    setDraftStart(startDate);
  }, [startDate]);

  const handleApply = () => {
    setStartDate(draftStart);
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Inputs & Apply Button */}
      <div className="flex items-center bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm text-white border border-white/15 focus-within:ring-2 focus-within:ring-brand-mint/50 transition-all">
        <span className="mr-2 opacity-80">🗓️</span>
        <input 
          type="date" 
          value={draftStart} 
          onChange={(e) => setDraftStart(e.target.value)}
          className="bg-transparent border-none text-base font-medium text-white outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
        />

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
