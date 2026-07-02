import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';

export interface RawPayload {
  gridData: any[];
  chartData: any[];
  adrTable: any[];
  today: { actual: number; ly_actual: number };
  ytd: { actual: number; ly_actual: number };
  golfSummary: any;
  roomTypeBreakdown: any[];
  channelBreakdown: any[];
  golfFacilityBreakdown: any[];
  weeklyTrend: any[];
  targetDate: string;
  [key: string]: any;
}

export interface CoreDataState {
  current: RawPayload | null;
  currentLY: RawPayload | null;
  currentLYWeekly: RawPayload | null;
  mtd: RawPayload | null;
  mtdLY: RawPayload | null;
  mtdLYWeekly: RawPayload | null;
  ytd: RawPayload | null;
  ytdLY: RawPayload | null;
  ytdLYWeekly: RawPayload | null;
  isLoading: boolean;
  error: string | null;
}

const CoreDataContext = createContext<CoreDataState | undefined>(undefined);

const formatYMD = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const calcLY = (date: Date, isWeeklyMode = false) => {
  const ly = new Date(date);
  if (isWeeklyMode) {
    ly.setDate(ly.getDate() - 364);
  } else {
    ly.setFullYear(ly.getFullYear() - 1);
  }
  return ly;
};

export const CoreDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { startDate, endDate, isRange } = useDate();
  
  const [state, setState] = useState<CoreDataState>({
    current: null, currentLY: null, currentLYWeekly: null,
    mtd: null, mtdLY: null, mtdLYWeekly: null,
    ytd: null, ytdLY: null, ytdLYWeekly: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchCoreData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      
      const targetStart = new Date(startDate + "T00:00:00");
      const targetEnd = new Date(endDate + "T00:00:00");

      const d1_start = formatYMD(targetStart);
      const d1_end = formatYMD(targetEnd);
      const d2_start = formatYMD(calcLY(targetStart));
      const d2_end = formatYMD(calcLY(targetEnd));

      const mtdStart = new Date(targetEnd);
      mtdStart.setDate(1);
      const d3_start = formatYMD(mtdStart);
      const d3_end = formatYMD(targetEnd);
      const d4_start = formatYMD(calcLY(mtdStart));
      const d4_end = formatYMD(calcLY(targetEnd));

      const ytdStart = new Date(targetEnd);
      ytdStart.setMonth(0);
      ytdStart.setDate(1);
      const d5_start = formatYMD(ytdStart);
      const d5_end = formatYMD(targetEnd);
      const d6_start = formatYMD(calcLY(ytdStart));
      const d6_end = formatYMD(calcLY(targetEnd));
      
      const d2w_start = formatYMD(calcLY(targetStart, true));
      const d2w_end = formatYMD(calcLY(targetEnd, true));
      
      const d4w_start = formatYMD(calcLY(mtdStart, true));
      const d4w_end = formatYMD(calcLY(targetEnd, true));
      
      const d6w_start = formatYMD(calcLY(ytdStart, true));
      const d6w_end = formatYMD(calcLY(targetEnd, true));

      const fetcher = async (s: string, e: string) => {
        try {
          const json = await secureFetcher(`${API_BASE}/api/v3/dashboard/revenue-summary?startDate=${s}&endDate=${e}`);
          return json.data || json;
        } catch (err) {
          console.warn(`Fallback to empty for ${s}~${e} due to API error:`, err);
          return null;
        }
      };

      try {
        const [current, currentLY, currentLYWeekly, mtd, mtdLY, mtdLYWeekly, ytd, ytdLY, ytdLYWeekly] = await Promise.all([
          fetcher(d1_start, d1_end),
          fetcher(d2_start, d2_end),
          fetcher(d2w_start, d2w_end),
          fetcher(d3_start, d3_end),
          fetcher(d4_start, d4_end),
          fetcher(d4w_start, d4w_end),
          fetcher(d5_start, d5_end),
          fetcher(d6_start, d6_end),
          fetcher(d6w_start, d6w_end)
        ]);

        setState({
          current, currentLY, currentLYWeekly,
          mtd, mtdLY, mtdLYWeekly,
          ytd, ytdLY, ytdLYWeekly,
          isLoading: false,
          error: null
        });
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to fetch core data' }));
      }
    };

    fetchCoreData();
  }, [startDate, endDate, isRange]);

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
