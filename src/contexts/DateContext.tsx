import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
  startDate: string;
  endDate: string | null;
  setStartDate: (date: string) => void;
  setEndDate: (date: string | null) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [startDate, setStartDateState] = useState<string>(() => {
    return localStorage.getItem('startDate') || '2026-05-27';
  });
  
  const [endDate, setEndDateState] = useState<string | null>(() => {
    return localStorage.getItem('endDate') || null;
  });

  const setStartDate = (date: string) => {
    setStartDateState(date);
    localStorage.setItem('startDate', date);
  };
  
  const setEndDate = (date: string | null) => {
    setEndDateState(date);
    if (date) {
      localStorage.setItem('endDate', date);
      localStorage.setItem('isRange', 'true');
    } else {
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');
    }
  };

  return (
    <DateContext.Provider value={{
      startDate,
      endDate,
      setStartDate,
      setEndDate
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
