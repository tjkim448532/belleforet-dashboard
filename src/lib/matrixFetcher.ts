import { secureFetcher } from './secureFetcher';

export interface MatrixRow {
  category: string;
  shop_name: string;
  today: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
  mtd: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
  ytd: {
    actual: number;
    lastYear: number;
    growthRate: number;
  };
}

export const fetchMatrixData = async (startDateStr: string): Promise<MatrixRow[]> => {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
  
  try {
    const [matrixRes, v3Res] = await Promise.all([
      secureFetcher(`${API_BASE}/api/dashboard/matrix-weekly?date=${startDateStr}`).catch(() => null),
      secureFetcher(`${API_BASE}/api/v3/dashboard/revenue-summary?date=${startDateStr}`).catch(() => null)
    ]);

    let matrixData: MatrixRow[] = [];
    if (matrixRes) {
      matrixData = matrixRes.data || matrixRes;
      if (!Array.isArray(matrixData)) {
        matrixData = [];
      }
    }

    let v3Payload = null;
    if (v3Res) {
      v3Payload = v3Res.data || v3Res;
    }

    if (!v3Payload) {
      return matrixData; // Fallback to raw matrix data if V3 fails
    }

    const golfBreakdown = v3Payload.golfFacilityBreakdown || [];
    const roomBreakdown = v3Payload.roomTypeBreakdown || [];

    const hasGolfBreakdown = golfBreakdown.length > 0;
    const hasRoomBreakdown = roomBreakdown.length > 0;

    // Filter out aggregate rows if breakdowns exist
    let netData = matrixData.filter(row => {
      if (hasGolfBreakdown && row.shop_name.includes('티켓')) return false;
      if (hasRoomBreakdown && row.shop_name.includes('객실')) return false;
      return true;
    });

    const createEmptyMetrics = () => ({
      today: { actual: 0, lastYear: 0, growthRate: 0 },
      mtd: { actual: 0, lastYear: 0, growthRate: 0 },
      ytd: { actual: 0, lastYear: 0, growthRate: 0 }
    });

    // Inject Golf Breakdowns
    if (hasGolfBreakdown) {
      golfBreakdown.forEach((item: any) => {
        const metrics = createEmptyMetrics();
        metrics.today.actual = item.sales_amount || 0;
        netData.push({
          category: '레저',
          shop_name: item.facility_name,
          ...metrics
        });
      });
    }

    // Inject Room Breakdowns
    if (hasRoomBreakdown) {
      roomBreakdown.forEach((item: any) => {
        const metrics = createEmptyMetrics();
        metrics.today.actual = item.room_revenue || 0;
        netData.push({
          category: '숙박',
          shop_name: item.room_type,
          ...metrics
        });
      });
    }

    return netData;

  } catch (error) {
    console.error('Failed to fetch merged matrix data:', error);
    return [];
  }
};
