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
      
      // V5 SSOT [REQ-V5-20260726-01]: 백엔드 단일 객체 리턴 개편 반영 및 날짜 반전 보정
      let validStart = startDate;
      let validEnd = endDate;
      if (validStart && validEnd && validStart > validEnd) {
        const temp = validStart;
        validStart = validEnd;
        validEnd = temp;
      }

      const queryParams = validEnd && validStart !== validEnd
        ? `startDate=${validStart}&endDate=${validEnd}&_t=${Date.now()}`
        : `date=${validStart || '2026-07-24'}&_t=${Date.now()}`;

      try {
        const res = await secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`);

        let corePayload = res.data || res;
        
        // V5 SSOT 강제화: 백엔드가 startDate ~ endDate 구간에 대해 
        // 100% 계산 완료된 단일 객체(Unified Object)를 반환한다고 가정합니다.
        // 프론트엔드 단에서의 배열 reduce(Slice Summation) 가공 로직은 바이블 원칙에 따라 전면 철거되었습니다.
        if (Array.isArray(corePayload)) {
          console.error("SSOT 위반 에러: 백엔드가 구간 요약 데이터 대신 배열을 반환했습니다. 통합된 객체 응답이 필요합니다.");
          // 배열이 올 경우 첫 번째 요소라도 사용하거나 빈 객체로 폴백 (에러 방지)
          corePayload = corePayload[0] || { summary: {} };
        } else if (res.weather && !corePayload.weather) {
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
