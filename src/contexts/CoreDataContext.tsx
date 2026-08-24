import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { fetchLiveWeatherFallback } from '../lib/weatherService';

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

      const todayStr = new Date().toISOString().split('T')[0];
      const queryParams = validEnd && validStart !== validEnd
        ? `startDate=${validStart}&endDate=${validEnd}&_t=${Date.now()}`
        : `date=${validStart || todayStr}&_t=${Date.now()}`;

      // 전년 비교일자 파라미터 (단일일: 52주전 동요일, 기간: 1년전 동일구간)
      let lyQueryParams = '';
      if (validEnd && validStart !== validEnd) {
        const sLy = new Date(validStart);
        sLy.setFullYear(sLy.getFullYear() - 1);
        const eLy = new Date(validEnd);
        eLy.setFullYear(eLy.getFullYear() - 1);
        lyQueryParams = `startDate=${sLy.toISOString().split('T')[0]}&endDate=${eLy.toISOString().split('T')[0]}&_t=${Date.now()}`;
      } else {
        const d = new Date(validStart || todayStr);
        const lyD = new Date(d.getTime() - 364 * 24 * 60 * 60 * 1000);
        lyQueryParams = `date=${lyD.toISOString().split('T')[0]}&_t=${Date.now()}`;
      }

      try {
        // [SSOT 다중 검증] revenue-summary, matrix-weekly, 전년 동기 revenue-summary, golf-channel, los-correlation 병렬 호출
        const [res, matrixRes, lyRes, golfChannelRes, losRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/dashboard/matrix-weekly?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/dashboard/revenue-summary?${lyQueryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/report/golf-channel-teetime-analysis?${queryParams}`).catch(() => null),
          secureFetcher(`${API_BASE}/api/v5/dashboard/los-correlation-trend?${queryParams}`).catch(() => null)
        ]);

        let corePayload = res?.data || res || {};
        const matrixPayload = matrixRes?.data || matrixRes;
        const lyPayload = lyRes?.data || lyRes;
        const golfChannelPayload = golfChannelRes?.data || golfChannelRes || {};
        const losTrend = losRes?.data?.trendData || losRes?.trendData || [];

        if (Array.isArray(corePayload)) {
          corePayload = corePayload[0] || { summary: {} };
        } else if (res?.weather && !corePayload.weather) {
          corePayload.weather = res.weather;
        }

        // 실시간 날씨 결측 자동 보정 (Open-Meteo 벨포레 기상 API 연동)
        const targetDate = validStart || todayStr;
        const currWeather = corePayload.weather?.current || corePayload.weather;
        if (!currWeather || currWeather.description === '데이터없음' || currWeather.weatherDesc === '데이터없음' || (!currWeather.tempMax && !currWeather.tempMin)) {
          const liveW = await fetchLiveWeatherFallback(targetDate);
          if (liveW) {
            if (!corePayload.weather) corePayload.weather = {};
            corePayload.weather.current = {
              description: liveW.description,
              weatherDesc: liveW.description,
              tempMax: liveW.tempMax,
              tempMin: liveW.tempMin,
              weatherCode: liveW.weatherCode
            };
          }
        }

        if (!corePayload.summary) corePayload.summary = {};

        // 연박(2박+) 체류 데이터 정밀 보정 (los-correlation-trend 연동)
        if (Array.isArray(losTrend) && losTrend.length > 0) {
          const validPoints = losTrend.filter((t: any) => typeof t.multiNightRatio === 'number' && t.multiNightRatio > 0);
          if (validPoints.length > 0) {
            const avgRatio = validPoints.reduce((sum: number, t: any) => sum + t.multiNightRatio, 0) / validPoints.length;
            const totalRoomCap = Number(corePayload.summary?.totalRoomCap ?? 0);
            const calculatedGuests = Math.round(totalRoomCap * (avgRatio / 100));
            
            corePayload.summary.multiNightRatio = Number(avgRatio.toFixed(1));
            corePayload.summary.multiNightGuests = calculatedGuests;
            corePayload.summary.multiNight = {
              multiNightGuests: calculatedGuests,
              multiNightRatio: Number(avgRatio.toFixed(1)),
              multiNightRooms: Math.round(Number(corePayload.summary?.totalRooms || 0) * (avgRatio / 100))
            };
          }
        }

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
          if (golfChannelPayload.golfSummary) {
            const gs = golfChannelPayload.golfSummary;
            if (gs.avgGreenFeePerPlayer !== undefined && gs.avgGreenFeePerPlayer !== null) {
              corePayload.summary.golfAvgGreenFee = Number(gs.avgGreenFeePerPlayer);
            }
            if (Number(corePayload.summary.totalGolfVisitors || 0) === 0 && Number(gs.totalGolfVisitors || gs.totalPlayers || 0) > 0) {
              corePayload.summary.totalGolfVisitors = Number(gs.totalGolfVisitors || gs.totalPlayers);
            }
            if (Number(corePayload.summary.totalGolfTeams || 0) === 0 && Number(gs.totalGolfTeams || gs.totalVisitedTeams || 0) > 0) {
              corePayload.summary.totalGolfTeams = Number(gs.totalGolfTeams || gs.totalVisitedTeams);
            }
            if (Number(corePayload.summary.totalGolfReservedTeams || 0) === 0 && Number(gs.totalGolfReservedTeams || gs.totalReservedTeams || 0) > 0) {
              corePayload.summary.totalGolfReservedTeams = Number(gs.totalGolfReservedTeams || gs.totalReservedTeams);
            }
            if (Number(corePayload.summary.totalGolfCanceledTeams || 0) === 0 && Number(gs.totalGolfCanceledTeams || gs.totalCanceledTeams || 0) > 0) {
              corePayload.summary.totalGolfCanceledTeams = Number(gs.totalGolfCanceledTeams || gs.totalCanceledTeams);
            }
            if (Number(corePayload.summary.golfMemberPlayers || 0) === 0 && Number(gs.golfMemberPlayers || gs.memberPlayers || 0) > 0) {
              corePayload.summary.golfMemberPlayers = Number(gs.golfMemberPlayers || gs.memberPlayers);
            }
            if (Number(corePayload.summary.golfNonMemberPlayers || 0) === 0 && Number(gs.golfNonMemberPlayers || gs.nonMemberPlayers || 0) > 0) {
              corePayload.summary.golfNonMemberPlayers = Number(gs.golfNonMemberPlayers || gs.nonMemberPlayers);
            }
            if (Number(corePayload.summary.golfMemberAvgGreenFee || 0) === 0 && Number(gs.golfMemberAvgGreenFee || gs.memberAvgGreenFee || 0) > 0) {
              corePayload.summary.golfMemberAvgGreenFee = Number(gs.golfMemberAvgGreenFee || gs.memberAvgGreenFee);
            }
            if (Number(corePayload.summary.golfNonMemberAvgGreenFee || 0) === 0 && Number(gs.golfNonMemberAvgGreenFee || gs.nonMemberAvgGreenFee || 0) > 0) {
              corePayload.summary.golfNonMemberAvgGreenFee = Number(gs.golfNonMemberAvgGreenFee || gs.nonMemberAvgGreenFee);
            }
            if (Number(corePayload.summary.golfMemberGreenFee || 0) === 0 && Number(gs.golfMemberGreenFee || gs.memberGreenFee || 0) > 0) {
              corePayload.summary.golfMemberGreenFee = Number(gs.golfMemberGreenFee || gs.memberGreenFee);
            }
            if (Number(corePayload.summary.golfNonMemberGreenFee || 0) === 0 && Number(gs.golfNonMemberGreenFee || gs.nonMemberGreenFee || 0) > 0) {
              corePayload.summary.golfNonMemberGreenFee = Number(gs.golfNonMemberGreenFee || gs.nonMemberGreenFee);
            }
          }
          corePayload.summary.golfChannels = channels;

          // 채널 및 OTA 에이전시 통합 단가 순위표 (Ranked Green Fee List)
          const rankedList: Array<{ name: string; players: number; teams: number; revenue: number; avgGreenFee: number; type: string }> = [];
          const otaAgencies = golfChannelPayload.otaAgenciesDetail || otaCh?.agencies || [];
          
          if (Array.isArray(otaAgencies) && otaAgencies.length > 0) {
            otaAgencies.forEach((a: any) => {
              if (Number(a.visitedPlayers || 0) > 0) {
                rankedList.push({
                  name: `${a.agencyName} (OTA)`,
                  players: Number(a.visitedPlayers),
                  teams: Number(a.visitedTeams || 0),
                  revenue: Number(a.greenFeeRevenue || 0),
                  avgGreenFee: Number(a.avgGreenFeePerPlayer || (a.visitedPlayers > 0 ? Math.round(a.greenFeeRevenue / a.visitedPlayers) : 0)),
                  type: 'OTA'
                });
              }
            });
          }

          channels.forEach((c: any) => {
            if (c.channelCode !== 'OTA_AGENCY' && Number(c.visitedPlayers || 0) > 0) {
              rankedList.push({
                name: c.channelName,
                players: Number(c.visitedPlayers),
                teams: Number(c.visitedTeams || 0),
                revenue: Number(c.greenFeeRevenue || 0),
                avgGreenFee: Number(c.avgGreenFeePerPlayer || (c.visitedPlayers > 0 ? Math.round(c.greenFeeRevenue / c.visitedPlayers) : 0)),
                type: c.channelCode
              });
            }
          });

          rankedList.sort((a, b) => b.avgGreenFee - a.avgGreenFee);
          corePayload.summary.golfRankedChannels = rankedList;
          corePayload.summary.golfLowToHighChannels = [...rankedList].sort((a, b) => a.avgGreenFee - b.avgGreenFee);
          corePayload.summary.golfTimeSlots = golfChannelPayload.analysisByTimeSlot || [];
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

        // matrix-weekly SSOT 데이터로 결측치 및 누적(MTD/YTD) 지표 완벽 동기화
        if (Array.isArray(matrixPayload) && matrixPayload.length > 0) {
          const grandTotal = matrixPayload.find((r: any) => r.isGrandTotal);
          const subtotals = matrixPayload.filter((r: any) => r.isSubtotal && !r.isGrandTotal && (r.subtotalType === 'category' || (!r.subtotalType && r.partName === '소계')));
          const facilities = matrixPayload.filter((r: any) => !r.isSubtotal && !r.isGrandTotal);

          if (grandTotal) {
            if (!corePayload.summary.totalRevenue || Number(corePayload.summary.totalRevenue) === 0) {
              corePayload.summary.totalRevenue = Number(String(grandTotal.todayActual || grandTotal.rangeActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.todayLyRevenue || Number(corePayload.summary.todayLyRevenue) === 0) {
              corePayload.summary.todayLyRevenue = Number(String(grandTotal.todayLy || grandTotal.rangeLy || 0).replace(/,/g, '')) || 0;
            }
            if (corePayload.summary.todayGrowth === undefined || corePayload.summary.todayGrowth === null || Number(corePayload.summary.todayGrowth) === -100) {
              corePayload.summary.todayGrowth = Number(grandTotal.todayGrowth ?? grandTotal.rangeGrowth ?? 0);
            }
            if (corePayload.summary.todayDiff === undefined || corePayload.summary.todayDiff === null) {
              const curAct = Number(String(corePayload.summary.totalRevenue || grandTotal.todayActual || 0).replace(/,/g, '')) || 0;
              const lyAct = Number(String(corePayload.summary.todayLyRevenue || grandTotal.todayLy || 0).replace(/,/g, '')) || 0;
              if (curAct > 0 && lyAct > 0) {
                corePayload.summary.todayDiff = curAct - lyAct;
              }
            }
            if (!corePayload.summary.ytdActual || Number(corePayload.summary.ytdActual) === 0) {
              corePayload.summary.ytdActual = Number(String(grandTotal.ytdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.ytdRevenue || Number(corePayload.summary.ytdRevenue) === 0) {
              corePayload.summary.ytdRevenue = Number(String(grandTotal.ytdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.ytdLy || Number(corePayload.summary.ytdLy) === 0) {
              corePayload.summary.ytdLy = Number(String(grandTotal.ytdLy || 0).replace(/,/g, '')) || 0;
            }
            if (corePayload.summary.ytdGrowth === undefined || corePayload.summary.ytdGrowth === null) {
              corePayload.summary.ytdGrowth = Number(grandTotal.ytdGrowth ?? 0);
            }
            if (corePayload.summary.ytdDiff === undefined || corePayload.summary.ytdDiff === null) {
              const curYtd = Number(String(grandTotal.ytdActual || 0).replace(/,/g, '')) || 0;
              const lyYtd = Number(String(grandTotal.ytdLy || 0).replace(/,/g, '')) || 0;
              if (curYtd > 0 && lyYtd > 0) {
                corePayload.summary.ytdDiff = curYtd - lyYtd;
              }
            }
            if (!corePayload.summary.mtdRevenue || Number(corePayload.summary.mtdRevenue) === 0) {
              corePayload.summary.mtdRevenue = Number(String(grandTotal.mtdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.mtdActual || Number(corePayload.summary.mtdActual) === 0) {
              corePayload.summary.mtdActual = Number(String(grandTotal.mtdActual || 0).replace(/,/g, '')) || 0;
            }
            if (!corePayload.summary.mtdLy || Number(corePayload.summary.mtdLy) === 0) {
              corePayload.summary.mtdLy = Number(String(grandTotal.mtdLy || 0).replace(/,/g, '')) || 0;
            }
            if (corePayload.summary.mtdGrowth === undefined || corePayload.summary.mtdGrowth === null) {
              corePayload.summary.mtdGrowth = Number(grandTotal.mtdGrowth ?? 0);
            }
            if (corePayload.summary.mtdDiff === undefined || corePayload.summary.mtdDiff === null) {
              const curMtd = Number(String(grandTotal.mtdActual || 0).replace(/,/g, '')) || 0;
              const lyMtd = Number(String(grandTotal.mtdLy || 0).replace(/,/g, '')) || 0;
              if (curMtd > 0 && lyMtd > 0) {
                corePayload.summary.mtdDiff = curMtd - lyMtd;
              }
            }
            if (!corePayload.summary.totalVisitors || Number(corePayload.summary.totalVisitors) === 0) {
              corePayload.summary.totalVisitors = grandTotal.visitors || grandTotal.todayVisitors || 0;
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

          // [Zero-Loss Conservation] matrix-weekly의 31개 전체 영업장을 100% 보존 적재 (단 1개 영업장도 유실 불가)
          if (facilities.length > 0) {
            corePayload.salesByFacility = facilities.map((f: any) => ({
              categoryCode: f.categoryCode || 'ETC',
              categoryName: f.categoryName || '기타업장',
              teamName: f.teamName || '기타',
              partName: f.partName || '기타',
              shopName: f.shopName || f.facilityName || '미분류업장',
              facilityName: f.shopName || f.facilityName || '미분류업장',
              todayActual: Number(String(f.todayActual || 0).replace(/,/g, '')) || 0,
              totalSales: Number(String(f.todayActual || 0).replace(/,/g, '')) || 0,
              visitors: Number(f.visitors || 0),
              totalVisitors: Number(f.visitors || 0)
            }));
          }

          // [KPI 무결성 보정] 객단가(ADR), 점유율(Occ), RevPAR, TrevPAR 결측 자동 보정
          const roomSub = subtotals.find((s: any) => s.categoryCode === 'ROOM');
          const roomRev = Number(String(roomSub?.todayActual || 0).replace(/,/g, '')) || 0;
          const roomsSold = Number(corePayload.summary.totalRooms || 0);
          
          const isRange = Boolean(validEnd && validStart && validStart !== validEnd);
          const rangeDays = isRange && validStart && validEnd ? Math.max(1, Math.ceil(Math.abs(new Date(validEnd).getTime() - new Date(validStart).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1;
          const roomInventory = Number(corePayload.summary.totalRoomInventory || (175 * rangeDays));
          const totalResortRev = Number(corePayload.summary.totalRevenue || 0);

          if (!corePayload.summary.totalADR || Number(corePayload.summary.totalADR) === 0) {
            corePayload.summary.totalADR = roomsSold > 0 ? Math.round(roomRev / roomsSold) : 0;
          }
          if (!corePayload.summary.adr || Number(corePayload.summary.adr) === 0) {
            corePayload.summary.adr = corePayload.summary.totalADR;
          }
          if (!corePayload.summary.revPAR || Number(corePayload.summary.revPAR) === 0) {
            corePayload.summary.revPAR = roomInventory > 0 ? Math.round(roomRev / roomInventory) : 0;
          }
          if (!corePayload.summary.trevPAR || Number(corePayload.summary.trevPAR) === 0) {
            corePayload.summary.trevPAR = roomInventory > 0 ? Math.round(totalResortRev / roomInventory) : 0;
          }
          if (corePayload.summary.occRate === undefined || Number(corePayload.summary.occRate) === 0) {
            corePayload.summary.occRate = corePayload.summary.totalOcc !== undefined && Number(corePayload.summary.totalOcc) > 0
              ? Number(corePayload.summary.totalOcc)
              : (roomInventory > 0 ? (roomsSold / roomInventory) * 100 : 0);
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
