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
        
        // Array response handling: Synthesize period range metrics with valid settled day fallback
        if (Array.isArray(corePayload)) {
          const dailyArray = corePayload;
          const validDay = dailyArray.find((d: any) => (d.summary?.totalRevenue || 0) > 0) || dailyArray[0] || {};
          const latestYtdDay = [...dailyArray].reverse().find((d: any) => (d.summary?.ytdRevenue || 0) > 0) || validDay;

          let totalRev = 0;
          let totalRooms = 0;
          let totalVisitors = 0;
          let todayLyRev = 0;

          const categoryMap: Record<string, { code: string; name: string; actual: number }> = {};
          const roomTypeMap: Record<string, { type: string; sold: number; rev: number }> = {};

          dailyArray.forEach((dayItem: any) => {
            const s = dayItem.summary || {};
            totalRev += Number(s.totalRevenue || dayItem.totalRevenue || 0);
            totalRooms += Number(s.totalRooms || dayItem.totalRooms || 0);
            totalVisitors += Number(s.totalVisitors || dayItem.totalVisitors || 0);
            todayLyRev += Number(s.todayLyRevenue || s.lyRevenue || dayItem.todayLyRevenue || 0);

            if (dayItem.salesByCategory && Array.isArray(dayItem.salesByCategory)) {
              dayItem.salesByCategory.forEach((cat: any) => {
                const code = cat.categoryCode || cat.category_code || 'OTHER';
                const name = cat.categoryName || cat.category_name || code;
                const amt = Number(cat.todayActual || cat.totalSales || cat.sales || cat.revenue || 0);
                if (!categoryMap[code]) {
                  categoryMap[code] = { code, name, actual: 0 };
                }
                categoryMap[code].actual += amt;
              });
            }

            if (dayItem.roomSummaryByType && Array.isArray(dayItem.roomSummaryByType)) {
              dayItem.roomSummaryByType.forEach((rt: any) => {
                const type = rt.room_type || rt.roomType || '기타';
                const sold = Number(rt.rooms_sold || rt.roomsSold || 0);
                const rev = Number(rt.revenue || 0);
                if (!roomTypeMap[type]) {
                  roomTypeMap[type] = { type, sold: 0, rev: 0 };
                }
                roomTypeMap[type].sold += sold;
                roomTypeMap[type].rev += rev;
              });
            }
          });

          const salesByCategory = Object.values(categoryMap).map(c => ({
            categoryCode: c.code,
            categoryName: c.name,
            todayActual: c.actual,
            totalSales: c.actual
          }));

          const roomSummaryByType = Object.values(roomTypeMap).map(rt => ({
            roomType: rt.type,
            roomsSold: rt.sold,
            revenue: rt.rev
          }));

          corePayload = {
            isRangeQuery: true,
            startDate,
            endDate,
            summary: {
              totalRevenue: totalRev > 0 ? totalRev : (validDay.summary?.totalRevenue || 0),
              totalRooms: totalRooms > 0 ? totalRooms : (validDay.summary?.totalRooms || 0),
              totalVisitors: totalVisitors > 0 ? totalVisitors : (validDay.summary?.totalVisitors || 0),
              totalRoomCap: (validDay.summary?.totalRoomCap || 180) * dailyArray.length,
              ytdRevenue: latestYtdDay.summary?.ytdRevenue || validDay.summary?.ytdRevenue || 0,
              ytdLyRevenue: latestYtdDay.summary?.ytdLyRevenue || validDay.summary?.ytdLyRevenue || 0,
              todayLyRevenue: todayLyRev > 0 ? todayLyRev : (validDay.summary?.todayLyRevenue || 0),
              totalGolfTeams: dailyArray.reduce((acc, d) => acc + Number(d.summary?.totalGolfTeams || 0), 0),
              totalGolfVisitors: dailyArray.reduce((acc, d) => acc + Number(d.summary?.totalGolfVisitors || 0), 0),
            },
            salesByCategory: salesByCategory.length > 0 ? salesByCategory : (validDay.salesByCategory || []),
            salesByFacility: validDay.salesByFacility || [],
            roomSummaryByType: roomSummaryByType.length > 0 ? roomSummaryByType : (validDay.roomSummaryByType || []),
            dailyTrends: dailyArray,
            weather: validDay.weather || latestYtdDay.weather || null
          };
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
