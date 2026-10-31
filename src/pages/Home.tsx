import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Building2, Coins, AlertCircle, Calculator, Users, BedDouble, Package, ChevronDown, ChevronUp, Car } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { useDate } from '../contexts/DateContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { transformHomeData } from '../lib/dataTransformers';
import SalesPieChart from '../components/dashboard/SalesPieChart';
import MonthlyTrevporChart from '../components/dashboard/MonthlyTrevporChart';
import { parseNum } from '../lib/dataTransformers';
import { getPeriodHolidayComparison } from '../lib/holidayUtils';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';
import { SkeletonBentoGrid } from '../components/common/SkeletonCard';
import { formatRevenue, formatFinancialKorean } from '../utils/formatters';
import CondoReservationCard from '../components/dashboard/CondoReservationCard';
import GolfReservationCard from '../components/dashboard/GolfReservationCard';

export default function Home() {
  const { startDate, endDate } = useDate();
  const coreData = useCoreData();

  // 🎯 아코디언 상태 관리 (모두 기본값 false: 접힘 SSOT)
  const [isCard2MtdOpen, setIsCard2MtdOpen] = React.useState<boolean>(false);
  const [isCard3AttractionsOpen, setIsCard3AttractionsOpen] = React.useState<boolean>(false);
  const [isKpiFormulasOpen, setIsKpiFormulasOpen] = React.useState<boolean>(false);
  const [isGolfFeeDetailOpen, setIsGolfFeeDetailOpen] = React.useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState<boolean>(false);
  const isRangeMode = Boolean(coreData.core?.isRangeQuery || (startDate && (coreData.core?.endDate || endDate) && startDate !== (coreData.core?.endDate || endDate)));

  const currentEndDateStr = isRangeMode && coreData.core?.endDate ? coreData.core.endDate : startDate;
  const periodHolidays = React.useMemo(() => {
    return getPeriodHolidayComparison(startDate, isRangeMode ? currentEndDateStr : undefined);
  }, [startDate, isRangeMode, currentEndDateStr]);

  const transformedData = React.useMemo(() => {
    if (coreData.isLoading || coreData.error) return null;
    return transformHomeData(coreData);
  }, [coreData]);

  const data = transformedData;
  const loading = coreData.isLoading;
  const apiError = coreData.error ? '[데이터를 로딩 중이거나 동기화 중입니다. 잠시 후 새로고침 해주세요.]' : 
                  (coreData.isLoading ? null : (transformedData ? null : '데이터를 불러오는 데 실패했습니다.'));

  // V6 에서는 current/lastYear 구분 없이 평탄화(Flat)된 weather 객체가 옵니다. 호환성을 위해 둘 다 체크합니다.
  const weather = coreData.core?.weather?.current || coreData.core?.weather || null;
  const lastYearWeather = coreData.core?.weather?.lastYear || ((weather?.lyDescription || weather?.lyTempMax) ? { weatherDesc: weather.lyDescription || '', description: weather.lyDescription || '', tempMax: weather.lyTempMax, tempMin: weather.lyTempMin } : null);

  const displayData: any = data;
  const [trevparViewMode, setTrevparViewMode] = React.useState<'TOTAL' | 'EX_GOLF'>('EX_GOLF');

    const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

  const pieChartData = React.useMemo(() => {
    if (!coreData.core?.salesByCategory) return [];
    // [SSOT 바이블 준수] 백엔드 카테고리 소계를 바인딩하되, 중복 소계 유입 방지 및 표준 명칭 적용
    const categoryMap = new Map<string, { name: string; value: number; pct?: number }>();

    coreData.core.salesByCategory.forEach((cat: any) => {
      const code = String(cat.categoryCode || 'ETC').trim();
      const displayName = cat.categoryName || cat.categoryCode || '기타';

      // 주차관제, 벨포레굿즈 카테고리 코드 기준 제외
      if (code === 'PARKING' || code === 'GOODS') {
        return;
      }

      const val = parseNum(cat.totalSales || cat.todayActual || 0);
      const pct = cat.weight !== undefined ? Number(cat.weight) : (cat.pct !== undefined ? Number(cat.pct) : undefined);
      if (val > 0) {
        // 동일 카테고리 코드는 최상위 대표 소계 1개만 매핑 (또는 합산이 아닌 단일 대표치)
        if (!categoryMap.has(code) || categoryMap.get(code)!.value < val) {
          categoryMap.set(code, { name: displayName, value: val, pct });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [coreData.core?.salesByCategory]);

  const leisureVisitorsMap = React.useMemo(() => {
    const map: Record<string, number> = {};

    // 1. salesByFacility 원천 목록 기반 적재
    const list = coreData.core?.salesByFacility || [];
    if (Array.isArray(list)) {
      list.forEach((fac: any) => {
        const name = fac.shopName || fac.facilityName;
        const count = parseNum(fac.visitors || fac.totalVisitors || 0);
        if (name) {
          map[name] = (map[name] || 0) + count;
        }
      });
    }

    // 2. 백엔드 summary.leisureVisitors / leisureVisitors 완제품 병합 및 한글/영문 양방향 정규화
    const lv = (coreData.core?.summary?.leisureVisitors || coreData.core?.leisureVisitors) as Record<string, any> | undefined;
    if (lv && typeof lv === 'object') {
      Object.entries(lv).forEach(([k, v]) => {
        map[k] = parseNum(v);
      });

      if (lv.mediaArt !== undefined) {
        const val = parseNum(lv.mediaArt);
        map['미디어아트센터'] = val;
        map['미디어아트'] = val;
      }
      if (lv.ranch !== undefined) {
        const val = parseNum(lv.ranch);
        map['벨포레 목장'] = val;
        map['목장'] = val;
      }
      if (lv.sled !== undefined) {
        const val = parseNum(lv.sled);
        map['사계절썰매장'] = val;
        map['사계절썰매'] = val;
      }
      if (lv.marina !== undefined) {
        const val = parseNum(lv.marina);
        map['마리나 클럽'] = val;
        map['마리나'] = val;
      }
      if (lv.motoArena !== undefined) {
        map['모토아레나'] = parseNum(lv.motoArena);
      }
      if (lv.mountainCartGrand !== undefined) {
        const val = parseNum(lv.mountainCartGrand);
        map['마운틴카트(그랜드포렛)'] = val;
        map['카트(그랜드포렛)'] = val;
        map['그랜드포렛'] = val;
      }
      if (lv.mountainCartMini !== undefined) {
        const val = parseNum(lv.mountainCartMini);
        map['마운틴카트(미니포렛)'] = val;
        map['카트(미니포렛)'] = val;
        map['미니포렛'] = val;
      }
      if (lv.mountainCartTotal !== undefined) {
        map['마운틴카트'] = parseNum(lv.mountainCartTotal);
      }
      if (lv.summerland !== undefined) {
        const val = parseNum(lv.summerland);
        map['[썸머랜드 전체 소계]'] = val;
        map['썸머랜드'] = val;
      }
      if (lv.wonderful !== undefined) {
        map['원더풀'] = parseNum(lv.wonderful);
      }
    }

    return map;
  }, [coreData.core?.summary?.leisureVisitors, coreData.core?.leisureVisitors, coreData.core?.salesByFacility]);

  // [모토아레나 숙박객/회원 수 연동] 백엔드에서 전달받은 숙박객/회원 숫자 바인딩
  const { motoGuestCount, motoMemberCount, motoTotalCount } = React.useMemo(() => {
    let guest = 0;
    let member = 0;
    let hasLoaded = false;

    if (coreData.core?.summary?.motoGuestVisitors !== undefined) {
      guest = parseNum(coreData.core.summary.motoGuestVisitors);
      hasLoaded = true;
    }
    if (coreData.core?.summary?.motoMemberVisitors !== undefined) {
      member = parseNum(coreData.core.summary.motoMemberVisitors);
      hasLoaded = true;
    }

    let total: number;
    if (coreData.core?.summary?.motoGuestMemberVisitors !== undefined && coreData.core?.summary?.motoGuestMemberVisitors !== null) {
      total = parseNum(coreData.core.summary.motoGuestMemberVisitors);
    } else if (hasLoaded) {
      total = guest + member;
    } else {
      total = 0;
    }

    return {
      motoGuestCount: guest,
      motoMemberCount: member,
      motoTotalCount: total
    };
  }, [coreData.core?.summary]);





  if (apiError && !loading) {
    const isSleep = Boolean((coreData as any)?.isSleepMode || (coreData as any)?.status === 503);
    if (isSleep) {
      return (
        <div className="w-full h-[80vh] flex flex-col items-center justify-center bg-slate-900/5 text-slate-600 gap-3">
          <span className="text-5xl animate-bounce">🌙</span>
          <div className="text-xl font-bold text-slate-800">현재 서버가 자고 있습니다 🌙</div>
          <div className="text-sm text-slate-500 max-w-md text-center leading-relaxed">
            야간 비용 절감을 위해 매일 20:00 ~ 08:00에는 데이터베이스가 수면 모드에 들어갑니다.<br/>
            매일 아침 08:00에 정상 가동됩니다!
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-[80vh] flex items-center justify-center bg-[#f8fafc]">
        <div className="text-xl font-medium text-red-500">{apiError}</div>
      </div>
    );
  }

  if (loading || !displayData) {
    return (
      <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
        <div className="w-full bg-[#284F42] h-[180px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
          <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
          <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
        </div>
        <div className="w-full max-w-[1920px] mx-auto p-3 sm:p-4 md:p-8 relative z-10 pt-4 sm:pt-6 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div className="text-white">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-[11px] sm:text-xs font-semibold backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · 통합 경영 대시보드</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <GlobalDatePicker />
            </div>
          </div>
          <div className="flex items-center gap-2.5 mb-4 bg-white/10 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full w-fit border border-white/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-ping" />
            <span className="font-medium">벨포레 실시간 리조트 경영 데이터를 안전하게 동기화하고 있습니다...</span>
          </div>
          <SkeletonBentoGrid />
        </div>
      </div>
    );
  }

  const todayGross = displayData.today.gross;
  // [SSOT 무관용] 프론트엔드 자체 성장률(%) 연산 금지. 백엔드가 제공하는 todayGrowth/ytdGrowth 만 사용
  const todayGrowth = coreData.core?.summary?.todayGrowth;
  const todayDiff = coreData.core?.summary?.todayDiff;
  
  const ytdGross = displayData.ytd.gross || parseNum(coreData.core?.summary?.ytdActual || coreData.core?.summary?.ytdRevenue || 0);
  const ytdGrowth = coreData.core?.summary?.ytdGrowth;
  const ytdDiff = coreData.core?.summary?.ytdDiff;

  const mtdGross = displayData.mtd?.gross || parseNum(coreData.core?.summary?.mtdRevenue || coreData.core?.summary?.mtdActual || 0);
  const mtdGrowth = coreData.core?.summary?.mtdGrowth;
  const mtdDiff = coreData.core?.summary?.mtdDiff;

  const roomSub = (coreData.core?.gridData || []).find((r: any) => r.isSubtotal && (r.categoryCode === 'ROOM' || r.categoryName === '콘도' || r.categoryCode === '콘도'))
    || (coreData.core?.salesByCategory || []).find((c: any) => c.categoryCode === 'ROOM' || c.categoryName === '콘도' || c.categoryCode === '콘도');

  const mtdRoomsSold = displayData?.mtd?.roomsSold !== undefined 
    ? displayData.mtd.roomsSold 
    : parseNum(coreData.core?.summary?.mtdRooms || roomSub?.mtdVisitors || roomSub?.mtdRooms || 0);

  const lyMtdRoomsSold = displayData?.mtd?.ly_roomsSold !== undefined 
    ? displayData.mtd.ly_roomsSold 
    : parseNum(coreData.core?.summary?.mtdRoomsLy || coreData.core?.summary?.lyMtdRooms || roomSub?.mtdLyVisitors || roomSub?.lyMtdVisitors || 0);

  const mtdRoomsDiff = displayData?.mtd?.roomsDiff !== undefined 
    ? displayData.mtd.roomsDiff 
    : (coreData.core?.summary?.mtdRoomsDiff !== undefined 
        ? Number(coreData.core.summary.mtdRoomsDiff) 
        : 0);

  const mtdRoomsGrowth = displayData?.mtd?.roomsGrowth !== undefined 
    ? displayData.mtd.roomsGrowth 
    : (coreData.core?.summary?.mtdRoomsGrowth !== undefined 
        ? Number(coreData.core.summary.mtdRoomsGrowth) 
        : null);

  // [기간 모드 지능형 동적 바인딩] 선택 기간 모드 시 선택 기간 전체 실적 바인딩, 단일 일자 시 MTD 당월 실적 바인딩
  const rangeRoomsSold = parseNum(coreData.core?.summary?.totalRooms || roomSub?.todayVisitors || roomSub?.visitors || 0);
  const rangeLyRoomsSold = parseNum(roomSub?.todayLyVisitors || roomSub?.lyVisitors || coreData.core?.summary?.totalRoomsLy || 0);
  const rangeRoomsDiff = Number(coreData.core?.summary?.roomsDiff ?? roomSub?.visitorsDiff ?? 0);
  const rangeRoomsGrowth = coreData.core?.summary?.roomsGrowth ?? roomSub?.growthRate ?? null;

  const activeRoomsSold = isRangeMode ? rangeRoomsSold : mtdRoomsSold;
  const activeLyRoomsSold = isRangeMode ? rangeLyRoomsSold : lyMtdRoomsSold;
  const activeRoomsDiff = isRangeMode ? rangeRoomsDiff : mtdRoomsDiff;
  const activeRoomsGrowth = isRangeMode ? rangeRoomsGrowth : mtdRoomsGrowth;

  // 카드 2 중간 섹션: 기간 모드 시 선택 기간 객실 총매출, 단일 일자 시 MTD 총매출
  const rangeRoomRev = parseNum(roomSub?.todayActual || coreData.core?.summary?.totalRoomRev || 0);
  const rangeLyRoomRev = parseNum(roomSub?.todayLy || 0);
  const rangeRoomRevDiff = Number(roomSub?.diffAmount ?? roomSub?.todayDiff ?? coreData.core?.summary?.roomRevDiff ?? 0);
  const rangeRoomRevGrowth = roomSub?.todayGrowth !== undefined 
    ? Number(roomSub.todayGrowth) 
    : null;

  const activeSecondaryRev = isRangeMode ? rangeRoomRev : mtdGross;
  const activeSecondaryDiff = isRangeMode ? rangeRoomRevDiff : mtdDiff;
  const activeSecondaryGrowth = isRangeMode ? rangeRoomRevGrowth : mtdGrowth;

  // [전년 누적 실적 및 기간 정의 SSOT] 백엔드 마트 완제품 바인딩
  const ytdLyGross = parseNum(coreData.core?.summary?.ytdLy || displayData.ytd?.ly_gross || 0);
  const mtdLyGross = parseNum(coreData.core?.summary?.mtdLy || displayData.mtd?.ly_gross || 0);
  const activeSecondaryLyRev = isRangeMode ? rangeLyRoomRev : mtdLyGross;

  // 날짜 및 대조 기간 문자열 (당해 vs 전년 동기간)
  const currentYear = startDate.slice(0, 4);
  const lyYear = (parseInt(currentYear, 10) - 1).toString();
  
  const mtdPeriodStr = `${startDate.slice(0, 7)}-01 ~ ${startDate}`;
  const lyMtdPeriodStr = `${lyYear}-${startDate.slice(5, 7)}-01 ~ ${lyYear}-${startDate.slice(5)}`;
  
  const ytdPeriodStr = `${currentYear}-01-01 ~ ${startDate}`;
  const lyYtdPeriodStr = `${lyYear}-01-01 ~ ${lyYear}-${startDate.slice(5)}`;

  const activePeriodStr = isRangeMode ? `${startDate} ~ ${currentEndDateStr}` : mtdPeriodStr;
  const activeLyPeriodStr = isRangeMode 
    ? `${lyYear}${startDate.slice(4)} ~ ${lyYear}${currentEndDateStr.slice(4)}`
    : lyMtdPeriodStr;


  
  const multiNight = (() => {
    const s = coreData.core?.summary || {};
    if (s.multiNight) return s.multiNight;
    if (s.multiNightGuests !== undefined || s.multiNightRatio !== undefined) {
      return {
        multiNightRooms: s.multiNightRooms,
        multiNightGuests: s.multiNightGuests,
        multiNightRatio: s.multiNightRatio,
        guestsGrowth: s.guestsGrowth,
        ratioDiff: s.ratioDiff,
      };
    }
    return null;
  })();


  // 🚗 주차관제 기반 워크인 및 데일리 차량 수 (Firebase ATS3000_Bell SSOT 완제품)
  const parkingSummary = coreData.core?.parkingSummary || (coreData as any).parkingSummary;
  // 🏛️ 벨포레 통합 체류 인원 SSOT 마트(mat_v6_resort_visitors_daily) 완제품 바인딩 (Zero-Proxy 1:1)
  const resortVisitors = coreData.core?.resortVisitors || coreData.core?.summary?.resortVisitors || null;
  const roomCapActual = parseNum(
    resortVisitors?.roomTotalGuests ??
    coreData.core?.summary?.totalRoomCap ??
    (coreData.core?.salesByCategory?.find((c: any) => c.categoryCode === 'ROOM' || c.categoryCode === '콘도' || c.categoryName === '콘도')?.visitors || 0)
  );
  const roomCapLy = coreData.core?.summary?.totalRoomCapLy;
  const roomCapGrowth = coreData.core?.summary?.roomCapGrowth;
  const roomCapDiff = coreData.core?.summary?.roomCapDiff;

  const netPhysicalResortGuests: number | null =
    resortVisitors?.netPhysicalResortGuests != null
      ? Number(resortVisitors.netPhysicalResortGuests)
      : coreData.core?.summary?.netPhysicalResortGuests != null
        ? Number(coreData.core.summary.netPhysicalResortGuests)
        : null;
  const walkInVisitors =
    resortVisitors?.parkingWalkinVisitors != null
      ? Number(resortVisitors.parkingWalkinVisitors)
      : parkingSummary?.walkInVisitors != null
        ? parseNum(parkingSummary.walkInVisitors)
        : null;
  const actualWalkInCars = parkingSummary?.actualWalkInCars != null ? parseNum(parkingSummary.actualWalkInCars) : null;

  const golfReservedTeams = displayData?.golfSummary?.reservedTeams || 0;

  const todayFinancial = formatFinancialKorean(todayGross);
  const ytdFinancial = formatFinancialKorean(ytdGross);
  const ytdLyFinancial = formatFinancialKorean(ytdLyGross);
  const secondaryFinancial = formatFinancialKorean(activeSecondaryRev);
  const secondaryLyFinancial = formatFinancialKorean(activeSecondaryLyRev);

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      
      {/* 🌲 Luxury Deep Forest Banner with Ambient Glow (Reference Style) */}
      <div className="w-full bg-[#284F42] h-[180px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        {/* Organic circular highlights matching reference #2F5548 & warm camel light */}
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-3 sm:p-4 md:p-8 relative z-10 pt-4 sm:pt-6 md:pt-8">
        
        {apiError && (
          <div className="bg-[#9E372E] text-white p-4 rounded-2xl mb-8 flex items-center gap-3 shadow-lg">
            <AlertCircle size={24} />
            <span className="font-medium text-lg">{apiError}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="text-white">
            {/* Pill Badge from Reference: "● Portfolio Demo · 랜딩페이지" style */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-[11px] sm:text-xs font-semibold backdrop-blur-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 통합 경영 대시보드</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDatePicker />
          </div>
        </div>

        {/* 🏛️ Executive Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* 🌟 Card 1: 전사 순매출 (Hero Bento Card) */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group flex flex-col justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-5 h-5 text-[#284F42] shrink-0" /> 
                    <span className="text-sm font-bold text-[#1B382E]">
                      {isRangeMode && coreData.core?.endDate ? `선택 기간 전사 순매출` : `당일 전사 순매출`}
                    </span>
                    <MetricExplainerTooltip presetKey="netRevenue" align="left" />
                    <span className="text-[11px] font-semibold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-full border border-[#B4C6C1]/70">VAT 제외</span>
                  </div>
                  <span className="text-xs text-[#6C7A73] font-medium font-financial">
                    {isRangeMode && coreData.core?.endDate ? `${startDate} ~ ${coreData.core.endDate}` : startDate}
                  </span>
                </div>

                {/* 🏛️ 듀얼 표기: 원단위 숫자 + 직관적 한글(억/만원) 단위 (카멜 하이라이트) */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                    {formatRevenue(todayGross)}
                  </span>
                  <span className="text-base font-semibold text-[#6C7A73]">원</span>
                  <span className="text-xs font-bold text-white bg-[#B59269] px-2.5 py-0.5 rounded-md whitespace-nowrap font-financial shadow-2xs">
                    {todayFinancial.formatted}
                  </span>
                </div>

                {/* 델타 변화율 캡슐 */}
                <div>
                  {todayGrowth !== undefined && todayGrowth !== null ? (
                    <div className={todayGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                      <span className="font-medium opacity-90">{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                      <span className="font-bold">{todayGrowth !== undefined && todayGrowth !== null ? (todayGrowth >= 0 ? '▲' : '▼') + ' ' + Math.abs(todayGrowth).toFixed(1) + '%' : '-'}</span>
                      {todayDiff !== undefined && (
                        <span className="font-medium opacity-85">({todayDiff > 0 ? '+' : ''}{formatRevenue(todayDiff)}원)</span>
                      )}
                    </div>
                  ) : (
                    <div className="badge-delta-neutral">
                      <span>전년 비교 데이터 산출 대기</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 날씨 서브 패널 */}
              {!isRangeMode && (weather || lastYearWeather) && (
                <div className="mt-4 pt-3 border-t border-[#D0C6BB]/40">
                  <div className="text-xs bg-[#F4F3EE] p-2.5 rounded-2xl border border-[#D0C6BB]/70 flex items-center justify-between">
                    <div className="text-left pr-3 border-r border-[#D0C6BB]/60">
                      <div className="text-[10px] font-medium text-[#6C7A73] mb-0.5">전년 동요일 날씨</div>
                      {lastYearWeather ? (
                        <>
                          <div className="font-semibold text-[#1B382E] text-xs flex items-center gap-1">
                            {lastYearWeather.weatherDesc === '데이터없음' || lastYearWeather.description === '데이터없음' ? '☁️ 알수없음' : (
                              <>
                                {(lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('비') ? '🌧️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('눈') ? '❄️' : (lastYearWeather.weatherDesc || lastYearWeather.description)?.includes('구름') ? '⛅' : '☀️'} 
                                {lastYearWeather.weatherDesc || lastYearWeather.description || '맑음'}
                              </>
                            )}
                          </div>
                          {(lastYearWeather.tempMax != null && lastYearWeather.tempMin != null && (lastYearWeather.tempMax !== 0 || lastYearWeather.tempMin !== 0)) && (
                            <div className="text-[#6C7A73] text-[10px] mt-0.5 font-financial">{lastYearWeather.tempMax}℃ / {lastYearWeather.tempMin}℃</div>
                          )}
                        </>
                      ) : (
                        <div className="font-semibold text-slate-400 text-[11px] flex items-center gap-1">☁️ 기상 수집 중</div>
                      )}
                    </div>
                    <div className="text-right pl-3">
                      <div className="text-[10px] font-medium text-[#284F42] mb-0.5 font-bold">현재 날씨</div>
                      {weather && (weather.weatherDesc || weather.description || weather.tempMax != null) ? (
                        <>
                          <div className="font-bold text-[#284F42] text-xs flex items-center justify-end gap-1">
                            {weather.weatherDesc === '데이터없음' || weather.description === '데이터없음' ? '☁️ 알수없음' : (
                              <>
                                {(weather.weatherDesc || weather.description)?.includes('비') ? '🌧️' : (weather.weatherDesc || weather.description)?.includes('눈') ? '❄️' : (weather.weatherDesc || weather.description)?.includes('구름') ? '⛅' : '☀️'} 
                                {weather.weatherDesc || weather.description || '맑음'}
                              </>
                            )}
                          </div>
                          {(weather.tempMax != null && weather.tempMin != null && (weather.tempMax !== 0 || weather.tempMin !== 0)) && (
                            <div className="text-[#6C7A73] text-[10px] mt-0.5 font-financial">{weather.tempMax}℃ / {weather.tempMin}℃</div>
                          )}
                        </>
                      ) : (
                        <div className="font-medium text-slate-400 text-[11px] flex items-center justify-end gap-1">☁️ 기상 수집 중</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 🌟 Card 2: 누적 매출 (YTD & MTD) 및 객실 판매 */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 flex flex-col justify-between">
              
              {/* 1. 올해 누적 매출 (YTD) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4.5 h-4.5 text-[#284F42] shrink-0" />
                    <span className="text-sm font-bold text-[#1B382E]">올해 누적 매출</span>
                    <span className="text-[10px] font-extrabold text-[#9E7542] bg-[#B59269]/15 border border-[#B59269]/30 px-1.5 py-0.5 rounded tracking-wide">
                      YTD
                    </span>
                    <MetricExplainerTooltip presetKey="ytdRevenue" align="left" />
                  </div>
                  {isRangeMode ? (
                    <span className="text-[11px] font-semibold text-[#1E523F] bg-[#E8F2EE] border border-[#B4C6C1]/70 px-2 py-0.5 rounded-lg whitespace-nowrap font-financial">
                      종료일({currentEndDateStr}) 기준
                    </span>
                  ) : (
                    <span className="text-xs text-[#6C7A73] font-medium font-financial bg-[#F4F3EE] border border-[#D0C6BB]/70 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      📅 {ytdPeriodStr}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                    {formatRevenue(ytdGross)}
                  </span>
                  <span className="text-base font-semibold text-[#6C7A73]">원</span>
                  <span className="text-xs font-bold text-white bg-[#B59269] px-2.5 py-0.5 rounded-md whitespace-nowrap font-financial shadow-2xs">
                    {ytdFinancial.formatted}
                  </span>
                </div>

                {/* 🌟 전년 동기 대조 바 (일체형 오와열 정렬) */}
                <div className="p-2.5 bg-[#F4F3EE] rounded-2xl border border-[#D0C6BB]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-financial">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs" title={`대조 기간: ${lyYtdPeriodStr}`}>
                    <span className="text-[11px] font-semibold text-[#1B382E] bg-white px-2 py-0.5 rounded border border-[#D0C6BB]/70 shadow-2xs">
                      전년 실적
                    </span>
                    <span className="font-extrabold text-[#1B382E] text-sm">
                      {ytdLyGross > 0 ? `${formatRevenue(ytdLyGross)}원` : '-'}
                    </span>
                    {ytdLyGross > 0 && (
                      <span className="text-xs font-bold text-[#6C7A73] bg-[#D0C6BB]/40 px-1.5 py-0.5 rounded">
                        {ytdLyFinancial.formatted}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {ytdGrowth !== undefined && ytdGrowth !== null ? (
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
                        ytdGrowth >= 0 
                          ? 'bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70' 
                          : 'bg-[#FAECEB] text-[#9E372E] border border-[#DE6E6D]/50'
                      }`}>
                        <span>전년비 {ytdGrowth >= 0 ? '▲' : '▼'} {Math.abs(ytdGrowth).toFixed(1)}%</span>
                        {ytdDiff !== undefined && (
                          <span className="font-semibold text-[10px] opacity-90">({ytdDiff > 0 ? '+' : ''}{formatRevenue(ytdDiff)}원)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#6C7A73] font-medium">전년 비교 산출 대기</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2 & 3. 월별 누적 MTD 및 객실 판매 상세 아코디언 */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCard2MtdOpen(!isCard2MtdOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-xs font-bold border border-slate-200/80 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                    <span>월별 MTD 실적 및 객실 판매 상세</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                    <span>{isCard2MtdOpen ? '접기' : '상세보기'}</span>
                    {isCard2MtdOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isCard2MtdOpen && (
                  <div className="space-y-4 pt-3">
                    {/* 2. 💡 월별 누적 매출(MTD) / 선택기간 객실부문 실적 + 공휴일 일수 비교 */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          <span className="text-sm font-bold text-slate-800">
                            {isRangeMode ? '선택 기간 객실 부문 실적' : '월별 누적 매출'}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tracking-wide">
                            MTD
                          </span>
                          <MetricExplainerTooltip presetKey={isRangeMode ? "netRevenue" : "mtdRevenue"} align="left" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-500 font-medium font-financial bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            📅 {activePeriodStr}
                          </span>

                          {/* 🎈 공휴일수 비교 배지 */}
                          <div 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs whitespace-nowrap"
                            title={`[당해 ${isRangeMode ? '선택기간' : 'MTD'}] 총 ${periodHolidays.currentPeriod.totalDays}일 중 휴일 ${periodHolidays.currentPeriod.totalHolidays}일 (토 ${periodHolidays.currentPeriod.saturdays}, 일 ${periodHolidays.currentPeriod.sundays}, 평일공휴일 ${periodHolidays.currentPeriod.nationalHolidaysOnWeekdays})\n[전년 동기] 총 ${periodHolidays.lastYearPeriod.totalDays}일 중 휴일 ${periodHolidays.lastYearPeriod.totalHolidays}일 (토 ${periodHolidays.lastYearPeriod.saturdays}, 일 ${periodHolidays.lastYearPeriod.sundays}, 평일공휴일 ${periodHolidays.lastYearPeriod.nationalHolidaysOnWeekdays})`}
                          >
                            <span className="text-amber-800">🎈 공휴일:</span>
                            <strong className="text-amber-950 font-black">{periodHolidays.currentPeriod.totalHolidays}일</strong>
                            <span className="text-amber-700 font-normal">vs 전년 {periodHolidays.lastYearPeriod.totalHolidays}일</span>
                            {periodHolidays.diffHolidays !== 0 ? (
                              <span className={`text-[10px] font-black ${periodHolidays.diffHolidays > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                ({periodHolidays.diffHolidays > 0 ? `+${periodHolidays.diffHolidays}일` : `${periodHolidays.diffHolidays}일`})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">(동일)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                          {formatRevenue(activeSecondaryRev)}
                        </span>
                        <span className="text-base font-semibold text-slate-400">원</span>
                        <span className="text-xs font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md whitespace-nowrap font-financial">
                          {secondaryFinancial.formatted}
                        </span>
                        {isRangeMode && <span className="text-[11px] text-slate-400 font-normal">(객실 순매출)</span>}
                      </div>

                      {/* 🌟 전년 동기 대조 바 (일체형 오와열 정렬) */}
                      <div className="p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-financial">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs" title={`대조 기간: ${activeLyPeriodStr}`}>
                          <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            전년 동기 실적
                          </span>
                          <span className="font-extrabold text-slate-800 text-sm">
                            {activeSecondaryLyRev > 0 ? `${formatRevenue(activeSecondaryLyRev)}원` : '-'}
                          </span>
                          {activeSecondaryLyRev > 0 && (
                            <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                              {secondaryLyFinancial.formatted}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {activeSecondaryGrowth !== undefined && activeSecondaryGrowth !== null ? (
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
                              activeSecondaryGrowth >= 0 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              <span>전년비 {activeSecondaryGrowth >= 0 ? '▲' : '▼'} {Math.abs(activeSecondaryGrowth).toFixed(1)}%</span>
                              {activeSecondaryDiff !== undefined && (
                                <span className="font-semibold text-[10px] opacity-90">({activeSecondaryDiff > 0 ? '+' : ''}{formatRevenue(activeSecondaryDiff)}원)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">전년 비교 산출 대기</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. 🛏️ 월별 누적 객실 판매 */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <BedDouble className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          <span className="text-sm font-bold text-slate-800">
                            {isRangeMode ? '선택 기간 객실 판매' : '월별 누적 객실 판매'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                            콘도 투숙
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-financial">
                          {activeRoomsSold.toLocaleString()}
                        </span>
                        <span className="text-base font-semibold text-slate-400">실</span>
                      </div>

                      {/* 🌟 전년 동기간 대조 바 (일체형 오와열 정렬) */}
                      <div className="p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-financial">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            전년 동기간
                          </span>
                          <span className="font-extrabold text-slate-800 text-sm">
                            {activeLyRoomsSold > 0 ? `${activeLyRoomsSold.toLocaleString()}실` : '-'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {activeLyRoomsSold > 0 && activeRoomsGrowth !== null ? (
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
                              activeRoomsGrowth >= 0 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              <span>전년비 {activeRoomsGrowth >= 0 ? '▲' : '▼'} {Math.abs(activeRoomsGrowth).toFixed(1)}%</span>
                              <span className="font-semibold text-[10px] opacity-90">({activeRoomsDiff > 0 ? '+' : ''}{activeRoomsDiff.toLocaleString()}실)</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">전년 비교 산출 대기</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 🌟 Card 3: 골프포함/골프제외 이용객 & 투숙객(나들이 제외)·나들이 고객·어트랙션 이용객 (mat_v6_resort_visitors_daily SSOT) */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 flex flex-col justify-between">
              <div>
                {/* 🏛️ 0. 골프포함 이용객 & 골프제외 이용객 (Physical Headcount SSOT) */}
                <div className="mb-3 pb-3 border-b border-[#D0C6BB]/50">
                  <div className="mb-1.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-[#284F42] shrink-0" />
                      <span className="text-sm font-bold text-[#1B382E]">골프포함 이용객 (체류 총인원)</span>
                      <span className="text-[10px] font-extrabold text-white bg-[#284F42] px-2 py-0.5 rounded-full">
                        SSOT
                      </span>
                    </div>
                    {resortVisitors?.mtdNetPhysicalResortGuests != null && !isRangeMode && (
                      <span className="text-[11px] font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70 font-financial">
                        당월(MTD) {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdNetPhysicalResortGuests))}명
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                      {netPhysicalResortGuests !== null
                        ? new Intl.NumberFormat('ko-KR').format(netPhysicalResortGuests)
                        : '-'}
                    </span>
                    <span className="text-base font-semibold text-[#6C7A73]">명</span>
                    <span className="text-[11px] font-semibold text-[#6C7A73]">
                      (투숙객 + 나들이 고객 + 골프 내장객 − 숙박·골프 중복)
                    </span>
                  </div>

                  {/* 골프제외 이용객 배지 (투숙객 + 나들이 고객 - 숙박·골프 중복) */}
                  {(resortVisitors?.exGolfVisitors != null || resortVisitors?.exGolfNetPhysicalResortGuests != null) && (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#E8F2EE] border border-[#284F42]/30 flex items-center justify-between flex-wrap gap-2 text-xs font-financial">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#1E523F]">🌲 골프제외 이용객:</span>
                        <strong className="text-sm font-black text-[#1B382E]">
                          {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.exGolfVisitors ?? resortVisitors.exGolfNetPhysicalResortGuests))}명
                        </strong>
                        <span className="text-[10px] text-[#5A6B63]">(투숙객 + 나들이 고객 − 중복)</span>
                      </div>
                      {resortVisitors?.mtdExGolfVisitors != null && !isRangeMode && (
                        <span className="text-[10px] font-bold text-[#1E523F]">
                          당월 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdExGolfVisitors))}명
                        </span>
                      )}
                    </div>
                  )}

                  {/* 순수 체류 인원 4대 구성 및 시설 이용 연인원 병기 브레이크다운 */}
                  <div className="p-2.5 rounded-2xl bg-[#F4F3EE] border border-[#D0C6BB]/75 text-xs space-y-1.5 font-financial">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                      <div className="bg-white px-2 py-1.5 rounded-xl border border-[#D0C6BB]/60 flex flex-col">
                        <span className="text-[10px] text-[#6C7A73]">① 투숙객(나들이제외)</span>
                        <strong className="text-[#1B382E] font-extrabold">
                          {resortVisitors?.roomTotalGuests != null ? `${new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.roomTotalGuests))}명` : '-'}
                        </strong>
                        {resortVisitors?.roomSoldUnits != null && (
                          <span className="text-[9px] text-[#6C7A73]">({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.roomSoldUnits))}실 실투숙)</span>
                        )}
                        {resortVisitors?.stayingSeminarVisitors != null && Number(resortVisitors.stayingSeminarVisitors) > 0 && (
                          <span className="text-[9px] text-[#1E523F] font-semibold mt-0.5 leading-tight">
                            숙박 세미나 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.stayingSeminarVisitors))}명({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.stayingSeminarEventCount ?? 0))}건) 포함
                          </span>
                        )}
                      </div>
                      <div className="bg-white px-2 py-1.5 rounded-xl border border-[#D0C6BB]/60 flex flex-col">
                        <span className="text-[10px] text-[#6C7A73]">② 골프 내장객</span>
                        <strong className="text-[#1B382E] font-extrabold">
                          {resortVisitors?.golfTotalPlayers != null ? `${new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.golfTotalPlayers))}명` : '-'}
                        </strong>
                        <span className="text-[9px] text-[#6C7A73]">그린피 실라운딩</span>
                      </div>
                      <div className="bg-white px-2 py-1.5 rounded-xl border border-[#D0C6BB]/60 flex flex-col">
                        <span className="text-[10px] text-[#6C7A73]">③ 나들이 고객(워크인)</span>
                        <strong className="text-[#1B382E] font-extrabold">
                          {resortVisitors?.parkingWalkinVisitors != null ? `${new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.parkingWalkinVisitors))}명` : '-'}
                        </strong>
                        <span className="text-[9px] text-[#6C7A73]">워크인 차량×3인</span>
                        {resortVisitors?.walkinGeneralVisitors != null && resortVisitors?.walkinSeminarVisitors != null && (
                          <span className="text-[9px] text-[#1E523F] font-semibold mt-0.5 leading-tight">
                            일반 나들이 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.walkinGeneralVisitors))}명 · 당일 세미나(단체) {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.walkinSeminarVisitors))}명 ({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.dayTripSeminarEventCount ?? 0))}건)
                          </span>
                        )}
                      </div>
                      <div className="bg-[#FAECEB]/70 px-2 py-1.5 rounded-xl border border-[#DE6E6D]/40 flex flex-col">
                        <span className="text-[10px] text-[#9E372E] font-semibold">④ 숙박·골프 중복</span>
                        <strong className="text-[#9E372E] font-extrabold">
                          {resortVisitors?.roomGolfSynergyGuests != null ? `-${new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.roomGolfSynergyGuests))}명` : '-'}
                        </strong>
                        {resortVisitors?.golfCondoCrossCars != null && (
                          <span className="text-[9px] text-[#9E372E]">({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.golfCondoCrossCars))}실 중복차감)</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#D0C6BB]/50 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#1B382E]">
                        <span className="px-1.5 py-0.5 rounded bg-[#B59269]/20 text-[#9E7542] font-bold text-[10px]">
                          시설 이용 연인원
                        </span>
                        <strong className="font-extrabold text-[#1B382E]">
                          {resortVisitors?.grossActivityVisitors != null
                            ? `${new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.grossActivityVisitors))}명`
                            : '-'}
                        </strong>
                        <span className="text-[10px] text-[#6C7A73]">(다중 시설 중복 이용 포함 누적)</span>
                      </div>
                      {resortVisitors?.leisureTicketVisitors != null && (
                        <span className="text-[10px] font-bold text-[#284F42] bg-[#E8F2EE] px-2 py-0.5 rounded-md border border-[#B4C6C1]/60">
                          레저·티켓 입장 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.leisureTicketVisitors))}건
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#284F42] shrink-0" />
                    <span className="text-xs font-bold text-[#1B382E]">투숙객 수 (나들이 제외 실제 투숙객)</span>
                    <MetricExplainerTooltip presetKey="visitorCount" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-full border border-[#B4C6C1]/70">
                    {isRangeMode ? '선택 기간 누적' : '당일 실투숙객 집계'}
                  </span>
                </div>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                      {new Intl.NumberFormat('ko-KR').format(roomCapActual)}
                    </span>
                    <span className="text-base font-semibold text-[#6C7A73]">명</span>
                  </div>
                </div>

                {/* 과거 비교 숙박객 수 및 증감률 배지 */}
                <div className="mb-3">
                  {roomCapLy !== undefined && roomCapLy > 0 ? (
                    <div className={roomCapGrowth !== undefined && roomCapGrowth >= 0 ? 'badge-delta-up' : 'badge-delta-down'}>
                      <span className="font-medium opacity-90">{isRangeMode ? '전년 동기간 대비' : '전년 동요일 대비'}</span>
                      {roomCapGrowth !== undefined && (
                        <span className="font-bold">{roomCapGrowth >= 0 ? '▲' : '▼'} {Math.abs(roomCapGrowth).toFixed(1)}%</span>
                      )}
                      <span className="font-medium opacity-85">
                        (전년 {new Intl.NumberFormat('ko-KR').format(roomCapLy)}명{roomCapDiff !== undefined ? `, ${roomCapDiff > 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(roomCapDiff)}명` : ''})
                      </span>
                    </div>
                  ) : (
                    <div className="badge-delta-neutral">
                      <span>전년 비교 데이터 산출 대기</span>
                    </div>
                  )}
                </div>
                
                {multiNight && (parseNum(multiNight.multiNightGuests) > 0 || parseNum(multiNight.multiNightRooms) > 0) && (
                  <div className="mb-4 p-2.5 rounded-xl bg-[#E8F2EE] border border-[#B4C6C1]/70 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-2xs font-financial">
                    <div className="flex items-center gap-1.5 text-[#1B382E] font-medium">
                      <span className="bg-[#284F42] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">연박(2박+)</span>
                      <span className="font-bold text-[#1B382E]">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightGuests || 0)}명</span>
                      <span className="text-[#6C7A73] text-[11px]">
                        ({multiNight.multiNightRooms !== undefined && multiNight.multiNightRooms !== null && parseNum(multiNight.multiNightRooms) > 0 && (
                          <>
                            <strong className="text-[#1B382E] font-semibold">{new Intl.NumberFormat('ko-KR').format(multiNight.multiNightRooms)}실</strong>
                            {' · '}
                          </>
                        )}투숙객 대비 <strong className="text-[#1B382E] font-semibold">{parseNum(multiNight.multiNightRatio ?? 0).toFixed(1)}%</strong>)
                      </span>
                    </div>
                    {multiNight.guestsGrowth !== undefined && (
                      <div className={`font-bold text-[11px] flex items-center gap-1 ${multiNight.guestsGrowth >= 0 ? 'text-[#1E523F]' : 'text-[#9E372E]'}`}>
                        <span className="text-[#6C7A73] font-normal">{isRangeMode ? '전년 동기' : '전년 동요일'}</span>
                        <span>{multiNight.guestsGrowth >= 0 ? '▲' : '▼'}{Math.abs(multiNight.guestsGrowth).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
                
                {resortVisitors?.stayingSeminarVisitors != null && Number(resortVisitors.stayingSeminarVisitors) > 0 && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 text-xs font-financial space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-[#1B382E]">
                        <span className="bg-[#1E523F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">숙박 세미나</span>
                        <span className="font-bold text-[#1B382E]">
                          {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.stayingSeminarVisitors))}명 ({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.stayingSeminarEventCount ?? 0))}건)
                        </span>
                        <span className="text-[11px] text-[#6C7A73]">— ① 투숙객에 포함</span>
                      </div>
                      {!isRangeMode && resortVisitors?.mtdStayingSeminarVisitors != null && (
                        <span className="text-[10px] font-semibold text-[#6C7A73]">
                          당월 숙박 세미나 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdStayingSeminarVisitors))}명
                        </span>
                      )}
                    </div>
                    {Array.isArray(resortVisitors?.stayingSeminarGroups) && resortVisitors.stayingSeminarGroups.length > 0 && (
                      <div className="text-[11px] text-[#5A6B63] pt-1 border-t border-[#D0C6BB]/40 flex flex-wrap gap-1.5 items-center">
                        <span className="font-semibold text-[#1B382E]">숙박 단체:</span>
                        {resortVisitors.stayingSeminarGroups.map((g: any, idx: number) => (
                          <span key={g.eventId || idx} className="bg-white px-2 py-0.5 rounded border border-[#D0C6BB]/70 text-[10px] font-medium text-[#1B382E]">
                            {g.corporateName} {new Intl.NumberFormat('ko-KR').format(Number(g.paxCount ?? 0))}명{g.venueName ? ` (${g.venueName})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 🚗 2. 나들이 고객(Walk-in 방문객) 수 (주차관제 Firebase SSOT 완제품) */}
                <div className="pt-3 pb-1 border-t border-[#D0C6BB]/40">
                  <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-5 h-5 text-[#284F42] shrink-0" />
                      <span className="text-sm font-bold text-[#1B382E]">나들이 고객 수 (워크인 방문객)</span>
                      <MetricExplainerTooltip presetKey="walkInVisitor" />
                      <span className="text-xs text-[#6C7A73] font-normal">(주차관제 기반)</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!isRangeMode && resortVisitors?.mtdParkingWalkinVisitors != null && (
                        <span className="text-[11px] font-bold text-[#1E523F] bg-[#E8F2EE] px-2.5 py-0.5 rounded-full border border-[#B4C6C1]/70 font-financial">
                          당월(MTD) {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdParkingWalkinVisitors))}명
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-[#1E523F] bg-[#E8F2EE] px-2 py-0.5 rounded-full border border-[#B4C6C1]/70">
                        {isRangeMode ? '선택 기간 누적' : '당일 나들이 집계'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight font-financial">
                        {walkInVisitors !== null
                          ? new Intl.NumberFormat('ko-KR').format(walkInVisitors)
                          : '-'}
                      </span>
                      <span className="text-base font-semibold text-[#6C7A73]">명</span>
                      {walkInVisitors !== null && (
                        <span className="text-[11px] font-bold text-[#284F42] bg-[#E8F2EE] px-2 py-0.5 rounded-md border border-[#B4C6C1]/70 font-financial">
                          차량 1대당 3명 환산 완제품
                        </span>
                      )}
                    </div>

                    {resortVisitors?.walkinGeneralVisitors != null && resortVisitors?.walkinSeminarVisitors != null && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-financial">
                        <span className="px-2.5 py-1 rounded-lg bg-[#E8F2EE] border border-[#284F42]/30 text-[#1B382E] font-bold">
                          일반 나들이 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.walkinGeneralVisitors))}명 · 당일 세미나(단체) {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.walkinSeminarVisitors))}명 ({new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.dayTripSeminarEventCount ?? 0))}건)
                        </span>
                        {!isRangeMode && resortVisitors?.mtdWalkinGeneralVisitors != null && resortVisitors?.mtdWalkinSeminarVisitors != null && (
                          <span className="text-[11px] text-[#5A6B63] font-medium">
                            (당월 일반 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdWalkinGeneralVisitors))}명 · 당일 세미나 {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdWalkinSeminarVisitors))}명 / {new Intl.NumberFormat('ko-KR').format(Number(resortVisitors.mtdDayTripSeminarEventCount ?? 0))}건)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {(parkingSummary || (Array.isArray(resortVisitors?.dayTripSeminarGroups) && resortVisitors.dayTripSeminarGroups.length > 0)) && (
                    <div className="mb-3 p-2.5 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 flex flex-wrap items-center gap-1.5 text-xs shadow-2xs font-financial">
                      {parkingSummary && (
                        <>
                          <span className="bg-[#B59269] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">미등록 워크인</span>
                          <span className="font-bold text-[#1B382E]">
                            {actualWalkInCars !== null ? `${new Intl.NumberFormat('ko-KR').format(actualWalkInCars)}대` : '-'}
                          </span>
                          <span className="text-[#6C7A73] text-[11px]">(주차관제 미등록 순수 당일 차량)</span>
                        </>
                      )}
                      {Array.isArray(resortVisitors?.dayTripSeminarGroups) && resortVisitors.dayTripSeminarGroups.length > 0 && (
                        <div className={`w-full flex flex-wrap items-center gap-1.5 ${parkingSummary ? 'mt-1 pt-1.5 border-t border-[#D0C6BB]/40' : ''}`}>
                          <span className="bg-[#284F42] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">당일 세미나(단체)</span>
                          {resortVisitors.dayTripSeminarGroups.map((g: any, idx: number) => (
                            <span
                              key={g.eventId || idx}
                              className="bg-white px-2 py-0.5 rounded border border-[#D0C6BB]/80 text-[11px] font-bold text-[#1B382E]"
                            >
                              {g.corporateName} {new Intl.NumberFormat('ko-KR').format(Number(g.paxCount ?? 0))}명{g.venueName ? ` (${g.venueName})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="w-full text-[11px] text-[#6C7A73] leading-relaxed font-normal mt-1 border-t border-[#D0C6BB]/40 pt-1.5">
                        주차 정산·할인 및 사전등록 내역을 기반으로 직원·숙박·업무·단순 회차 차량을 제외하고 산출한 순수 당일 방문 차량/추정 인원(대당 3인) 지표입니다.
                      </p>
                    </div>
                  )}
                </div>

                {/* Major Leisure Facilities Visitors Breakdown (Accordion) */}
                <div className="mt-3 pt-3 border-t border-[#D0C6BB]/40 relative z-10">
                  <button
                    type="button"
                    onClick={() => setIsCard3AttractionsOpen(!isCard3AttractionsOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F4F3EE] hover:bg-[#EBE8DF] text-[#1B382E] transition-colors text-xs font-bold border border-[#D0C6BB]/70 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#284F42]" />
                      <span>주요 레저/어트랙션 이용객 수</span>
                      <span className="text-[10px] text-[#6C7A73] font-normal">{isRangeMode ? '(선택 기간)' : '(당일 실적)'}</span>
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-[#6C7A73] font-normal">
                      <span>{isCard3AttractionsOpen ? '접기' : '상세보기'}</span>
                      {isCard3AttractionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {isCard3AttractionsOpen && (
                    <div className="pt-3">
                      {(() => {
                        const lv = (coreData.core?.summary?.leisureVisitors || coreData.core?.leisureVisitors) as Record<string, number> | undefined;
                        const attractionItems = [
                          { label: '🎨 미디어아트', val: lv?.mediaArt ?? (leisureVisitorsMap['미디어아트센터'] || 0), isSeasonal: false },
                          { label: '🐑 벨포레 목장', val: lv?.ranch ?? (leisureVisitorsMap['벨포레 목장'] || 0), isSeasonal: false },
                          { label: '🛷 사계절썰매', val: lv?.sled ?? (leisureVisitorsMap['사계절썰매장'] || 0), isSeasonal: false },
                          { label: '🚤 마리나 클럽', val: lv?.marina ?? (leisureVisitorsMap['마리나 클럽'] || 0), isSeasonal: false },
                          { label: '🏎️ 카트(그랜드포렛)', title: '마운틴카트(그랜드포렛)', val: lv?.mountainCartGrand ?? (leisureVisitorsMap['마운틴카트(그랜드포렛)'] || leisureVisitorsMap['그랜드포렛'] || 0), isSeasonal: false },
                          { label: '🏎️ 카트(미니포렛)', title: '마운틴카트(미니포렛)', val: lv?.mountainCartMini ?? (leisureVisitorsMap['마운틴카트(미니포렛)'] || leisureVisitorsMap['미니포렛'] || 0), isSeasonal: false },
                          { label: '🏊 썸머랜드', val: lv?.summerland ?? (leisureVisitorsMap['[썸머랜드 전체 소계]'] || leisureVisitorsMap['썸머랜드'] || 0), isSeasonal: true },
                          { label: '🎡 원더풀', val: lv?.wonderful ?? (leisureVisitorsMap['원더풀'] || 0), isSeasonal: true },
                        ].filter(item => !(item.isSeasonal && (!item.val || item.val <= 0)));

                        const motoCount = lv?.motoArena ?? (leisureVisitorsMap['모토아레나'] || 0);

                        return (
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {attractionItems.map((item, idx) => (
                              <div key={idx} className="bg-[#F4F3EE] px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-[#D0C6BB]/60 shadow-xs">
                                <span className="text-[#1B382E] font-semibold truncate" title={item.title || item.label}>
                                  {item.label}
                                </span>
                                <span className="text-base sm:text-lg font-black text-[#284F42] tracking-tight whitespace-nowrap">
                                  {new Intl.NumberFormat('ko-KR').format(item.val)}
                                  <span className="text-xs font-normal text-[#6C7A73] ml-0.5">명</span>
                                </span>
                              </div>
                            ))}
                            <div className="bg-[#F4F3EE] px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-[#D0C6BB]/60 shadow-xs col-span-2">
                              <span className="text-[#1B382E] font-semibold truncate" title="모토아레나">🏁 모토아레나</span>
                              <span className="text-base sm:text-lg font-black text-[#284F42] tracking-tight whitespace-nowrap">
                                {new Intl.NumberFormat('ko-KR').format(motoCount)}
                                <span className="text-xs font-normal text-[#6C7A73] ml-0.5">명</span>
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 모토아레나 숙박/회원 세부 내역 (하단 전용 바) */}
                      <div className="mt-2 px-3 py-2 rounded-xl bg-[#F4F3EE] border border-[#D0C6BB]/70 flex items-center justify-between text-xs text-[#1B382E]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B59269]/20 text-[#9E7542] border border-[#B59269]/40 whitespace-nowrap">
                            모토아레나 숙박·회원
                          </span>
                          <span className="text-[#1B382E] font-medium">
                            숙박할인 <strong className="text-[#1B382E] font-bold">{motoGuestCount}</strong>명 · 회원할인 <strong className="text-[#1B382E] font-bold">{motoMemberCount}</strong>명
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#6C7A73]">
                          총 <strong className="text-[#284F42] font-bold">{motoTotalCount}</strong>명
                          <span className="text-[11px] text-[#6C7A73] font-normal ml-1">
                            (전체 {new Intl.NumberFormat('ko-KR').format(leisureVisitorsMap['모토아레나'] || 0)}명 중)
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#D0C6BB]/75 shadow-xs">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-base font-bold text-[#1B382E] flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#284F42]" /> 객실 및 복합 리조트 핵심 운영 지표
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#6C7A73] bg-[#F4F3EE] border border-[#D0C6BB]/70 px-3 py-1 rounded-full">
                    175실 기준 공식 산출
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsKpiFormulasOpen(!isKpiFormulasOpen)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#1B382E] bg-[#F4F3EE] hover:bg-[#EBE8DF] border border-[#D0C6BB]/70 transition-colors cursor-pointer"
                  >
                    <span>{isKpiFormulasOpen ? '공식/설명 접기' : '산출 공식 및 세부설명'}</span>
                    {isKpiFormulasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
              
              {/* 소프트 스톤 패널 컨테이너 (Forest & Warm Sand SSOT 스타일) */}
              <div className="bg-[#EAE6DF]/70 p-3.5 sm:p-5 rounded-2xl border border-[#D0C6BB]/70 mb-6">
                <h4 className="font-bold text-[#1B382E] mb-3 border-b border-[#D0C6BB]/70 pb-2 text-xs flex items-center justify-between">
                  <span>핵심 경영 지표 실측치 (TrevPAR · ADR · RevPAR · Occ)</span>
                  <span className="text-[11px] text-[#6C7A73] font-normal">공식 PMS/POS 원천 확정 기준</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* 1. 가용객실당 총매출 (TrevPAR) - 카멜 골드 테두리 하이라이트 카드 */}
                  <div className="bg-white p-4 rounded-xl border border-[#B59269] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <span className="font-extrabold text-[#1B382E] text-sm">
                          {trevparViewMode === 'EX_GOLF' ? '순수리조트 TrevPAR' : '전사 총매출 TrevPAR'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B59269]/15 text-[#9E7542]">
                            핵심 지표
                          </span>
                          {/* Toggle: 전사 vs 골프제외 */}
                          <div className="flex items-center bg-[#F4F3EE] p-0.5 rounded-lg border border-[#D0C6BB]/60 text-[9px] font-bold">
                            <button
                              type="button"
                              onClick={() => setTrevparViewMode('TOTAL')}
                              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                trevparViewMode === 'TOTAL'
                                  ? 'bg-[#284F42] text-white shadow-xs font-bold'
                                  : 'text-[#6C7A73] hover:text-[#1B382E]'
                              }`}
                            >
                              전사
                            </button>
                            <button
                              type="button"
                              onClick={() => setTrevparViewMode('EX_GOLF')}
                              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                trevparViewMode === 'EX_GOLF'
                                  ? 'bg-[#284F42] text-white shadow-xs font-bold'
                                  : 'text-[#6C7A73] hover:text-[#1B382E]'
                              }`}
                            >
                              골프제외
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                        Total Revenue Per Available Room
                      </p>
                      {(() => {
                        const trevParTotal = (coreData.core?.summary?.trevPar ?? coreData.core?.summary?.trevPAR) || displayData?.kpiMetrics?.trevPAR;
                        const trevParExGolf = coreData.core?.summary?.trevParExGolf ?? coreData.core?.summary?.trevPARExGolf;
                        const activeTrevPar = trevparViewMode === 'EX_GOLF' ? trevParExGolf : trevParTotal;

                        return activeTrevPar !== undefined && activeTrevPar !== null && Number(activeTrevPar) > 0 ? (
                          <>
                            <div className="text-2xl font-black text-[#1B382E] tracking-tight font-financial my-1 tabular-nums">
                              {formatRevenue(activeTrevPar)} <span className="text-xs font-normal text-[#6C7A73]">원</span>
                            </div>
                            {isKpiFormulasOpen && (
                              <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50">
                                <div className="p-2 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/70 mb-2 text-center">
                                  {trevparViewMode === 'EX_GOLF' ? '리조트(골프제외) ÷ 총 가용 175실(기간 반영)' : '전사 총매출 ÷ 전체 가용 175실(기간 반영)'}
                                </div>
                                <p className="text-[#1B382E] text-[11px] leading-relaxed">
                                  {trevparViewMode === 'EX_GOLF' 
                                    ? '순수 숙박/식음/레저 기반 객실당 부가가치' 
                                    : '리조트 전반에서 창출하는 1실당 총체적 부가가치'}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#D0C6BB]/50 text-[10px]">
                              <span className="text-[#6C7A73] font-financial">
                                {trevparViewMode === 'EX_GOLF' 
                                  ? `골프포함: ${trevParTotal ? `${formatRevenue(trevParTotal)}원` : '-'}` 
                                  : `골프제외: ${trevParExGolf ? `${formatRevenue(trevParExGolf)}원` : '-'}`}
                              </span>
                              <Link 
                                to="/strategic-simulator?tab=package" 
                                className="font-bold text-[#B59269] hover:text-[#9E7542] flex items-center gap-0.5 hover:underline"
                              >
                                <Package size={11} className="text-[#B59269]" />
                                <span>패키지</span>
                                <span>➔</span>
                              </Link>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 font-medium py-4 text-center">
                            TrevPAR 산출 대기
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 2. 판매 객단가 (ADR) - 화이트 카드 + 웜 샌드 캡슐 */}
                  <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-[#1B382E] text-sm">판매 객단가 (ADR)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F3EE] text-[#6C7A73] border border-[#D0C6BB]/50">실판매 단가</span>
                      </div>
                      <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                        Average Daily Rate
                      </p>
                      {(() => {
                        const adr = (coreData.core?.summary?.totalADR && Number(coreData.core.summary.totalADR) > 0) ? Number(coreData.core.summary.totalADR)
                                  : (coreData.core?.summary?.adr && Number(coreData.core.summary.adr) > 0) ? Number(coreData.core.summary.adr)
                                  : displayData?.kpiMetrics?.totalADR;
                        return adr !== undefined && adr !== null && Number(adr) > 0 ? (
                          <>
                            <div className="text-2xl font-black text-[#1B382E] tracking-tight font-financial my-1 tabular-nums">
                              {formatRevenue(adr)} <span className="text-xs font-normal text-[#6C7A73]">원</span>
                            </div>
                            {isKpiFormulasOpen && (
                              <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50">
                                <div className="p-2 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/70 mb-2 text-center">
                                  순수 객실 매출 ÷ 실제 판매 객실 수
                                </div>
                                <p className="text-[#1B382E] text-[11px] leading-relaxed">
                                  실제 투숙 고객에게 판매된 객실 1실당 순수 평균 판매 가격입니다.
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#D0C6BB]/50 text-[10px] text-[#6C7A73] font-financial">
                              <span>순수 객실 실적</span>
                              <span className="font-semibold text-[#1B382E]">계약 기준 객단가</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 font-medium py-4 text-center">
                            ADR 산출 불가
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 3. 객실당 매출 (RevPAR) - 화이트 카드 + 웜 샌드 캡슐 */}
                  <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-[#1B382E] text-sm">객실당 매출 (RevPAR)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F3EE] text-[#6C7A73] border border-[#D0C6BB]/50">객실 효율</span>
                      </div>
                      <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                        Revenue Per Available Room
                      </p>
                      {(() => {
                        const revPar = (coreData.core?.summary?.revPAR && Number(coreData.core.summary.revPAR) > 0) ? Number(coreData.core.summary.revPAR)
                                     : displayData?.kpiMetrics?.revPAR;
                        return revPar !== undefined && revPar !== null && Number(revPar) > 0 ? (
                          <>
                            <div className="text-2xl font-black text-[#1B382E] tracking-tight font-financial my-1 tabular-nums">
                              {formatRevenue(revPar)} <span className="text-xs font-normal text-[#6C7A73]">원</span>
                            </div>
                            {isKpiFormulasOpen && (
                              <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50">
                                <div className="p-2 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/70 mb-2 text-center">
                                  객실 매출 ÷ 가용 175실 = ADR × 점유율
                                </div>
                                <p className="text-[#1B382E] text-[11px] leading-relaxed">
                                  전체 보유 객실(175실) 대비 순수 객실 판매 효율을 나타냅니다.
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#D0C6BB]/50 text-[10px] text-[#6C7A73] font-financial">
                              <span>가용 175실 기준</span>
                              <span className="font-semibold text-[#1B382E]">ADR × 점유율 연동</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 font-medium py-4 text-center">
                            RevPAR 산출 불가
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 4. 객실 점유율 (Occ) - 화이트 카드 + 세이지 그린 캡슐 */}
                  <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-[#1B382E] text-sm">객실 점유율 (Occ)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70">가동률</span>
                      </div>
                      <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                        Occupancy Rate
                      </p>
                      {(() => {
                        const physicalOcc = coreData.core?.physicalRoomMaster?.metrics?.physicalOccupancyRate
                                          ?? coreData.core?.summary?.physicalOccRate;
                        const occ = physicalOcc !== undefined && physicalOcc !== null
                                  ? Number(Number(physicalOcc).toFixed(1))
                                  : ((coreData.core?.summary?.totalOcc && Number(coreData.core.summary.totalOcc) > 0) ? Number(coreData.core.summary.totalOcc)
                                  : (coreData.core?.summary?.occRate && Number(coreData.core.summary.occRate) > 0) ? Number(coreData.core.summary.occRate)
                                  : displayData?.kpiMetrics?.totalOcc);
                        const occupiedUnits = coreData.core?.physicalRoomMaster?.metrics?.physicalOccupiedUnits
                                           ?? coreData.core?.summary?.physicalOccupiedUnits;
                        return occ !== undefined && occ !== null ? (
                          <>
                            <div className="text-2xl font-black text-[#1B382E] tracking-tight font-financial my-1 tabular-nums">
                              {Number(occ).toFixed(1)} <span className="text-xs font-normal text-[#6C7A73]">%</span>
                            </div>
                            {isKpiFormulasOpen && (
                              <div className="mt-2 pt-2 border-t border-[#D0C6BB]/50">
                                <div className="p-2 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/70 mb-2 text-center">
                                  판매 객실 수 ÷ 전체 가용 175실
                                </div>
                                <p className="text-[#1B382E] text-[11px] leading-relaxed">
                                  {isRangeMode ? '선택 기간 평균 가동률' : (occupiedUnits ? `175실 재고 기준 (실운영 ${occupiedUnits}실)` : '175실 재고 기준 자동 산출')}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#D0C6BB]/50 text-[10px] text-[#6C7A73] font-financial">
                              <span>{isRangeMode ? '선택 기간 누적 가동' : '가용 175실 기준'}</span>
                              <span className="font-semibold text-[#1E523F]">{occupiedUnits ? `실운영 ${occupiedUnits}실 가동` : '공식 정산 기준'}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 font-medium py-4 text-center">
                            가동률 산출 불가
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 하단 공식 정산 기준 안내 배너 */}
                {isKpiFormulasOpen && (
                  <div className="text-xs text-[#1B382E] bg-[#E8F2EE] p-3 rounded-xl mt-3.5 border border-[#B4C6C1]/70 font-medium flex items-center justify-between flex-wrap gap-2">
                    <span><strong>공식 정산 기준:</strong> 모든 핵심 운영 지표(TrevPAR, ADR, RevPAR, 객실 점유율 등)는 리조트 공식 PMS/POS 원천 확정 데이터를 기준으로 제공됩니다.</span>
                    <span className="text-[11px] text-[#1E523F] font-mono font-normal">SSOT V6 Engine</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* 1인당 평균 그린피 (전체 / 자사 / OTA / 회원 4분할 분석) */}
                <div className="bg-white p-6 rounded-3xl border border-[#D0C6BB]/75 shadow-xs flex flex-col justify-between hover:border-[#B59269]/60 transition-all cursor-default">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[#1B382E] font-bold text-base flex items-center gap-2">
                        <Coins size={18} className="text-[#284F42]" />
                        <span>골프 1인당 그린피 분석</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#6C7A73] bg-[#EAE6DF] px-2.5 py-1 rounded-xl">
                        순매출 기준
                      </span>
                    </div>

                    {/* 전체 평균 그린피 (메인 Hero) */}
                    <div className="mb-3 bg-[#F4F3EE] p-4 rounded-2xl border border-[#D0C6BB]/70">
                      <div className="text-xs text-[#6C7A73] font-semibold mb-1 flex items-center justify-between">
                        <span>전체 1인 평균 그린피</span>
                        <span className="text-[11px] text-[#6C7A73] font-normal">{isRangeMode ? '선택 기간 합산' : '금일 실적'}</span>
                      </div>
                      <div className="text-3xl font-black text-[#1B382E] tracking-tight tabular-nums whitespace-nowrap">
                        {formatRevenue(displayData.golfSummary?.avgGreenFee || 0)}원 <span className="text-sm font-normal text-[#6C7A73]">/인</span>
                      </div>
                    </div>

                    {/* 아코디언 토글 버튼 */}
                    <button
                      type="button"
                      onClick={() => setIsGolfFeeDetailOpen(!isGolfFeeDetailOpen)}
                      className="w-full mt-2 py-2 px-3 rounded-xl border border-[#D0C6BB]/70 bg-[#F4F3EE] hover:bg-[#EAE6DF] text-xs font-semibold text-[#1B382E] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>채널별(자사·OTA·회원) 및 순위 상세</span>
                      <div className="flex items-center gap-1 text-[11px] text-[#6C7A73] font-normal">
                        <span>{isGolfFeeDetailOpen ? '접기' : '상세보기'}</span>
                        {isGolfFeeDetailOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {isGolfFeeDetailOpen && (
                      <div className="mt-3 space-y-3">
                        {/* 자사 평균 / OTA 평균 / 회원 평균 3분할 통합 그리드 (카드 중첩 제거) */}
                        <div className="grid grid-cols-3 divide-x divide-[#D0C6BB]/60 bg-[#F4F3EE] p-3.5 rounded-2xl border border-[#D0C6BB]/70 text-center">
                          {/* 자사 평균 */}
                          <div className="px-2">
                            <div className="text-xs font-semibold text-[#6C7A73] mb-1 truncate" title="자사 평균 (홈페이지 직접 예약)">
                              자사 평균
                            </div>
                            <div className="text-lg font-black text-[#1B382E] tabular-nums whitespace-nowrap">
                              {displayData.golfSummary?.directAvgGreenFee && displayData.golfSummary.directAvgGreenFee > 0
                                ? `${formatRevenue(displayData.golfSummary.directAvgGreenFee)}원`
                                : (coreData.summary?.isGolfChannelsLoading ? (
                                    <span className="text-xs text-[#6C7A73] font-normal animate-pulse">집계 중...</span>
                                  ) : '-')}
                            </div>
                            <div className="text-[11px] text-[#6C7A73] font-medium truncate mt-0.5" title="홈페이지 예약">
                              홈페이지
                            </div>
                          </div>

                          {/* OTA 평균 */}
                          <div className="px-2">
                            <div className="text-xs font-semibold text-[#6C7A73] mb-1 truncate" title="OTA 제휴사 평균">
                              OTA 평균
                            </div>
                            <div className="text-lg font-black text-[#1B382E] tabular-nums whitespace-nowrap">
                              {displayData.golfSummary?.otaAvgGreenFee && displayData.golfSummary.otaAvgGreenFee > 0
                                ? `${formatRevenue(displayData.golfSummary.otaAvgGreenFee)}원`
                                : (coreData.summary?.isGolfChannelsLoading ? (
                                    <span className="text-xs text-[#6C7A73] font-normal animate-pulse">집계 중...</span>
                                  ) : '-')}
                            </div>
                            <div className="text-[11px] text-[#6C7A73] font-medium truncate mt-0.5" title="대행사 제휴처 (골프존·스마트스코어·골프몬 등)">
                              대행 제휴사
                            </div>
                          </div>

                          {/* 회원 평균 */}
                          <div className="px-2">
                            <div className="text-xs font-semibold text-[#6C7A73] mb-1 truncate" title="회원 우대 평균 단가">
                              회원 평균
                            </div>
                            <div className="text-lg font-black text-[#1B382E] tabular-nums whitespace-nowrap">
                              {displayData.golfSummary?.memberAvgGreenFee && displayData.golfSummary.memberAvgGreenFee > 0
                                ? `${formatRevenue(displayData.golfSummary.memberAvgGreenFee)}원`
                                : (coreData.summary?.isGolfChannelsLoading ? (
                                    <span className="text-xs text-[#6C7A73] font-normal animate-pulse">집계 중...</span>
                                  ) : '-')}
                            </div>
                            <div className="text-[11px] text-[#6C7A73] font-medium truncate mt-0.5" title="회원 우대 단가">
                              회원 우대
                            </div>
                          </div>
                        </div>

                        {/* 채널별 1인당 실측 그린피 순위 미니 차트 & 테이블 */}
                        {coreData.core?.summary?.golfRankedChannels && coreData.core.summary.golfRankedChannels.length > 0 && (
                          <div className="pt-2 border-t border-[#D0C6BB]/50">
                            <div className="flex items-center justify-between text-xs font-bold text-[#1B382E] mb-2">
                              <span className="flex items-center gap-1.5">
                                <span>📊</span> 채널별 1인당 실측 그린피 순위
                              </span>
                              <span className="text-[11px] font-normal text-[#6C7A73]">내장객 순매출 기준</span>
                            </div>
                            <div className="space-y-1.5">
                              {coreData.core.summary.golfRankedChannels.map((item: any, idx: number) => {
                                const rawPct = item.sharePct ?? item.barWidthPct;
                                const pct = rawPct != null ? Number(rawPct) : null;
                                return (
                                  <div key={idx} className="p-2.5 rounded-xl border border-[#D0C6BB]/60 bg-[#F4F3EE] flex items-center justify-between text-xs gap-2 hover:bg-[#EAE6DF] transition-colors">
                                    <div className="flex items-center gap-2 min-w-[120px] truncate" title={item.name}>
                                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        idx === 0 ? 'bg-[#B59269] text-white' :
                                        idx === 1 ? 'bg-[#284F42] text-white' :
                                        idx === 2 ? 'bg-[#B4C6C1] text-[#1B382E]' : 'bg-[#EAE6DF] text-[#6C7A73]'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                      <span className="font-semibold text-[#1B382E] truncate" title={item.name}>{item.name}</span>
                                    </div>
                                    {pct != null && (
                                      <div className="flex-1 mx-2 hidden sm:block">
                                        <div className="w-full bg-[#D0C6BB]/60 h-1.5 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-[#284F42] rounded-full transition-all duration-500" 
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="text-right whitespace-nowrap shrink-0">
                                      <span className="font-extrabold text-[#1B382E]">{formatRevenue(item.avgGreenFee)}원</span>
                                      <span className="text-[11px] text-[#6C7A73] ml-1.5">({item.players}명)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-[#6C7A73] mt-4 pt-3 border-t border-[#D0C6BB]/50 flex items-center justify-between">
                    <span>그린피 순매출 ÷ 실제 내장객 수</span>
                  </div>
                </div>

                {/* 골프 예약 및 입장 현황 (기준일 마감 실적 + 다음날 도착 예약 현황) */}
                <GolfReservationCard
                  currentDate={startDate}
                  todaySummary={{
                    reservedTeams: golfReservedTeams,
                    visitedTeams: displayData.golfSummary ? displayData.golfSummary.visitedTeams : 0,
                    canceledTeams: displayData.golfSummary?.canceledTeams || 0,
                    pendingTeams: displayData.golfSummary?.pendingTeams || 0,
                    golfParts: coreData.core?.summary?.golfParts
                  }}
                  isRangeMode={isRangeMode}
                />

                {/* 콘도(객실) 체크인 예약 현황 */}
                <CondoReservationCard currentDate={startDate} />
              </div>
            </div>
          </div>
          
          {/* 📊 객실당 총매출(TrevPOR) 월별 전년(1~12월) vs 올해 비교 분석 섹션 */}
          <MonthlyTrevporChart />

          {/* 본부별 매출 파이 차트 */}
          {pieChartData.length > 0 && (
            <SalesPieChart 
              data={pieChartData} 
              totalValue={coreData.core?.summary?.totalRevenue ?? todayGross} 
            />
          )}

            {/* QA & KPI 상세 가이드 Accordion */}
            <div className="lg:col-span-12 bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-xs overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-[#F4F3EE]/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#284F42]" />
                  <h3 className="text-base font-bold text-[#1B382E]">
                    지표 산출 공식 및 경영 의미 가이드
                  </h3>
                  <span className="text-xs text-[#6C7A73] font-normal hidden sm:inline ml-1">
                    (TrevPAR · ADR · RevPAR · Occ · 그린피 산정 원리)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#1B382E] bg-[#EAE6DF]">
                  <span>{isGuideOpen ? '가이드 접기' : '가이드 펼치기'}</span>
                  {isGuideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {isGuideOpen && (
                <div className="p-4 sm:p-6 pt-0 border-t border-[#D0C6BB]/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                    {/* Resort & Room Indicators: TrevPAR, ADR, RevPAR, Occ */}
                    <div className="bg-[#F4F3EE] p-5 rounded-2xl flex flex-col justify-between border border-[#D0C6BB]/70 lg:col-span-2">
                      <div>
                        <h4 className="font-bold text-[#1B382E] mb-3 border-b border-[#D0C6BB]/60 pb-2">객실 및 복합 리조트 핵심 지표 산출 방식 안내</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* TrevPAR */}
                          <div className="bg-white p-4 rounded-xl border border-[#B59269]/40 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-extrabold text-[#1B382E] text-sm">가용객실당 총매출 (TrevPAR)</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B59269]/20 text-[#8C6839]">핵심 지표</span>
                              </div>
                              <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                                Total Revenue Per Available Room
                              </p>
                              <div className="p-2.5 rounded-lg bg-[#E8F2EE] font-mono text-[11px] text-[#1E523F] font-bold border border-[#B4C6C1]/70">
                                리조트 전사 총매출 ÷ 전체 가용 객실 수 (175실)
                              </div>
                            </div>
                            <p className="text-[#1B382E] text-[11px] mt-2.5 leading-relaxed">
                              단순 숙박을 넘어 <strong>객실 1실이 골프, 식음, 레저(목장/루지), 모토 등 리조트 전반에서 창출하는 총체적 부가가치</strong>를 평가하는 벨포레의 최우선 경영 지표입니다.
                            </p>
                          </div>

                          {/* ADR */}
                          <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-extrabold text-[#1B382E] text-sm">판매 객단가 (ADR)</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE6DF] text-[#1B382E]">실판매 단가</span>
                              </div>
                              <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                                Average Daily Rate
                              </p>
                              <div className="p-2.5 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/60">
                                순수 객실 매출 ÷ 실제 판매 객실 수 (Rooms Sold)
                              </div>
                            </div>
                            <p className="text-[#1B382E] text-[11px] mt-2.5 leading-relaxed">
                              실제 투숙 고객에게 판매된 객실 1실당 순수 평균 판매 가격입니다.
                            </p>
                          </div>

                          {/* RevPAR & Occ */}
                          <div className="bg-white p-4 rounded-xl border border-[#D0C6BB]/70 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-extrabold text-[#1B382E] text-sm">객실당 매출 (RevPAR) & 점유율 (Occ)</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE6DF] text-[#1B382E]">객실 효율</span>
                              </div>
                              <p className="text-[#6C7A73] text-[11px] mb-2 leading-relaxed">
                                Revenue Per Available Room & Occupancy
                              </p>
                              <div className="p-2.5 rounded-lg bg-[#F4F3EE] font-mono text-[11px] text-[#1B382E] font-bold border border-[#D0C6BB]/60">
                                RevPAR = 객실 매출 ÷ 가용 175실 = ADR × 점유율
                              </div>
                            </div>
                            <p className="text-[#1B382E] text-[11px] mt-2.5 leading-relaxed">
                              전체 보유 객실(175실) 대비 순수 객실 판매 효율을 나타내며, 점유율(판매객실 ÷ 175실)과 직결됩니다.
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-[#1E523F] bg-[#E8F2EE] p-3 rounded-xl mt-3.5 border border-[#B4C6C1]/70 font-medium">
                          <strong>공식 정산 기준:</strong> 모든 핵심 운영 지표(TrevPAR, ADR, RevPAR, 객실 점유율 등)는 리조트 공식 PMS/POS 원천 확정 데이터를 기준으로 제공됩니다.
                        </div>
                      </div>
                    </div>

                    {/* Golf Green Fee */}
                    <div className="bg-[#F4F3EE] p-5 rounded-2xl lg:col-span-2 border border-[#D0C6BB]/70">
                      <h4 className="font-bold text-[#1B382E] mb-3 border-b border-[#D0C6BB]/60 pb-2">골프 평균 그린피 (전체 / 자사 / OTA / 회원)</h4>
                      <ul className="space-y-2 text-[#1B382E] text-xs">
                        <li className="flex flex-col">
                          <span className="font-bold text-[#1B382E] text-sm">
                            • 1인당 전체 평균 그린피: {formatRevenue(displayData.golfSummary?.avgGreenFee || 0)}원
                          </span>
                          <span className="text-[#6C7A73] mt-0.5 tabular-nums">
                            = {formatCurrency((displayData.golfSummary?.avgGreenFee || 0) * (displayData.golfSummary?.visitedPlayers || 0))}원 (그린피 총매출) ÷ {formatCurrency(displayData.golfSummary?.visitedPlayers || 0)}명 (실제 내장객 수)
                          </span>
                        </li>
                        <li className="text-[#6C7A73] pt-1">
                          • <strong>자사 평균:</strong> 홈페이지/모바일 직접 예약 고객의 1인당 실질 결제 그린피
                        </li>
                        <li className="text-[#6C7A73]">
                          • <strong>OTA 평균:</strong> 골프락, 골프존, 골프몬 등 외부 대행 제휴처를 통한 내장객 1인당 실질 결제 그린피
                        </li>
                        <li className="text-[#6C7A73]">
                          • <strong>회원 평균:</strong> 창립회원, 정회원, 무기명 우대 혜택 적용 고객의 1인당 실질 결제 그린피
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
  );
}
