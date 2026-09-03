import { useState, useEffect } from 'react';
import { secureFetcher } from '../lib/secureFetcher';

export interface RevenueVenue {
    venueName: string;
    categoryCode: string;
    ticketGroup: string;
    revenue: number;
}

export interface RevenueDivision {
    orgDivision: string;
    subtotal: number;
    venues: RevenueVenue[];
}

export interface RevenueOrgData {
    period: {
        startDate: string;
        endDate: string;
    };
    grandTotal: number;
    divisions: RevenueDivision[];
}

export const useRevenueData = (startDate: string, endDate: string) => {
    const [data, setData] = useState<RevenueOrgData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!startDate || !endDate) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 다중 월(Multi-month) 단일 호출 원칙에 따라 기간을 Query Parameter로 전달합니다.
                const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
                const response = await secureFetcher(`${baseUrl}/api/v6/dashboard/revenue-by-org?startDate=${startDate}&endDate=${endDate}`);
                
                if (isMounted) {
                    // API 응답 데이터(camelCase)를 가공 없이 그대로 수신 (Pure Consumer)
                    setData(response?.data || null);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [startDate, endDate]);

    return { data, loading, error };
};
