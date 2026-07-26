import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';

export interface V5Payload {
  date: string;
  summary: Record<string, any>;
  salesByCategory: Array<{ categoryCode: string; categoryName: string; totalSales: number }>;
  salesByFacility: Array<{ categoryCode: string; shopName: string; totalSales: number; todayActual?: number; qty?: number; salesQty?: number; totalVisitors?: number; teamName?: string; partName?: string }>;
  dailyTrends: Array<{ date: string; revenue: number }>;
  weather?: { condition?: string; weatherDesc?: string; tempMax?: number; temp_max?: number; tempMin?: number; temp_min?: number; current?: any; lastYear?: any };
  roomSummaryByType?: Array<{ roomType: string; revenue: number; roomsSold: number }>;
  salesByChannel?: Array<{ channelGroup: string; revenue: number; roomsSold: number }>;
  dailyTrendsByCategory?: Array<{ date: string; category: string; revenue: number }>;
  advancedRoomStats?: { occRate?: number; mixPercent?: Record<string, number> };
  [key: string]: any; // Backward compatibility for legacy payloads
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
      
      // V5 SSOT: revenue-summary API는 단일 타겟 일자(date) 파라미터로 호출해야 요약 지표 및 카테고리별 매출을 반환함
      const targetDate = startDate || endDate || '2026-07-24';
      const queryParams = `date=${targetDate}&_t=${Date.now()}`;

      try {
        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`);

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
