import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
  startDate: string;
  endDate: string;
  isRange: boolean;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setIsRange: (isRange: boolean) => void;
  setDateRange: (start: string, end: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to the target date with real parsed data
  const [startDate, setStartDateState] = useState<string>(() => {
    return localStorage.getItem('startDate') || '2026-05-27';
  });
  const [endDate, setEndDateState] = useState<string>(() => {
    return localStorage.getItem('endDate') || '2026-05-27';
  });
  const [isRange, setIsRangeState] = useState<boolean>(() => {
    return localStorage.getItem('isRange') === 'true';
  });

  const setStartDate = (date: string) => {
    setStartDateState(date);
    localStorage.setItem('startDate', date);
  };

  const setEndDate = (date: string) => {
    setEndDateState(date);
    localStorage.setItem('endDate', date);
  };

  const setIsRange = (val: boolean) => {
    setIsRangeState(val);
    localStorage.setItem('isRange', String(val));
    
    // If range is disabled, sync endDate to startDate
    if (!val) {
      setEndDateState(startDate);
      localStorage.setItem('endDate', startDate);
    }
  };

  const setDateRange = (start: string, end: string) => {
    setStartDateState(start);
    setEndDateState(end);
    localStorage.setItem('startDate', start);
    localStorage.setItem('endDate', end);
  };

  return (
    <DateContext.Provider value={{
      startDate,
      endDate,
      isRange,
      setStartDate,
      setEndDate,
      setIsRange,
      setDateRange
    }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};
