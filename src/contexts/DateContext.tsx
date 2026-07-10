import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
  startDate: string; // Keeping name 'startDate' for compatibility in some parts, but effectively just 'date'
  setStartDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [startDate, setStartDateState] = useState<string>(() => {
    return localStorage.getItem('startDate') || '2026-05-27';
  });

  const setStartDate = (date: string) => {
    setStartDateState(date);
    localStorage.setItem('startDate', date);
    // Backward compat for clean slate
    localStorage.removeItem('endDate');
    localStorage.removeItem('isRange');
  };

  return (
    <DateContext.Provider value={{
      startDate,
      setStartDate
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
