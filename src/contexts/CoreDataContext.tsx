import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';

export interface V6Payload {
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
      
      // V6 SSOT [REQ-V6-20260726-01]: 백엔드 단일 객체 리턴 개편 반영 및 날짜 반전 보정
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

      // 전년 비교일자 파라미터 (단일일: 52주전 동요일, 기간: 1년전 동일구간)
      let lyQueryParams = '';
      if (validEnd && validStart !== validEnd) {
        const sLy = new Date(validStart);
        sLy.setFullYear(sLy.getFullYear() - 1);
        const eLy = new Date(validEnd);
        eLy.setFullYear(eLy.getFullYear() - 1);
        lyQueryParams = `startDate=${sLy.toISOString().split('T')[0]}&endDate=${eLy.toISOString().split('T')[0]}&_t=${Date.now()}`;
      } else {
        const d = new Date(validStart || '2026-07-24');
        const lyD = new Date(d.getTime() - 364 * 24 * 60 * 60 * 1000);
        lyQueryParams = `date=${lyD.toISOString().split('T')[0]}&_t=${Date.now()}`;
      }

      try {
        // [SSOT 다중 검증] revenue-summary, matrix-weekly, 전년 동기 revenue-summary, 그리고 golf-channel-teetime-analysis를 병렬 호출
        const [res, matrixRes, lyRes, golfChannelRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${lyQueryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/report/golf-channel-teetime-analysis?${queryParams}`).catch(() => null)
        ]);

        let corePayload = res?.data || res || {};
        const matrixPayload = matrixRes?.data || matrixRes;
        const lyPayload = lyRes?.data || lyRes;
        const golfChannelPayload = golfChannelRes?.data || golfChannelRes || {};

        if (Array.isArray(corePayload)) {
          corePayload = corePayload[0] || { summary: {} };
        } else if (res?.weather && !corePayload.weather) {
          corePayload.weather = res.weather;
        }

        if (!corePayload.summary) corePayload.summary = {};

        // 골프 채널별 분석 데이터 주입 (자사 평균, OTA 평균, 회원 평균)
        if (golfChannelPayload) {
          const channels = golfChannelPayload.salesByChannel || [];
          const directCh = channels.find((c: any) => c.channelCode === 'DIRECT_WEB' || c.channelName?.includes('자사'));
          const otaCh = channels.find((c: any) => c.channelCode === 'OTA_AGENCY' || c.channelName?.includes('OTA'));
          
          if (directCh) {
            corePayload.summary.golfDirectAvgGreenFee = Number(directCh.avgGreenFeePerPlayer || (directCh.visitedPlayers > 0 ? Math.round(directCh.greenFeeRevenue / directCh.visitedPlayers) : 0));
            corePayload.summary.golfDirectPlayers = directCh.visitedPlayers || 0;
            corePayload.summary.golfDirectRevenue = directCh.greenFeeRevenue || 0;
          }
          if (otaCh) {
            corePayload.summary.golfOtaAvgGreenFee = Number(otaCh.avgGreenFeePerPlayer || (otaCh.visitedPlayers > 0 ? Math.round(otaCh.greenFeeRevenue / otaCh.visitedPlayers) : 0));
            corePayload.summary.golfOtaPlayers = otaCh.visitedPlayers || 0;
            corePayload.summary.golfOtaRevenue = otaCh.greenFeeRevenue || 0;
          }
          if (golfChannelPayload.golfSummary?.avgGreenFeePerPlayer && !corePayload.summary.golfAvgGreenFee) {
            corePayload.summary.golfAvgGreenFee = golfChannelPayload.golfSummary.avgGreenFeePerPlayer;
          }
        }

        // 전년 동기/동요일 숙박객 수 및 증감률 주입
        const lyRoomCap = Number(String(lyPayload?.summary?.totalRoomCap || 0).replace(/,/g, '')) || 0;
        const lyRooms = Number(String(lyPayload?.summary?.totalRooms || 0).replace(/,/g, '')) || 0;
        if (lyRoomCap > 0) {
          corePayload.summary.totalRoomCapLy = lyRoomCap;
          corePayload.summary.totalRoomsLy = lyRooms;
          const currCap = Number(String(corePayload.summary.totalRoomCap || 0).replace(/,/g, '')) || 0;
          if (currCap > 0) {
            corePayload.summary.roomCapGrowth = Number((((currCap - lyRoomCap) / lyRoomCap) * 100).toFixed(1));
            corePayload.summary.roomCapDiff = currCap - lyRoomCap;
          }
        }

        // matrix-weekly SSOT 데이터로 결측치 및 0원 결측 자동 보정
        if (Array.isArray(matrixPayload) && matrixPayload.length > 0) {
          const grandTotal = matrixPayload.find((r: any) => r.isGrandTotal);
          const subtotals = matrixPayload.filter((r: any) => r.isSubtotal && !r.isGrandTotal);
          const facilities = matrixPayload.filter((r: any) => !r.isSubtotal && !r.isGrandTotal);

          const hasRevSummarySales = Number(corePayload.summary.totalRevenue || 0) > 0;
          if (!hasRevSummarySales && grandTotal) {
            corePayload.summary.totalRevenue = Number(String(grandTotal.todayActual || 0).replace(/,/g, '')) || 0;
            if (!corePayload.summary.todayLyRevenue || Number(corePayload.summary.todayLyRevenue) === 0) {
              corePayload.summary.todayLyRevenue = Number(String(grandTotal.todayLy || 0).replace(/,/g, '')) || 0;
            }
            if (corePayload.summary.todayGrowth === undefined || corePayload.summary.todayGrowth === null || Number(corePayload.summary.todayGrowth) === -100) {
              corePayload.summary.todayGrowth = Number(grandTotal.todayGrowth || 0);
            }
            if (!corePayload.summary.ytdActual || Number(corePayload.summary.ytdActual) === 0) {
              corePayload.summary.ytdActual = Number(String(grandTotal.ytdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.ytdLy || Number(corePayload.summary.ytdLy) === 0) {
              corePayload.summary.ytdLy = Number(String(grandTotal.ytdLy || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.mtdRevenue || Number(corePayload.summary.mtdRevenue) === 0) {
              corePayload.summary.mtdRevenue = Number(String(grandTotal.mtdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.mtdLy || Number(corePayload.summary.mtdLy) === 0) {
              corePayload.summary.mtdLy = Number(String(grandTotal.mtdLy || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.totalVisitors || Number(corePayload.summary.totalVisitors) === 0) {
              corePayload.summary.totalVisitors = grandTotal.visitors || 0;
            }
          }

          const hasCategorySales = Array.isArray(corePayload.salesByCategory) && corePayload.salesByCategory.some((c: any) => Number(c.totalSales || c.todayActual || 0) > 0);
          if (!hasCategorySales && subtotals.length > 0) {
            corePayload.salesByCategory = subtotals.map((s: any) => ({
              categoryCode: s.categoryCode,
              categoryName: s.categoryName,
              todayActual: Number(String(s.todayActual || 0).replace(/,/g, '')) || 0,
              totalSales: Number(String(s.todayActual || 0).replace(/,/g, '')) || 0,
              lyActual: Number(String(s.todayLy || 0).replace(/,/g, '')) || 0,
              growthRate: Number(s.todayGrowth || 0),
              isSubtotal: 1,
              isGrandTotal: 0
            }));
          }

          const hasFacilitySales = Array.isArray(corePayload.salesByFacility) && corePayload.salesByFacility.length > 0;
          if (!hasFacilitySales && facilities.length > 0) {
            corePayload.salesByFacility = facilities.map((f: any) => ({
              categoryCode: f.categoryCode,
              categoryName: f.categoryName,
              teamName: f.teamName,
              partName: f.partName,
              shopName: f.shopName,
              facilityName: f.shopName,
              todayActual: Number(String(f.todayActual || 0).replace(/,/g, '')) || 0,
              totalSales: Number(String(f.todayActual || 0).replace(/,/g, '')) || 0,
              visitors: Number(f.visitors || 0),
              totalVisitors: Number(f.visitors || 0)
            }));
          }
        }

        setState({
          core: corePayload,
          summary: null,
          matrix: matrixPayload, 
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
