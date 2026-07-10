import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';

export interface V5Payload {
  targetDate: string;
  summary: {
    totalRevenue: number;
    totalRooms: number;
    totalRoomCap: number;
    totalGolfTeams: number;
    totalVisitors?: number;
    ytdRevenue?: number;
    todayRevenue?: number;
    todayGross?: number;
  };
  salesByCategory: Array<{ category: string; sales: number }>;
  salesByFacility: Array<{ category_code: string; sub_group_name: string; total_sales: number; today_actual?: number; qty?: number; sales_qty?: number; total_visitors?: number; team_name?: string }>;
  dailyTrends: Array<{ date: string; revenue: number }>;
  weather?: { condition?: string; weatherDesc?: string; tempMax?: number; temp_max?: number; tempMin?: number; temp_min?: number; current?: any; lastYear?: any };
  roomSummaryByType?: Array<{ room_type: string; revenue: number; rooms_sold: number }>;
  salesByChannel?: Array<{ channel_group: string; revenue: number; rooms_sold: number }>;
  dailyTrendsByCategory?: Array<{ date: string; category: string; revenue: number }>;
  advancedRoomStats?: { occ_rate?: number; mix_percent?: Record<string, number> };
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
      
      // V5 SSOT: 단일 타겟 일자(date)와 필요 시 endDate(기간)를 전달
      const queryParams = endDate ? `date=${startDate}&endDate=${endDate}&_t=${Date.now()}` : `date=${startDate}&_t=${Date.now()}`;

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
