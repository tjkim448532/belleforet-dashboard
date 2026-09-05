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
      
      let validStart = startDate;
      let validEnd = endDate;
      if (validStart && validEnd && validStart > validEnd) {
        const temp = validStart;
        validStart = validEnd;
        validEnd = temp;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const queryParams = validEnd && validStart !== validEnd
        ? `startDate=${validStart}&endDate=${validEnd}&_t=${Date.now()}`
        : `date=${validStart || todayStr}&_t=${Date.now()}`;

      try {
        // [V6 SSOT Single API Call] Call V6 revenue-summary master endpoint & teetime/overview in parallel
        const [res, golfTeetimeRes, overviewRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v6/dashboard/overview?${queryParams}`).catch(() => null)
        ]);

        const payload = (res?.summary ? res : res?.data) || res || {};
        const gs = golfTeetimeRes?.golfSummary || golfTeetimeRes?.summary || {};
        const channels = golfTeetimeRes?.salesByChannel || [];
        const overviewGolf = overviewRes?.overview || {};

        const directCh = channels.find((c: any) => c.channelCode === 'DIRECT_WEB' || c.channelName?.includes('자사'));
        const otaCh = channels.find((c: any) => c.channelCode === 'OTA_AGENCY' || c.channelCode === 'KAKAO_GOLF' || c.channelName?.includes('OTA') || c.channelName?.includes('카카오'));
        const memberCh = channels.find((c: any) => c.channelCode === 'MEMBER' || c.channelName?.includes('회원'));

        const coreSummary = {
          ...payload.summary,
          // TrevPAR 대소문자 호환성 (trevPar vs trevPAR)
          trevPAR: payload.summary?.trevPar ?? payload.summary?.trevPAR,
          trevPar: payload.summary?.trevPar ?? payload.summary?.trevPAR,
          // 골프 예약/내장/취소 팀수
          totalGolfReservedTeams: Number(payload.summary?.totalGolfReservedTeams || gs.totalGolfReservedTeams || gs.totalReservedTeams || overviewGolf.totalGolfReservedTeams || 0),
          totalGolfTeams: Number(payload.summary?.totalGolfTeams || gs.totalGolfTeams || gs.totalVisitedTeams || overviewGolf.totalGolfTeams || 0),
          totalGolfVisitedTeams: Number(payload.summary?.totalGolfVisitedTeams || gs.totalGolfVisitedTeams || gs.totalVisitedTeams || overviewGolf.totalGolfTeams || 0),
          totalGolfCanceledTeams: Number(payload.summary?.totalGolfCanceledTeams || gs.totalGolfCanceledTeams || gs.totalCanceledTeams || overviewGolf.totalGolfCanceledTeams || 0),
          totalGolfPendingTeams: Number(payload.summary?.totalGolfPendingTeams || gs.totalPendingTeams || 0),
          totalGolfVisitors: Number(payload.summary?.totalGolfVisitors || gs.totalGolfVisitors || gs.totalPlayers || overviewGolf.totalGolfVisitors || 0),
          // 골프 채널별 평균 그린피
          golfDirectAvgGreenFee: Number(directCh?.avgGreenFeePerPlayer || overviewGolf.golfDirectAvgGreenFee || payload.summary?.golfDirectAvgGreenFee || 0),
          golfOtaAvgGreenFee: Number(otaCh?.avgGreenFeePerPlayer || overviewGolf.golfOtaAvgGreenFee || payload.summary?.golfOtaAvgGreenFee || 0),
          golfMemberAvgGreenFee: Number(memberCh?.avgGreenFeePerPlayer || overviewGolf.golfMemberAvgGreenFee || payload.summary?.golfMemberAvgGreenFee || 0),
          golfRankedChannels: channels.length > 0 ? channels.map((ch: any) => ({
            name: ch.channelName,
            avgGreenFee: ch.avgGreenFeePerPlayer,
            players: ch.visitedPlayers || 0
          })) : (payload.summary?.golfRankedChannels || [])
        };

        const corePayload = {
          ...payload,
          date: payload.targetDate || validStart || todayStr,
          salesByCategory: payload.salesByCategory || [],
          salesByFacility: payload.salesByFacility || [],
          leisureVisitors: payload.leisureVisitors || {},
          gridData: payload.gridData || [],
          weather: payload.weather || {},
          summary: coreSummary
        };

        setState({
          core: corePayload,
          summary: corePayload.summary,
          matrix: payload.gridData || [],
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error("[V6 Dashboard API Fetch Error]", error);
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

