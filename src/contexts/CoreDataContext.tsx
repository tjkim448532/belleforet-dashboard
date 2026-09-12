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
    let isCancelled = false;

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
        // [V6 SSOT Direct Call] Call V6 revenue-summary master endpoint (primary SSOT)
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${queryParams}`);
        if (isCancelled) return;

        const payload = (res?.summary ? res : res?.data) || res || {};

        const buildCoreSummary = (payloadSummary: any, gs: any = {}, channels: any[] = [], isGolfLoaded: boolean = false) => {
          const directCh = channels.find((c: any) => c.channelCode === 'DIRECT_WEB' || c.channelName?.includes('자사'));
          
          // OTA 대행사 + 카카오골프 가중 평균 그린피 산출
          const otaAgencies = channels.filter((c: any) => c.channelCode === 'OTA_AGENCY' || c.channelCode === 'KAKAO_GOLF' || c.channelName?.includes('OTA') || c.channelName?.includes('카카오'));
          const otaPlayers = otaAgencies.reduce((acc: number, c: any) => acc + (Number(c.visitedPlayers) || 0), 0);
          const otaRev = otaAgencies.reduce((acc: number, c: any) => acc + (Number(c.greenFeeRevenue) || 0), 0);
          const combinedOtaAvg = otaPlayers > 0 ? Math.round(otaRev / otaPlayers) : (otaAgencies[0]?.avgGreenFeePerPlayer || 0);

          const memberCh = channels.find((c: any) => c.channelCode === 'MEMBER' || c.channelName?.includes('회원'));
          const memberAvg = Number(gs.golfMemberAvgGreenFee || memberCh?.avgGreenFeePerPlayer || payloadSummary?.golfMemberAvgGreenFee || 0);

          return {
            ...payloadSummary,
            // TrevPAR 대소문자 호환성 (trevPar vs trevPAR)
            trevPAR: payloadSummary?.trevPar ?? payloadSummary?.trevPAR,
            trevPar: payloadSummary?.trevPar ?? payloadSummary?.trevPAR,
            // 골프 예약/내장/취소 팀수
            totalGolfReservedTeams: Number(payloadSummary?.totalGolfReservedTeams || gs.totalGolfReservedTeams || gs.totalReservedTeams || 0),
            totalGolfTeams: Number(payloadSummary?.totalGolfTeams || gs.totalGolfTeams || gs.totalVisitedTeams || 0),
            totalGolfVisitedTeams: Number(payloadSummary?.totalGolfVisitedTeams || gs.totalGolfVisitedTeams || gs.totalVisitedTeams || 0),
            totalGolfCanceledTeams: Number(payloadSummary?.totalGolfCanceledTeams || gs.totalGolfCanceledTeams || gs.totalCanceledTeams || 0),
            totalGolfPendingTeams: Number(payloadSummary?.totalGolfPendingTeams || gs.totalPendingTeams || 0),
            totalGolfVisitors: Number(payloadSummary?.totalGolfVisitors || gs.totalGolfVisitors || gs.totalPlayers || 0),
            // 골프 채널별 평균 그린피 및 전체 순수 평균 그린피 (카트비/프로샵 혼입 방지)
            golfAvgGreenFee: Number(gs.avgGreenFeePerPlayer || payloadSummary?.golfAvgGreenFee || 0),
            golfDirectAvgGreenFee: Number(directCh?.avgGreenFeePerPlayer || payloadSummary?.golfDirectAvgGreenFee || 0),
            golfOtaAvgGreenFee: Number(combinedOtaAvg || payloadSummary?.golfOtaAvgGreenFee || 0),
            golfMemberAvgGreenFee: memberAvg,
            isGolfChannelsLoading: !isGolfLoaded,
            golfRankedChannels: channels.length > 0 ? channels.map((ch: any) => ({
              name: ch.channelName,
              avgGreenFee: ch.avgGreenFeePerPlayer,
              players: ch.visitedPlayers || 0
            })) : (payloadSummary?.golfRankedChannels || [])
          };
        };

        const hasFullGolfMetrics = payload.summary?.golfDirectAvgGreenFee !== undefined && 
                                   payload.summary?.golfOtaAvgGreenFee !== undefined && 
                                   payload.summary?.golfMemberAvgGreenFee !== undefined;

        const initialSummary = buildCoreSummary(payload.summary, {}, [], hasFullGolfMetrics);
        const corePayload = {
          ...payload,
          date: payload.targetDate || validStart || todayStr,
          salesByCategory: payload.salesByCategory || [],
          salesByFacility: payload.salesByFacility || [],
          leisureVisitors: payload.leisureVisitors || {},
          gridData: payload.gridData || [],
          weather: payload.weather || {},
          summary: initialSummary
        };

        // Render dashboard immediately with SSOT master payload
        setState({
          core: corePayload,
          summary: initialSummary,
          matrix: payload.gridData || [],
          isLoading: false,
          error: null
        });

        // If master API already returned complete golf metrics via mat_v6_golf_daily, skip redundant 20s background fetch
        if (!hasFullGolfMetrics) {
          secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis?${queryParams}`)
            .then((golfTeetimeRes) => {
              if (isCancelled || !golfTeetimeRes) return;
              const gs = golfTeetimeRes?.golfSummary || golfTeetimeRes?.summary || {};
              const channels = golfTeetimeRes?.salesByChannel || [];
              if (channels.length > 0 || Object.keys(gs).length > 0) {
                setState(prev => {
                  if (!prev.core) return prev;
                  const updatedSummary = buildCoreSummary(payload.summary, gs, channels, true);
                  return {
                    ...prev,
                    core: {
                      ...prev.core,
                      summary: updatedSummary
                    },
                    summary: updatedSummary
                  };
                });
              }
            })
            .catch(() => {
              if (isCancelled) return;
              setState(prev => {
                if (!prev.core?.summary) return prev;
                const nonLoadingSummary = { ...prev.core.summary, isGolfChannelsLoading: false };
                return {
                  ...prev,
                  core: { ...prev.core, summary: nonLoadingSummary },
                  summary: nonLoadingSummary
                };
              });
            });
        }

      } catch (error) {
        if (isCancelled) return;
        console.error("[V6 Dashboard API Fetch Error]", error);
        setState(prev => ({ ...prev, isLoading: false, error: '데이터를 불러오는 데 실패했습니다.' }));
      }
    };

    fetchCoreData();

    return () => {
      isCancelled = true;
    };
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

