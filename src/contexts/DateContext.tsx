import React, { createContext, useContext, useState, useCallback } from 'react';
import { getLatestClosedDateStr } from '../lib/dateUtils';

interface DateContextType {
  startDate: string;
  endDate: string | null;
  isRange: boolean;
  setStartDate: (date: string) => void;
  setEndDate: (date: string | null) => void;
  setIsRange: (isRange: boolean) => void;
  setDateRange: (startDate: string, endDate: string | null, isRange?: boolean) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [startDate, setStartDateState] = useState<string>(() => {
    return localStorage.getItem('startDate') || getLatestClosedDateStr();
  });
  
  const [endDate, setEndDateState] = useState<string | null>(() => {
    return localStorage.getItem('endDate') || null;
  });

  const [isRange, setIsRangeState] = useState<boolean>(() => {
    return localStorage.getItem('isRange') === 'true';
  });

  const setStartDate = useCallback((date: string) => {
    setStartDateState(date);
    localStorage.setItem('startDate', date);
  }, []);
  
  const setEndDate = useCallback((date: string | null) => {
    setEndDateState(date);
    if (date) {
      localStorage.setItem('endDate', date);
      localStorage.setItem('isRange', 'true');
      setIsRangeState(true);
    } else {
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');
      setIsRangeState(false);
    }
  }, []);

  const setIsRange = useCallback((range: boolean) => {
    setIsRangeState(range);
    if (range) {
      localStorage.setItem('isRange', 'true');
    } else {
      localStorage.removeItem('isRange');
      localStorage.removeItem('endDate');
      setEndDateState(null);
    }
  }, []);

  const setDateRange = useCallback((start: string, end: string | null, rangeMode?: boolean) => {
    const effectiveRange = rangeMode !== undefined ? rangeMode : (!!end && start !== end);
    setStartDateState(start);
    setEndDateState(effectiveRange ? end : null);
    setIsRangeState(effectiveRange);
    
    localStorage.setItem('startDate', start);
    if (end && effectiveRange) {
      localStorage.setItem('endDate', end);
      localStorage.setItem('isRange', 'true');
    } else {
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');
    }
  }, []);

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
