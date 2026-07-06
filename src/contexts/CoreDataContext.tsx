import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';

export interface RawPayload {

  chartData: any[];
  adrTable: any[];
  today: { actual: number; ly_actual: number };
  ytd: { actual: number; ly_actual: number };
  golfSummary: any;
  roomTypeBreakdown: any[];
  channelBreakdown: any[];
  golfFacilityBreakdown: any[];
  fnbFacilityBreakdown: any[];
  ticketFacilityBreakdown: any[];
  otherFacilityBreakdown: any[];
  banquetFacilityBreakdown: any[];
  weeklyTrend: any[];
  targetDate: string;
  [key: string]: any;
}

export interface CoreDataState {
  core: any | null;
  summary: any | null;
  matrix: any | null;
  isLoading: boolean;
  error: string | null;
}

const CoreDataContext = createContext<CoreDataState | undefined>(undefined);

export const CoreDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { startDate, endDate } = useDate();
  
  const [state, setState] = useState<CoreDataState>({
    core: null,
    summary: null,
    matrix: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchCoreData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      
      // 백엔드 V4 표준 파라미터인 startDate, endDate를 모든 경우에 일관되게 사용합니다.
      const queryParams = `startDate=${startDate}&endDate=${endDate}`;

      try {
        const res = await secureFetcher(`${API_BASE}/api/v3/dashboard/revenue-summary?${queryParams}`);

        let corePayload = res.data || res;
        // 백엔드 응답에서 weather가 root 객체에 분리되어 내려올 경우 병합 처리
        if (res.weather && !corePayload.weather) {
          corePayload.weather = res.weather;
        }

        setState({
          core: corePayload,
          summary: null, // Merged into core
          matrix: null, 
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error("Error fetching parallel core APIs:", error);
        setState(prev => ({ ...prev, isLoading: false, error: '데이터를 불러오는 데 실패했습니다.' }));
      }
    };

    fetchCoreData();
  }, [startDate, endDate]);

  return (
    <CoreDataContext.Provider value={state}>
      {children}
    </CoreDataContext.Provider>
  );
};

export const useCoreData = () => {
  const context = useContext(CoreDataContext);
  if (context === undefined) {
    throw new Error('useCoreData must be used within a CoreDataProvider');
  }
  return context;
};
