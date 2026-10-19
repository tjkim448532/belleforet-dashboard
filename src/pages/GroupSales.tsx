import React, { useState, useEffect, useMemo } from 'react';
import { useDate } from '../contexts/DateContext';
import { getPresetDateRange, type DatePresetType } from '../lib/dateUtils';
import { secureFetcher } from '../lib/secureFetcher';
import GlobalDatePicker from '../components/GlobalDatePicker';
import MetricExplainerTooltip from '../components/common/MetricExplainerTooltip';
import { formatRevenue, formatFinancialKorean } from '../utils/formatters';
import { 
  Building2, 
  DollarSign, 
  Users, 
  RefreshCw, 
  BedDouble, 
  TrendingUp, 
  Globe, 
  Plane, 
  PhoneCall, 
  ChevronDown, 
  ChevronUp, 
  Table, 
  Grid, 
  Coins, 
  Sparkles,
  Layers,
  CalendarDays,
  Briefcase,
  Search,
  RotateCcw,
  Phone,
  MapPin,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from 'lucide-react';
import GroupVenuePreferenceSection from '../components/dashboard/GroupVenuePreferenceSection';
import SalesDivisionNav from '../components/dashboard/SalesDivisionNav';
import type { SalesVenuePerformanceResponse } from '../types/reports-v2';

const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

interface RawChannelRoomItem {
  channel_name?: string;
  channelName?: string;
  channel?: string;
  room_type?: string;
  roomType?: string;
  todayRooms?: number | string;
  todayRevenue?: number | string;
  todayAdr?: number | string;
  adr?: number | string;
  mtdRooms?: number | string;
  mtdRevenue?: number | string;
  mtdAdr?: number | string;
  ytdRooms?: number | string;
  ytdRevenue?: number | string;
  ytdAdr?: number | string;
  todayGuests?: number | string;
  guests?: number | string;
  mtdGuests?: number | string;
  channelSharePct?: number | string;
  sharePct?: number | string;
  grandSharePct?: number | string;
}

interface SegmentItem {
  roomType: string;
  roomsSold: number;
  revenue: number;
  adr: number;
  guests: number;
  channelSharePct: number | null;
  grandSharePct: number | null;
}

interface ChannelGroup {
  channelName: string;
  iconType: 'group' | 'corporate' | 'direct' | 'ota' | 'phone' | 'etc';
  badgeColor: string;
  totalRooms: number;
  totalRevenue: number;
  totalGuests: number;
  averageAdr: number;
  revenueSharePct: number | null;
  items: SegmentItem[];
}

export interface SeminarDayTypeMetric {
  label: string;
  daysCount: number;
  totalRooms: number;
  seminarRooms: number;
  sharePct: number;
  totalRevenue: number;
  seminarRevenue: number;
  revenueSharePct: number;
  averageAdr: number;
  ly?: {
    daysCount?: number;
    totalRooms: number;
    seminarRooms: number;
    sharePct: number;
    totalRevenue: number;
    seminarRevenue: number;
    revenueSharePct: number;
    averageAdr: number;
  };
  growth?: {
    seminarRoomsDiff?: number;
    sharePctDiff?: number;
    revenueGrowthRate?: number;
    adrGrowthRate?: number;
  };
}

export interface SeminarDayTypeShare {
  weekday: SeminarDayTypeMetric;
  weekend: SeminarDayTypeMetric;
  total: SeminarDayTypeMetric;
}

export interface RawGroupItem {
  groupId?: string;
  groupName?: string;
  corporateName?: string;
  b2bSegment?: string;
  b2bSegmentName?: string;
  category?: string;
  categoryName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  salesManager?: string;
  checkInDate?: string;
  checkOutDate?: string;
  stayDays?: number;
  paxCount?: number;
  totalRevenue?: number;
  spendingBreakdown?: {
    roomRevenue?: number;
    roomsCount?: number;
    roomTypesUsed?: string[];
    fnbRevenue?: number;
    golfRevenue?: number;
    leisureRevenue?: number;
  };
  paymentMethod?: string;
  notes?: string;
}

export interface GroupVisitDetail {
  groupId: string;
  checkIn: string;
  checkOut: string;
  stayDays: number;
  roomsCount: number;
  paxCount: number;
  roomRevenue: number;
  roomTypesUsed: string[];
  contactName: string;
  contactPhone: string;
  salesManager: string;
  notes: string;
  paymentMethod: string;
  isWeekend: boolean;
}

export interface GroupOrganizationSummary {
  name: string;
  corporateName: string;
  categoryName: string;
  visitCount: number | null;
  isRepeatCustomer: boolean;
  totalRooms: number | null;
  totalPax: number | null;
  totalRevenue: number | null;
  roomTypesSummary: string[];
  firstCheckIn: string;
  lastCheckIn: string;
  primaryContact: string;
  primaryPhone: string;
  salesManager: string;
  visits: GroupVisitDetail[];
}



// 채널별 시각적 아이콘 & 테마 색상 매핑
const CHANNEL_META_MAP: Record<string, { iconType: ChannelGroup['iconType']; badgeColor: string; label: string }> = {
  '단체영업': { iconType: 'group', badgeColor: 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/20', label: '단체영업' },
  '세미나': { iconType: 'group', badgeColor: 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/20', label: '단체영업' },
  '기업영업': { iconType: 'corporate', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', label: '기업영업' },
  '휴양소': { iconType: 'corporate', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', label: '기업영업' },
  '자사채널': { iconType: 'direct', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '자사 채널' },
  '홈페이지': { iconType: 'direct', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '자사 채널' },
  '온라인여행사': { iconType: 'ota', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200', label: '온라인 여행사' },
  'OTA': { iconType: 'ota', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200', label: '온라인 여행사' },
  '전화예약': { iconType: 'phone', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200', label: '전화/예약실' },
  '전화/메신저': { iconType: 'phone', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200', label: '전화/예약실' },
};

const getChannelMeta = (channelName: string): { iconType: ChannelGroup['iconType']; badgeColor: string; label: string } => {
  return CHANNEL_META_MAP[channelName] || { iconType: 'etc', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', label: channelName };
};

export type SalesPageSectionType = 'ROOM_CHANNELS' | 'VENUE_PERFORMANCE' | 'GROUP_MASTER_CRM' | 'GROUP_VENUE_PREFERENCE';

export interface GroupSalesProps {
  pageSection?: SalesPageSectionType;
}

export default function GroupSales({ pageSection = 'ROOM_CHANNELS' }: GroupSalesProps) {
  const { startDate, endDate, isRange, setStartDate, setEndDate } = useDate();
  
  const [channelRawData, setChannelRawData] = useState<RawChannelRoomItem[]>([]);
  const [seminarShare, setSeminarShare] = useState<SeminarDayTypeShare | null>(null);
  const [rawGroupData, setRawGroupData] = useState<RawGroupItem[]>([]);
  const [corporateSummary, setCorporateSummary] = useState<any>(null);
  const [groupSearchKeyword, setGroupSearchKeyword] = useState<string>('');
  const [groupFilterTab, setGroupFilterTab] = useState<'ALL' | 'REPEAT' | 'LARGE' | 'SINGLE'>('ALL');
  const [expandedGroupNames, setExpandedGroupNames] = useState<Set<string>>(new Set());
  const [isGroupMasterListOpen, setIsGroupMasterListOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 🎯 사용자의 핵심 요구사항: 세일즈본부는 '단체영업(세미나)'이 주력이므로 기본값 고정
  const [selectedChannel, setSelectedChannel] = useState<string>('단체영업(세미나)');
  
  // 뷰 모드: FOCUS_SINGLE(선택된 판매방식 집중 뷰 - 기본), PIVOT_MATRIX(크로스 피벗 매트릭스), ALL_CHANNELS(전체 판매방식 목록)
  const [viewMode, setViewMode] = useState<'FOCUS_SINGLE' | 'PIVOT_MATRIX' | 'ALL_CHANNELS'>('FOCUS_SINGLE');
  
  // 0실/0원 항목 제외 필터
  const [hideZeroSales, setHideZeroSales] = useState<boolean>(true);

  // 🏛️ [NEW] 장소별(Venue) 판매 현황 및 평균가격 상태
  const [venuePerformanceData, setVenuePerformanceData] = useState<SalesVenuePerformanceResponse | null>(null);
  const [venueLoading, setVenueLoading] = useState<boolean>(true);
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('ALL');
  const [venueSearchKeyword, setVenueSearchKeyword] = useState<string>('');

  // 🏆 [Ticket 31] 판촉 영업담당자(영업직원명)별 B2B·연회 수주 순기여도 및 세미나홀 가동 데이터
  const [salesRepIntel, setSalesRepIntel] = useState<any>(null);

  const toggleGroupExpand = (name: string) => {
    setExpandedGroupNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const applyPreset = (preset: DatePresetType) => {
    const range = getPresetDateRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const isPresetActive = (preset: DatePresetType) => {
    const p = getPresetDateRange(preset);
    if (p.isRange) {
      return startDate === p.startDate && endDate === p.endDate;
    }
    return startDate === p.startDate && !endDate;
  };

  const fetchSalesData = async () => {
    setLoading(true);
    setVenueLoading(true);
    try {
      const isRangeQuery = Boolean(endDate && startDate !== endDate);
      const effectiveEnd = isRangeQuery && endDate ? endDate : startDate;
      const queryParams = isRangeQuery
        ? `startDate=${startDate}&endDate=${effectiveEnd}`
        : `startDate=${startDate}&endDate=${startDate}`;

      // 1. 판매방식 × 평형별 세그먼트 교차 데이터 (SSOT API)
      // 2. 단체영업(세미나) 실제 예약 단체 명부 및 복수 방문 내역 (SSOT API)
      // 3. 세일즈본부 연회/세미나실 장소별(Venue) 판매 분석 및 단체 명부 (SSOT API)
      // 4. [Ticket 31] 판촉 영업담당자별 객실·연회 수주 순기여도 및 세미나홀 가동 효율 (SSOT API)
      const [channelRes, channelSummaryRes, corporateRes, venueRes, repIntelRes] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/room-channel-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/room-sales-by-channel?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/corporate-group-sales?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/sales-venue-performance?${queryParams}`).catch(() => null),
        secureFetcher(`${API_BASE}/api/v6/report/sales-rep-banquet-intelligence?${queryParams}`).catch(() => null)
      ]);

      const detailRows: RawChannelRoomItem[] = Array.isArray(channelRes?.data)
        ? channelRes.data
        : Array.isArray(channelRes)
        ? channelRes
        : [];

      const summaryRows: RawChannelRoomItem[] = Array.isArray(channelSummaryRes?.data)
        ? channelSummaryRes.data.filter(
            (r: any) =>
              r.isChannelSubtotal ||
              r.isSubtotal ||
              r.isGrandTotal ||
              r.roomType === '전체' ||
              r.channelName === '총합계'
          )
        : [];

      setChannelRawData([...detailRows, ...summaryRows]);

      if (channelRes?.seminarShare) {
        setSeminarShare(channelRes.seminarShare);
      } else {
        setSeminarShare(null);
      }

      if (corporateRes?.groups && Array.isArray(corporateRes.groups)) {
        setRawGroupData(corporateRes.groups);
      } else if (corporateRes?.data?.groups && Array.isArray(corporateRes.data.groups)) {
        setRawGroupData(corporateRes.data.groups);
      } else {
        setRawGroupData([]);
      }

      if (corporateRes?.summary) {
        setCorporateSummary(corporateRes.summary);
      } else if (corporateRes?.data?.summary) {
        setCorporateSummary(corporateRes.data.summary);
      } else {
        setCorporateSummary(null);
      }

      // 장소별 판매 실적 데이터 연동 (백엔드 완제품 파싱)
      if (venueRes && (venueRes.venues || venueRes.summary || venueRes.monthlyTrends)) {
        setVenuePerformanceData(venueRes);
      } else {
        setVenuePerformanceData(null);
      }

      // [Ticket 31] 판촉 담당자 수주 및 세미나홀 가동률 데이터 연동
      const parsedRepIntel = repIntelRes?.data && !Array.isArray(repIntelRes.data) ? repIntelRes.data : repIntelRes;
      if (parsedRepIntel && (parsedRepIntel.summary || parsedRepIntel.salesReps || parsedRepIntel.salesRepPerformance)) {
        setSalesRepIntel({
          summary: parsedRepIntel.summary || {},
          salesReps: Array.isArray(parsedRepIntel.salesReps) ? parsedRepIntel.salesReps : (Array.isArray(parsedRepIntel.salesRepPerformance) ? parsedRepIntel.salesRepPerformance : []),
          banquetHalls: Array.isArray(parsedRepIntel.banquetHalls) ? parsedRepIntel.banquetHalls : (Array.isArray(parsedRepIntel.banquetHallUtilization) ? parsedRepIntel.banquetHallUtilization : [])
        });
      } else {
        setSalesRepIntel(null);
      }
    } catch (err) {
      console.error('Channel Room / Corporate Group Sales / Venue Fetch Error:', err);
      setChannelRawData([]);
      setSeminarShare(null);
      setRawGroupData([]);
      setCorporateSummary(null);
      setVenuePerformanceData(null);
      setSalesRepIntel(null);
    } finally {
      setLoading(false);
      setVenueLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, isRange]);

  // 🏛️ 판매방식(채널)별 × 평형별 세그먼트 정규화 및 집계 (100% 백엔드 완제품 바인딩)
  const { channelGroups, grandTotals, uniqueRoomTypes, availableChannels } = useMemo(() => {
    const channelMap = new Map<string, RawChannelRoomItem[]>();
    const subtotalMap = new Map<string, RawChannelRoomItem>();
    const roomTypeSet = new Set<string>();
    let grandTotalRecord: RawChannelRoomItem | undefined;

    channelRawData.forEach(item => {
      const channel = String(item.channelName || item.channel_name || item.channel || '기타채널').trim();
      const room = String(item.roomType || item.room_type || '기타').trim();

      if ((item as any).isGrandTotal || channel === '총합계') {
        grandTotalRecord = item;
        return;
      }
      if ((item as any).isChannelSubtotal || (item as any).isSubtotal || room === '전체') {
        subtotalMap.set(channel, item);
        return;
      }

      const rooms = Number(item.todayRooms ?? item.mtdRooms ?? 0);
      const revenue = Number(item.todayRevenue ?? item.mtdRevenue ?? 0);
      
      // 0원/0실 필터링
      if (hideZeroSales && rooms <= 0 && revenue === 0) return;

      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(item);

      roomTypeSet.add(room);
    });

    // 1. 판매방식별 그룹 생성
    const groups: ChannelGroup[] = [];

    channelMap.forEach((items, chName) => {
      const segItems: SegmentItem[] = [];

      items.forEach(raw => {
        const rType = String(raw.roomType || raw.room_type || '기타').trim();
        const rooms = Number(raw.todayRooms ?? raw.mtdRooms ?? 0);
        const rev = Number(raw.todayRevenue ?? raw.mtdRevenue ?? 0);
        const adr = Number(raw.todayAdr ?? raw.adr ?? 0);
        const guests = Number(raw.todayGuests ?? raw.guests ?? raw.mtdGuests ?? 0);
        const rawChShare = raw.channelSharePct ?? raw.sharePct;

        segItems.push({
          roomType: rType,
          roomsSold: rooms,
          revenue: rev,
          adr,
          guests,
          channelSharePct: rawChShare != null ? Number(rawChShare) : null,
          grandSharePct: raw.grandSharePct != null ? Number(raw.grandSharePct) : null
        });
      });

      // 평형 정렬: 매출액 내림차순 및 명칭 정렬
      segItems.sort((a, b) => b.revenue - a.revenue || a.roomType.localeCompare(b.roomType));

      const meta = getChannelMeta(chName);

      const subtotalItem = subtotalMap.get(chName) || items.find(i => (i as any).isChannelSubtotal || (i as any).isSubtotal);
      const subtotalRooms = Number((subtotalItem as any)?.todayRooms ?? (subtotalItem as any)?.mtdRooms ?? (subtotalItem as any)?.totalRooms ?? 0);
      const subtotalRev = Number((subtotalItem as any)?.todayRevenue ?? (subtotalItem as any)?.mtdRevenue ?? (subtotalItem as any)?.totalRevenue ?? 0);
      const subtotalGuests = Number((subtotalItem as any)?.todayGuests ?? (subtotalItem as any)?.guests ?? (subtotalItem as any)?.mtdGuests ?? (subtotalItem as any)?.totalGuests ?? 0);
      const subtotalAdr = Number(subtotalItem?.adr ?? (subtotalItem as any)?.todayAdr ?? (subtotalItem as any)?.averageAdr ?? 0);
      const rawSubtotalShare = (subtotalItem as any)?.revenueSharePct ?? (subtotalItem as any)?.sharePct;
      const channelSharePct = rawSubtotalShare != null ? Number(rawSubtotalShare) : null;

      groups.push({
        channelName: chName,
        iconType: meta.iconType,
        badgeColor: meta.badgeColor,
        totalRooms: subtotalRooms,
        totalRevenue: subtotalRev,
        totalGuests: subtotalGuests,
        averageAdr: subtotalAdr,
        revenueSharePct: channelSharePct,
        items: segItems
      });
    });

    // 판매방식 정렬: 매출액 기준 내림차순
    groups.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const sortedRoomTypes = Array.from(roomTypeSet).sort((a, b) => a.localeCompare(b));

    const grandRev = Number(
      (grandTotalRecord as any)?.todayRevenue ??
      (grandTotalRecord as any)?.mtdRevenue ??
      (grandTotalRecord as any)?.totalRevenue ??
      seminarShare?.total?.totalRevenue ??
      0
    );
    const grandRms = Number(
      (grandTotalRecord as any)?.todayRooms ??
      (grandTotalRecord as any)?.mtdRooms ??
      (grandTotalRecord as any)?.totalRooms ??
      seminarShare?.total?.totalRooms ??
      0
    );
    const grandGsts = Number(
      (grandTotalRecord as any)?.todayGuests ??
      (grandTotalRecord as any)?.guests ??
      (grandTotalRecord as any)?.mtdGuests ??
      (grandTotalRecord as any)?.totalGuests ??
      0
    );
    const grandAdrVal = Number(
      grandTotalRecord?.adr ??
      (grandTotalRecord as any)?.todayAdr ??
      (grandTotalRecord as any)?.averageAdr ??
      0
    );

    return {
      channelGroups: groups,
      grandTotals: {
        revenue: grandRev,
        rooms: grandRms,
        guests: grandGsts,
        adr: grandAdrVal
      },
      uniqueRoomTypes: sortedRoomTypes,
      availableChannels: groups.map(g => g.channelName)
    };
  }, [channelRawData, hideZeroSales, seminarShare]);

  // 🎯 현재 활성화된 채널 그룹 (기본: 단체영업)
  const activeChannelGroup = useMemo(() => {
    if (selectedChannel === 'ALL') return null;
    return channelGroups.find(g => g.channelName === selectedChannel) 
      || channelGroups.find(g => g.channelName === '단체영업' || g.channelName === '세미나') 
      || channelGroups[0] 
      || null;
  }, [channelGroups, selectedChannel]);

  // 🏛️ 단체영업(세미나)의 주중/주말/통합 비중 산출 (호텔 요금제 기준: 일~목 주중, 금/토 주말)
  const seminarDayTypeStats = useMemo<SeminarDayTypeShare>(() => {
    if (seminarShare) {
      return seminarShare;
    }

    return {
      weekday: {
        label: '주중 (일~목 체크인)',
        daysCount: 0,
        totalRooms: 0,
        seminarRooms: 0,
        sharePct: 0,
        totalRevenue: 0,
        seminarRevenue: 0,
        revenueSharePct: 0,
        averageAdr: 0
      },
      weekend: {
        label: '주말 (금·토 체크인)',
        daysCount: 0,
        totalRooms: 0,
        seminarRooms: 0,
        sharePct: 0,
        totalRevenue: 0,
        seminarRevenue: 0,
        revenueSharePct: 0,
        averageAdr: 0
      },
      total: {
        label: '통합 (전체)',
        daysCount: 0,
        totalRooms: grandTotals.rooms || 0,
        seminarRooms: 0,
        sharePct: 0,
        totalRevenue: grandTotals.revenue || 0,
        seminarRevenue: 0,
        revenueSharePct: 0,
        averageAdr: 0
      }
    };
  }, [seminarShare, grandTotals]);

  // 상단 4대 KPI 지표 계산 (선택 채널 vs 전사)
  const isAllMode = selectedChannel === 'ALL';
  const isCurrentSeminar = !isAllMode && Boolean(
    activeChannelGroup?.channelName?.includes('단체') || 
    activeChannelGroup?.channelName?.includes('세미나') || 
    selectedChannel?.includes('단체') || 
    selectedChannel?.includes('세미나')
  );
  const isCorpFit = !isAllMode && Boolean(
    activeChannelGroup?.channelName?.includes('기업') || 
    activeChannelGroup?.channelName?.includes('휴양소') || 
    selectedChannel?.includes('기업') || 
    selectedChannel?.includes('휴양소')
  );

  const displayRevenue = isAllMode ? grandTotals.revenue : (activeChannelGroup?.totalRevenue || 0);
  const displayRooms = isAllMode ? grandTotals.rooms : (activeChannelGroup?.totalRooms || 0);
  const displayAdr = isAllMode 
    ? grandTotals.adr 
    : (isCurrentSeminar && seminarDayTypeStats.total.averageAdr > 0 
        ? seminarDayTypeStats.total.averageAdr 
        : (activeChannelGroup?.averageAdr || 0));

  // Card 3: B2B 단체 행사 유치 인원 지표 (채널별 엄격 매칭 & 가짜 숫자 원천 차단)
  const eventPaxMeta = useMemo(() => {
    if (isAllMode) {
      const pax = corporateSummary?.totalPax ? Number(corporateSummary.totalPax) : 0;
      const micePax = corporateSummary?.mice?.totalPax ? Number(corporateSummary.mice.totalPax) : 0;
      const corpPax = corporateSummary?.corpFit?.totalPax != null ? Number(corporateSummary.corpFit.totalPax) : null;
      return {
        title: '전사 B2B 유치 총인원',
        badge: 'B2B 종합',
        pax: pax > 0 ? pax : null,
        subtext: pax > 0 
          ? (corpPax != null ? `MICE ${micePax.toLocaleString()}명 + 법인휴양소 등 ${corpPax.toLocaleString()}명` : `MICE ${micePax.toLocaleString()}명 포함 B2B 종합`)
          : 'B2B 유치 단체 데이터 연동 기준'
      };
    }
    if (isCurrentSeminar) {
      const micePax = corporateSummary?.mice?.totalPax ? Number(corporateSummary.mice.totalPax) : 0;
      return {
        title: '선택 채널 행사 인원',
        badge: 'MICE 유치 실적',
        pax: micePax > 0 ? micePax : null,
        subtext: micePax > 0 
          ? 'PMS 세미나/MICE 유치 행사 참가 인원 (농어촌공사 등)'
          : '해당 기간 MICE 유치 행사 없음'
      };
    }
    if (isCorpFit) {
      const corpPax = corporateSummary?.corpFit?.totalPax ? Number(corporateSummary.corpFit.totalPax) : 0;
      return {
        title: '선택 채널 유치 인원',
        badge: '법인 휴양소',
        pax: corpPax > 0 ? corpPax : null,
        subtext: corpPax > 0
          ? '법인 임직원 휴양소 배정/이용 인원'
          : '해당 기간 법인 휴양소 유치 실적'
      };
    }
    // 일반 개인 채널 (OTA, 자사채널, 전화/메신저 등): B2B 단체 행사 미해당 (Fail-Stop)
    return {
      title: '선택 채널 행사 인원',
      badge: '일반 채널',
      pax: null,
      subtext: 'B2B 단체 행사 미해당 (개인 예약 채널)'
    };
  }, [isAllMode, isCurrentSeminar, isCorpFit, corporateSummary]);

  const displayRevenueFinancial = formatFinancialKorean(displayRevenue);
  const grandRevenueFinancial = formatFinancialKorean(grandTotals.revenue);

  // 👥 단체영업(세미나) 예약 단체 마스터 명부 및 복수 방문 집계
  const { organizedGroups, totalSeminarGroupsCount, repeatGroupsCount, totalBookedRoomsInGroups } = useMemo(() => {
    const seminarRecords = rawGroupData.filter(g => 
      g.category === 'SEMINAR' || 
      g.b2bSegment === 'MICE' ||
      (g.spendingBreakdown?.roomsCount && g.spendingBreakdown.roomsCount >= 5)
    );

    const orgMap = new Map<string, GroupOrganizationSummary>();

    seminarRecords.forEach(g => {
      const name = String(g.groupName || g.corporateName || '기타 단체').trim();
      const rooms = Number(g.spendingBreakdown?.roomsCount || 0);
      const pax = Number(g.paxCount || 0);
      const rev = Number(g.spendingBreakdown?.roomRevenue || g.totalRevenue || 0);
      const checkIn = g.checkInDate || '';
      const checkOut = g.checkOutDate || '';
      const types = g.spendingBreakdown?.roomTypesUsed || [];

      // 주말 체크 (금, 토 체크인 = 주말)
      const dayOfWeek = checkIn ? new Date(checkIn).getDay() : -1;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

      const visit: GroupVisitDetail = {
        groupId: g.groupId || '',
        checkIn,
        checkOut,
        stayDays: Number(g.stayDays || 1),
        roomsCount: rooms,
        paxCount: pax,
        roomRevenue: rev,
        roomTypesUsed: types,
        contactName: g.contactName || '',
        contactPhone: g.contactPhone || '',
        salesManager: g.salesManager || '',
        notes: g.notes || '',
        paymentMethod: g.paymentMethod || '후정산',
        isWeekend
      };

      const backendVisitCount = (g as any).visitCount != null ? Number((g as any).visitCount) : null;
      const backendOrgRooms = (g as any).organizationTotalRooms != null ? Number((g as any).organizationTotalRooms) : null;
      const backendOrgPax = (g as any).organizationTotalPax != null ? Number((g as any).organizationTotalPax) : null;
      const backendOrgRev = (g as any).organizationTotalRevenue != null ? Number((g as any).organizationTotalRevenue) : null;

      if (!orgMap.has(name)) {
        orgMap.set(name, {
          name,
          corporateName: g.corporateName || name,
          categoryName: g.categoryName || '기업 세미나/워크샵',
          visitCount: backendVisitCount,
          isRepeatCustomer: Boolean((g as any).isRepeatCustomer ?? (backendVisitCount != null && backendVisitCount > 1)),
          totalRooms: backendOrgRooms ?? rooms,
          totalPax: backendOrgPax ?? pax,
          totalRevenue: backendOrgRev ?? rev,
          roomTypesSummary: [...types],
          firstCheckIn: (g as any).firstCheckIn || checkIn,
          lastCheckIn: (g as any).lastCheckIn || checkIn,
          primaryContact: g.contactName || '',
          primaryPhone: g.contactPhone || '',
          salesManager: g.salesManager || '',
          visits: [visit]
        });
      } else {
        const org = orgMap.get(name)!;
        org.visits.push(visit);
        if (backendOrgRooms == null) org.totalRooms = null;
        if (backendOrgPax == null) org.totalPax = null;
        if (backendOrgRev == null) org.totalRevenue = null;
        if (checkIn && (!org.firstCheckIn || checkIn < org.firstCheckIn)) {
          org.firstCheckIn = checkIn;
        }
        if (checkIn && (!org.lastCheckIn || checkIn > org.lastCheckIn)) {
          org.lastCheckIn = checkIn;
        }
        types.forEach(t => {
          if (!org.roomTypesSummary.includes(t)) {
            org.roomTypesSummary.push(t);
          }
        });
      }
    });

    const list = Array.from(orgMap.values());
    
    // 기본 정렬: 복수 방문(단골) 우선, 그 다음 총 객실수 내림차순
    list.sort((a, b) => {
      if (b.isRepeatCustomer !== a.isRepeatCustomer) {
        return b.isRepeatCustomer ? 1 : -1;
      }
      return (b.totalRooms ?? 0) - (a.totalRooms ?? 0);
    });

    const repeats = Number((corporateSummary as any)?.repeatGroupsCount ?? (corporateSummary as any)?.seminar?.repeatGroupsCount ?? 0);
    const totalRooms = Number((corporateSummary as any)?.mice?.roomsCount ?? (corporateSummary as any)?.seminar?.totalRooms ?? 0);

    return {
      organizedGroups: list,
      totalSeminarGroupsCount: Number((corporateSummary as any)?.mice?.groupsCount ?? (corporateSummary as any)?.seminar?.totalGroupsCount ?? (corporateSummary as any)?.totalGroups ?? 0),
      repeatGroupsCount: repeats,
      totalBookedRoomsInGroups: totalRooms
    };
  }, [rawGroupData, corporateSummary]);

  // 필터링 적용된 단체 목록
  const filteredOrganizedGroups = useMemo(() => {
    return organizedGroups.filter(org => {
      // 탭 필터
      if (groupFilterTab === 'REPEAT' && !org.isRepeatCustomer) return false;
      if (groupFilterTab === 'SINGLE' && org.isRepeatCustomer) return false;
      if (groupFilterTab === 'LARGE' && (org.totalRooms ?? 0) < 20) return false;

      // 검색어 필터
      if (groupSearchKeyword) {
        const kw = groupSearchKeyword.toLowerCase();
        const matchName = org.name.toLowerCase().includes(kw);
        const matchContact = org.primaryContact.toLowerCase().includes(kw);
        const matchPhone = org.primaryPhone.includes(kw);
        const matchType = org.roomTypesSummary.some(t => t.toLowerCase().includes(kw));
        if (!matchName && !matchContact && !matchPhone && !matchType) return false;
      }

      return true;
    });
  }, [organizedGroups, groupFilterTab, groupSearchKeyword]);

  // 🏛️ [NEW] 장소별 판매 실적 필터링 및 고유 장소명 추출 메모
  const { filteredVenueBookings, uniqueVenueNames } = useMemo(() => {
    const rawVenues = venuePerformanceData?.venues || [];
    const rawBookings = venuePerformanceData?.groupBookings || [];

    const venueNames = Array.from(new Set(rawVenues.map(v => v.venueName))).filter(Boolean);

    const filtered = rawBookings.filter(b => {
      if (selectedVenueFilter !== 'ALL' && b.venueName !== selectedVenueFilter) {
        return false;
      }
      if (venueSearchKeyword) {
        const kw = venueSearchKeyword.toLowerCase();
        const matchClient = (b.clientName || b.corporateName || '')?.toLowerCase().includes(kw);
        const matchEvent = (b.eventName || '')?.toLowerCase().includes(kw);
        const matchResNo = (b.reservationNo || b.eventId || '')?.toLowerCase().includes(kw);
        const matchVenue = (b.venueName || '')?.toLowerCase().includes(kw);
        const matchManager = (b.salesManager || '')?.toLowerCase().includes(kw);
        const matchPackage = (b.packageType || '')?.toLowerCase().includes(kw);
        if (!matchClient && !matchEvent && !matchResNo && !matchVenue && !matchManager && !matchPackage) return false;
      }
      return true;
    });

    return {
      filteredVenueBookings: filtered,
      uniqueVenueNames: venueNames
    };
  }, [venuePerformanceData, selectedVenueFilter, venueSearchKeyword]);

  const pageHeaderMeta = {
    ROOM_CHANNELS: {
      title: '세일즈본부 객실 판매방식 & 세미나 점유율',
      badge: '주력: 단체영업(세미나)',
      desc: '리조트 전체 판매 객실 대비 단체 세미나 점유율(주중·주말·YoY)과 판매방식×평형별 실적을 집중 분석합니다.'
    },
    VENUE_PERFORMANCE: {
      title: '세일즈본부 연회·세미나실 대관 현황 & 단가 분석',
      badge: '세미나A · 세미나B · 벨포레홀 · 그랜드볼룸',
      desc: '연회 및 세미나실 장소별 대관 건수, 건당 평균 대관 단가, 월별 추이 매트릭스 및 대관 이용 기업 명부를 분석합니다.'
    },
    GROUP_MASTER_CRM: {
      title: '세일즈본부 단체 예약 명부 & 판촉 수주 기여도',
      badge: '재방문 단체 CRM · 영업담당자 순기여도',
      desc: '세미나/워크샵 예약 단체 마스터 명부(복수 방문 단골·차수별 상세)와 판촉 영업담당자별 B2B 수주 리더보드를 조회합니다.'
    },
    GROUP_VENUE_PREFERENCE: {
      title: '세일즈본부 단체 방문 매장 순위 & 평균 매출 · 동선',
      badge: '식음·부대 매장 선호도 분석',
      desc: '숙박·연회 단체가 리조트 내 식음·부대 영업장을 방문한 순위, B2B 팀당 평균 매출, 방문일 급증률 및 선호 동선을 분석합니다.'
    }
  }[pageSection];

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      
      {/* 🌲 Luxury Deep Forest Banner with Ambient Glow (Home Style) */}
      <div className="w-full bg-[#284F42] h-[220px] md:h-[210px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8 space-y-6">
        
        {/* 1. Header with Institutional Polish (모든 세일즈본부 4대 탭 공통 헤더) */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-[#D0C6BB]/80 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#284F42] text-white rounded-2xl border border-[#1B382E] shrink-0 shadow-xs">
              <Briefcase className="w-7 h-7 text-[#B59269]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#284F42]/10 border border-[#284F42]/20 text-[#284F42] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                  <span>BELLEFORET RESORT · 세일즈본부</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#B59269]/15 text-[#B59269] border border-[#B59269]/30">
                  {pageHeaderMeta.badge}
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1B382E] tracking-tight break-keep">
                {pageHeaderMeta.title}
              </h1>
              <p className="text-sm text-[#5A6B63] mt-1 break-keep max-w-4xl leading-relaxed">
                {pageHeaderMeta.desc}
              </p>
            </div>
          </div>

          {/* Global Date & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#F4F3EE] p-1.5 rounded-xl text-xs overflow-x-auto border border-[#D0C6BB]/70">
              {[
                { key: 'WEEK', label: '최근 7일' },
                { key: 'MTD', label: '당월' },
                { key: 'PAST_6M', label: '6개월' },
                { key: 'YTD', label: '연간' }
              ].map(p => {
                const active = isPresetActive(p.key as DatePresetType);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key as DatePresetType)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      active ? 'bg-[#284F42] text-white shadow-xs' : 'text-[#5A6B63] hover:text-[#1B382E]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <GlobalDatePicker showPresets={false} />
            <button
              onClick={fetchSalesData}
              disabled={loading}
              className="px-4 py-2 bg-[#B59269] hover:bg-[#a38058] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>조회</span>
            </button>
          </div>
        </div>

        {/* 2. 세일즈본부 4대 세부 페이지 공통 네비게이션 */}
        <SalesDivisionNav />

      {pageSection === 'ROOM_CHANNELS' && (
      <>
      {/* 🌟 2. 전체 객실 대비 단체영업(세미나) 점유율 분석 (통합 / 주중 / 주말 3단 패널 with YoY 비교) */}
      <div className="bg-white p-6 lg:p-7 rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group">
        
        {/* 소프트 패널 (Bento Style) */}
        <div className="bg-[#F4F3EE]/70 p-5 rounded-2xl border border-[#D0C6BB]/70">
          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg lg:text-xl font-extrabold tracking-tight text-slate-900">
                    전체 판매 객실 대비 단체영업(세미나) 점유율 분석
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    호텔 요금 기준 (일~목 주중 / 금·토 주말)
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <TrendingUp size={12} />
                    작년 동기(YoY) 비교 모드
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  리조트 전체 객실 중 세일즈본부 단체 세미나가 점유하는 비중을 주중·주말별 및 작년 동기(YoY)와 비교 분석합니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <CalendarDays size={14} className="text-teal-600" />
              <span>조회 {endDate && startDate !== endDate ? '구간' : '일자'}: <strong className="text-slate-900 font-bold">{endDate && startDate !== endDate ? `${startDate} ~ ${endDate}` : `${startDate} 당일`}</strong></span>
            </div>
          </div>

          {/* 3-Column Bento Grid: 통합 / 주중 / 주말 (with YoY Comparison) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. 통합 (Total) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 size={15} className="text-teal-600" />
                    <span>통합 전체 점유율</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {seminarDayTypeStats.total.daysCount}일간 합산
                    </span>
                    {seminarDayTypeStats.total.growth?.sharePctDiff !== undefined ? (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 border ${
                        seminarDayTypeStats.total.growth.sharePctDiff >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {seminarDayTypeStats.total.growth.sharePctDiff >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {seminarDayTypeStats.total.growth.sharePctDiff > 0 ? '+' : ''}{seminarDayTypeStats.total.growth.sharePctDiff.toFixed(1)}%p YoY
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="전년 동기 비교 데이터 확인 중">
                        YoY 미집계
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl lg:text-4xl font-black font-financial tracking-tight text-slate-900 tabular-nums">
                      {seminarDayTypeStats.total.sharePct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-teal-700 font-semibold">당해 점유</span>
                  </div>
                  {seminarDayTypeStats.total.ly && (
                    <div className="text-right text-xs text-slate-500">
                      <span className="text-[10px] block text-slate-400">작년 동기</span>
                      <strong className="text-slate-700 font-extrabold font-financial tabular-nums">
                        {seminarDayTypeStats.total.ly.sharePct.toFixed(1)}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Progress Gauge Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-slate-700 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, seminarDayTypeStats.total.sharePct)}%` }}
                  />
                </div>

                {/* Rooms Comparison Block */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-700 font-medium flex items-center justify-between">
                    <span>당해 실적:</span>
                    <span>
                      전체 <strong className="text-slate-900 font-bold">{seminarDayTypeStats.total.totalRooms.toLocaleString()}실</strong> 중{' '}
                      <strong className="text-teal-700 font-bold">{seminarDayTypeStats.total.seminarRooms.toLocaleString()}실</strong> 계약
                    </span>
                  </div>
                  {seminarDayTypeStats.total.ly ? (
                    <div className="text-slate-500 text-[11px] flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>작년 동기 실적:</span>
                      <span>
                        세미나 <strong className="text-slate-800">{seminarDayTypeStats.total.ly.seminarRooms.toLocaleString()}실</strong>{' '}
                        {seminarDayTypeStats.total.growth?.seminarRoomsDiff !== undefined && (
                          <span className={`font-bold ml-1 ${
                            seminarDayTypeStats.total.growth.seminarRoomsDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.total.growth.seminarRoomsDiff > 0 ? '+' : ''}{seminarDayTypeStats.total.growth.seminarRoomsDiff.toLocaleString()}실)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-200 flex items-center justify-between">
                      <span>전년 동기 비교:</span>
                      <span className="text-slate-400">전년 동기 데이터 없음</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details (Revenue & ADR with YoY) */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-financial">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">세미나 숙박 매출 (점유율)</span>
                    <span className="font-extrabold text-slate-900">
                      {formatRevenue(seminarDayTypeStats.total.seminarRevenue)}원 ({seminarDayTypeStats.total.revenueSharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 동기 숙박 매출 (증감률)</span>
                    {seminarDayTypeStats.total.ly ? (
                      <span className="font-bold text-slate-700">
                        {formatRevenue(seminarDayTypeStats.total.ly.seminarRevenue)}원{' '}
                        {seminarDayTypeStats.total.growth?.revenueGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.total.growth.revenueGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.total.growth.revenueGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.total.growth.revenueGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">세미나 평균 ADR</span>
                    <span className="font-extrabold text-slate-900">
                      {seminarDayTypeStats.total.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.total.averageAdr)}원` : '-'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 ADR (증감률)</span>
                    {seminarDayTypeStats.total.ly ? (
                      <span className="font-bold text-slate-700">
                        {seminarDayTypeStats.total.ly.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.total.ly.averageAdr)}원 ` : '- '}
                        {seminarDayTypeStats.total.growth?.adrGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.total.growth.adrGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.total.growth.adrGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.total.growth.adrGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 주중 (일~목 체크인) ★ 주력 */}
            <div className="bg-white rounded-xl p-5 border border-teal-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Briefcase size={15} className="text-teal-700" />
                    <span>주중 (일~목 체크인)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded shadow-2xs">
                      ★ 핵심 주력
                    </span>
                    {seminarDayTypeStats.weekday.growth?.sharePctDiff !== undefined ? (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 border ${
                        seminarDayTypeStats.weekday.growth.sharePctDiff >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {seminarDayTypeStats.weekday.growth.sharePctDiff >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {seminarDayTypeStats.weekday.growth.sharePctDiff > 0 ? '+' : ''}{seminarDayTypeStats.weekday.growth.sharePctDiff.toFixed(1)}%p YoY
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="전년 동기 비교 데이터 확인 중">
                        YoY 미집계
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl lg:text-4xl font-black font-financial tracking-tight text-slate-900 tabular-nums">
                      {seminarDayTypeStats.weekday.sharePct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-teal-700 font-semibold">{seminarDayTypeStats.weekday.sharePct >= 50 ? '과반 점유' : '주중 점유'}</span>
                  </div>
                  {seminarDayTypeStats.weekday.ly && (
                    <div className="text-right text-xs text-slate-500">
                      <span className="text-[10px] block text-slate-400">작년 동기</span>
                      <strong className="text-teal-900 font-extrabold font-financial tabular-nums">
                        {seminarDayTypeStats.weekday.ly.sharePct.toFixed(1)}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Progress Gauge Bar */}
                <div className="w-full bg-teal-100/70 h-2 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, seminarDayTypeStats.weekday.sharePct)}%` }}
                  />
                </div>

                {/* Rooms Comparison Block */}
                <div className="bg-teal-50/60 p-2.5 rounded-lg border border-teal-100 text-xs space-y-1">
                  <div className="text-slate-800 font-medium flex items-center justify-between">
                    <span>당해 실적:</span>
                    <span>
                      주중 <strong className="text-slate-900 font-bold">{seminarDayTypeStats.weekday.totalRooms.toLocaleString()}실</strong> 중{' '}
                      <strong className="text-teal-800 font-bold">{seminarDayTypeStats.weekday.seminarRooms.toLocaleString()}실</strong> 계약
                    </span>
                  </div>
                  {seminarDayTypeStats.weekday.ly ? (
                    <div className="text-slate-600 text-[11px] flex items-center justify-between pt-1 border-t border-teal-100">
                      <span>작년 동기 실적:</span>
                      <span>
                        세미나 <strong className="text-slate-900">{seminarDayTypeStats.weekday.ly.seminarRooms.toLocaleString()}실</strong>{' '}
                        {seminarDayTypeStats.weekday.growth?.seminarRoomsDiff !== undefined && (
                          <span className={`font-bold ml-1 ${
                            seminarDayTypeStats.weekday.growth.seminarRoomsDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekday.growth.seminarRoomsDiff > 0 ? '+' : ''}{seminarDayTypeStats.weekday.growth.seminarRoomsDiff.toLocaleString()}실)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] pt-1 border-t border-teal-100 flex items-center justify-between">
                      <span>전년 동기 비교:</span>
                      <span className="text-slate-400">전년 동기 데이터 없음</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details (Revenue & ADR with YoY) */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-financial">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">주중 세미나 숙박 매출</span>
                    <span className="font-extrabold text-slate-900">
                      {formatRevenue(seminarDayTypeStats.weekday.seminarRevenue)}원 ({seminarDayTypeStats.weekday.revenueSharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 주중 숙박 매출 (증감률)</span>
                    {seminarDayTypeStats.weekday.ly ? (
                      <span className="font-bold text-slate-700">
                        {formatRevenue(seminarDayTypeStats.weekday.ly.seminarRevenue)}원{' '}
                        {seminarDayTypeStats.weekday.growth?.revenueGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.weekday.growth.revenueGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekday.growth.revenueGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.weekday.growth.revenueGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">주중 평균 ADR</span>
                    <span className="font-extrabold text-slate-900">
                      {seminarDayTypeStats.weekday.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.weekday.averageAdr)}원` : '-'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 ADR (증감률)</span>
                    {seminarDayTypeStats.weekday.ly ? (
                      <span className="font-bold text-slate-700">
                        {seminarDayTypeStats.weekday.ly.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.weekday.ly.averageAdr)}원 ` : '- '}
                        {seminarDayTypeStats.weekday.growth?.adrGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.weekday.growth.adrGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekday.growth.adrGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.weekday.growth.adrGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 주말 (금·토 체크인) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-500" />
                    <span>주말 (금·토 체크인)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      개별/관광 배정
                    </span>
                    {seminarDayTypeStats.weekend.growth?.sharePctDiff !== undefined ? (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 border ${
                        seminarDayTypeStats.weekend.growth.sharePctDiff >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {seminarDayTypeStats.weekend.growth.sharePctDiff >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {seminarDayTypeStats.weekend.growth.sharePctDiff > 0 ? '+' : ''}{seminarDayTypeStats.weekend.growth.sharePctDiff.toFixed(1)}%p YoY
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="전년 동기 비교 데이터 확인 중">
                        YoY 미집계
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl lg:text-4xl font-black font-financial tracking-tight text-slate-900 tabular-nums">
                      {seminarDayTypeStats.weekend.sharePct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-amber-600 font-semibold">당해 점유</span>
                  </div>
                  {seminarDayTypeStats.weekend.ly && (
                    <div className="text-right text-xs text-slate-500">
                      <span className="text-[10px] block text-slate-400">작년 동기</span>
                      <strong className="text-slate-700 font-extrabold font-financial tabular-nums">
                        {seminarDayTypeStats.weekend.ly.sharePct.toFixed(1)}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Progress Gauge Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, seminarDayTypeStats.weekend.sharePct)}%` }}
                  />
                </div>

                {/* Rooms Comparison Block */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-700 font-medium flex items-center justify-between">
                    <span>당해 실적:</span>
                    <span>
                      주말 <strong className="text-slate-900 font-bold">{seminarDayTypeStats.weekend.totalRooms.toLocaleString()}실</strong> 중{' '}
                      <strong className="text-amber-700 font-bold">{seminarDayTypeStats.weekend.seminarRooms.toLocaleString()}실</strong> 배정
                    </span>
                  </div>
                  {seminarDayTypeStats.weekend.ly ? (
                    <div className="text-slate-500 text-[11px] flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>작년 동기 실적:</span>
                      <span>
                        세미나 <strong className="text-slate-800">{seminarDayTypeStats.weekend.ly.seminarRooms.toLocaleString()}실</strong>{' '}
                        {seminarDayTypeStats.weekend.growth?.seminarRoomsDiff !== undefined && (
                          <span className={`font-bold ml-1 ${
                            seminarDayTypeStats.weekend.growth.seminarRoomsDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekend.growth.seminarRoomsDiff > 0 ? '+' : ''}{seminarDayTypeStats.weekend.growth.seminarRoomsDiff.toLocaleString()}실)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-200 flex items-center justify-between">
                      <span>전년 동기 비교:</span>
                      <span className="text-slate-400">전년 동기 데이터 없음</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details (Revenue & ADR with YoY) */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-financial">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">주말 세미나 숙박 매출</span>
                    <span className="font-extrabold text-slate-900">
                      {formatRevenue(seminarDayTypeStats.weekend.seminarRevenue)}원 ({seminarDayTypeStats.weekend.revenueSharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 주말 숙박 매출 (증감률)</span>
                    {seminarDayTypeStats.weekend.ly ? (
                      <span className="font-bold text-slate-700">
                        {formatRevenue(seminarDayTypeStats.weekend.ly.seminarRevenue)}원{' '}
                        {seminarDayTypeStats.weekend.growth?.revenueGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.weekend.growth.revenueGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekend.growth.revenueGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.weekend.growth.revenueGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">주말 평균 ADR</span>
                    <span className="font-extrabold text-slate-900">
                      {seminarDayTypeStats.weekend.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.weekend.averageAdr)}원` : '-'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">전년 ADR (증감률)</span>
                    {seminarDayTypeStats.weekend.ly ? (
                      <span className="font-bold text-slate-700">
                        {seminarDayTypeStats.weekend.ly.averageAdr > 0 ? `${formatRevenue(seminarDayTypeStats.weekend.ly.averageAdr)}원 ` : '- '}
                        {seminarDayTypeStats.weekend.growth?.adrGrowthRate !== undefined && (
                          <span className={`text-[11px] font-extrabold ${
                            seminarDayTypeStats.weekend.growth.adrGrowthRate >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ({seminarDayTypeStats.weekend.growth.adrGrowthRate > 0 ? '+' : ''}{seminarDayTypeStats.weekend.growth.adrGrowthRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 하단 공식 기준 배너 */}
          <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl mt-4 border border-teal-100 font-medium flex items-center justify-between flex-wrap gap-2">
            <span><strong>공식 산출 기준:</strong> 세일즈본부 B2B 세미나 및 단체 점유율은 공식 예약 채널 원장과 호텔 정산 기준에 따라 산출됩니다.</span>
            <span className="text-[11px] text-teal-600 font-mono font-normal">SALES SSOT</span>
          </div>
        </div>
      </div>

      {/* 2. 🎯 [CORE CONTROL] 판매방식 드롭다운 선택기 & 뷰 모드 툴바 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Channel Selector Dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
            <Building2 size={18} className="text-brand-mint" />
            <span>판매방식 선택:</span>
          </span>

          <div className="relative inline-flex items-center">
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                if (e.target.value === 'ALL') {
                  setViewMode('PIVOT_MATRIX');
                } else {
                  setViewMode('FOCUS_SINGLE');
                }
              }}
              className="bg-slate-50 hover:bg-slate-100 border-2 border-brand-mint text-slate-900 text-sm font-extrabold rounded-xl px-4 py-2 pr-10 outline-none shadow-2xs focus:ring-2 focus:ring-brand-mint/40 cursor-pointer appearance-none transition-colors"
            >
              {availableChannels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === '단체영업' || ch === '세미나' || ch === '단체영업(세미나)' ? `👥 ${ch} ★ 주력 사업` : `🏢 ${ch}`}
                </option>
              ))}
              <option value="ALL">📊 [전체 통합] 모든 판매방식 비교하기</option>
            </select>
            <ChevronDown size={16} className="text-slate-500 absolute right-3 pointer-events-none" />
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={hideZeroSales}
              onChange={(e) => setHideZeroSales(e.target.checked)}
              className="rounded border-slate-300 text-brand-mint focus:ring-brand-mint accent-brand-mint"
            />
            <span>0실 항목 제외</span>
          </label>

          {selectedChannel === '단체영업' || selectedChannel === '세미나' || selectedChannel === '단체영업(세미나)' ? (
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20 flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={12} className="text-[#284F42]" /> 세일즈본부 핵심 주력 사업
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedChannel('단체영업(세미나)');
                setViewMode('FOCUS_SINGLE');
              }}
              className="text-xs font-bold text-brand-mint hover:underline cursor-pointer flex items-center gap-1"
            >
              ↩ 주력(단체영업)으로 복귀
            </button>
          )}
        </div>

        {/* Right: View Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('FOCUS_SINGLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'FOCUS_SINGLE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table size={14} className="text-brand-mint" />
            <span>선택 채널 평형별 상세</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('PIVOT_MATRIX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'PIVOT_MATRIX'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid size={14} className="text-[#284F42]" />
            <span>크로스 피벗 매트릭스</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ALL_CHANNELS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'ALL_CHANNELS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} className="text-slate-600" />
            <span>전체 채널 목록</span>
          </button>
        </div>
      </div>

      {/* 3. Executive Summary Cards (4-Grid: 선택 채널 중심 동적 지표) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 총 객실 매출액' : (isCurrentSeminar ? '세미나 숙박 매출액' : '선택 채널 매출액')}</span>
              <MetricExplainerTooltip presetKey="netRevenue" />
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
              isAllMode ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#284F42]/10 text-[#284F42] border-[#284F42]/20'
            }`}>
              {isAllMode ? '전사 합산' : (activeChannelGroup?.channelName || '선택 실적')}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
                {formatRevenue(displayRevenue)}
              </span>
              <span className="text-sm font-semibold text-slate-400">원</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md">
                {displayRevenueFinancial.formatted}
              </span>
              {!isAllMode && activeChannelGroup && activeChannelGroup.revenueSharePct != null && (
                <span className="text-slate-400 font-medium">
                  (전사 {grandRevenueFinancial.formatted} 중 <strong className="text-slate-700 font-bold">{activeChannelGroup.revenueSharePct.toFixed(1)}%</strong> 점유)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Rooms Sold */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BedDouble size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 판매 객실' : '선택 채널 판매 객실'}</span>
              <MetricExplainerTooltip presetKey="occupancy" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              계약 실적
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayRooms.toLocaleString()}
              <span className="text-base font-semibold text-slate-400 ml-1">실</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isAllMode 
                ? '전체 판매 객실 합계' 
                : `전체 ${grandTotals.rooms.toLocaleString()}실 중 ${displayRooms.toLocaleString()}실`}
            </p>
          </div>
        </div>

        {/* Card 3: Event Attendees (B2B 유치 행사 인원) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <Users size={16} className="text-brand-mint" /> 
              <span>{eventPaxMeta.title}</span>
              <MetricExplainerTooltip presetKey="visitorCount" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {eventPaxMeta.badge}
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {eventPaxMeta.pax !== null ? (
                <>
                  {eventPaxMeta.pax.toLocaleString()}
                  <span className="text-base font-semibold text-slate-400 ml-1">명</span>
                </>
              ) : (
                <span className="text-slate-400 font-medium text-2xl">-</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {eventPaxMeta.subtext}
            </p>
          </div>
        </div>

        {/* Card 4: ADR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp size={16} className="text-brand-mint" /> 
              <span>{isAllMode ? '전사 평균 ADR' : '선택 채널 평균 ADR'}</span>
              <MetricExplainerTooltip presetKey="adr" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              평균 객단가
            </span>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-financial tracking-tight">
              {displayAdr && displayAdr > 0 ? (
                <>{formatRevenue(displayAdr)}<span className="text-base font-semibold text-slate-400 ml-1">원</span></>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isCurrentSeminar && seminarDayTypeStats.total.averageAdr > 0 
                ? '백엔드 공인 세미나 통합 ADR (주중/주말 가중평균)' 
                : (isAllMode ? '전사 객실 총매출 ÷ 전체 판매 객실수' : '해당 채널 매출액 ÷ 판매 객실수')}
            </p>
          </div>
        </div>

      </div>

      {/* 4. MAIN CONTENT AREA */}

      {/* 🌟 1. 기본 메인 뷰: 선택된 판매방식(기본: 단체영업(세미나))의 각 평형별 실적 상세 */}
      {viewMode === 'FOCUS_SINGLE' && activeChannelGroup && (
        <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-6">
          
          {/* Main Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#284F42]/10 border border-[#284F42]/20 text-[#284F42]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeChannelGroup.channelName} 각 평형별 실적 상세
                  </h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activeChannelGroup.badgeColor}`}>
                    {activeChannelGroup.items.length}개 평형 판매
                  </span>
                  {(activeChannelGroup.channelName === '단체영업' || activeChannelGroup.channelName === '세미나' || activeChannelGroup.channelName === '단체영업(세미나)') && (
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand-mint text-white shadow-2xs">
                      세일즈본부 핵심 주력
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  선택하신 판매방식의 각 평형(세그먼트)별 판매 실적과 단가(ADR)입니다.
                </p>
              </div>
            </div>

            {/* Quick Channel Pill Switcher */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">다른 판매방식:</span>
              {channelGroups.slice(0, 4).map(g => (
                <button
                  key={g.channelName}
                  type="button"
                  onClick={() => setSelectedChannel(g.channelName)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    selectedChannel === g.channelName
                      ? 'bg-[#284F42] text-white border-[#1B382E] shadow-xs font-bold'
                      : 'bg-[#F4F3EE]/80 hover:bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]/70'
                  }`}
                >
                  {g.channelName.split('(')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Main Segment Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-financial">
              <thead>
                <tr className="border-b-2 border-slate-800 text-sm font-bold text-slate-900">
                  <th className="py-4 px-6 text-left whitespace-nowrap">평형 (세그먼트)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">판매 객실</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">매출액 (순매출)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">예상 투숙객</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">객단가 (ADR)</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">
                    {activeChannelGroup.channelName.split('(')[0]} 내 비중
                  </th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">전사 매출 기여도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeChannelGroup.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 text-base">{item.roomType}</span>
                        {item.roomType.includes('미지정') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            PMS 호실 배정대기
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {item.roomsSold.toLocaleString()}실
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatRevenue(item.revenue)}원
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap">
                      {item.guests > 0 ? `${item.guests.toLocaleString()}명` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {item.adr > 0 ? `${formatRevenue(item.adr)}원` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {item.channelSharePct != null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className="bg-brand-mint h-full rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(0, item.channelSharePct))}%` }} 
                            />
                          </div>
                          <span>{item.channelSharePct.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-500 whitespace-nowrap">
                      {item.grandSharePct != null ? `${item.grandSharePct.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}

                {/* Subtotal Row */}
                <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td className="py-4 px-6 text-sm">
                    <span className="text-brand-mint font-black">[{activeChannelGroup.channelName} 총합계]</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black">
                    {activeChannelGroup.totalRooms.toLocaleString()}실
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black text-slate-900">
                    {formatRevenue(activeChannelGroup.totalRevenue)}원
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-bold">
                    {activeChannelGroup.totalGuests > 0 ? `${activeChannelGroup.totalGuests.toLocaleString()}명` : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-right text-brand-mint font-extrabold">
                    {activeChannelGroup.averageAdr > 0 ? `${formatRevenue(activeChannelGroup.averageAdr)}원` : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-black">
                    100.0%
                  </td>
                  <td className="py-4 px-6 text-sm text-right text-emerald-700 font-extrabold">
                    {activeChannelGroup.revenueSharePct != null ? `${activeChannelGroup.revenueSharePct.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {activeChannelGroup.items.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              해당 기간의 {activeChannelGroup.channelName} 실적 데이터가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 🌟 2. 크로스 피벗 매트릭스 뷰 (행=판매방식, 열=평형) */}
      {viewMode === 'PIVOT_MATRIX' && (
        <div className="bg-white rounded-[32px] p-7 border border-slate-200/90 shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Grid size={18} className="text-[#284F42]" />
                판매방식 × 평형별 교차 실적 매트릭스 (Pivot)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 판매방식(행)과 평형(열)의 교차 매출액 및 [판매실수 / ADR]을 한눈에 조망합니다.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
              상단: 매출액 (원) / 하단: 판매실수 (ADR)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-financial text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold">
                  <th className="py-3.5 px-4 text-left sticky left-0 bg-slate-100 z-10 whitespace-nowrap min-w-[160px]">
                    판매방식 (채널)
                  </th>
                  {uniqueRoomTypes.map(rt => (
                    <th key={rt} className="py-3.5 px-3 text-right whitespace-nowrap min-w-[120px]">
                      {rt}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right bg-slate-200 text-slate-900 font-black whitespace-nowrap min-w-[140px]">
                    채널 총합계
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {channelGroups.map(group => {
                  const itemByRoom = new Map(group.items.map(i => [i.roomType, i]));
                  const isCurrentTarget = group.channelName === '단체영업' || group.channelName === '세미나' || group.channelName === '단체영업(세미나)';

                  return (
                    <tr 
                      key={group.channelName} 
                      className={`transition-colors cursor-pointer ${
                        isCurrentTarget ? 'bg-[#284F42]/5 hover:bg-[#284F42]/10' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setSelectedChannel(group.channelName);
                        setViewMode('FOCUS_SINGLE');
                      }}
                      title="클릭하여 이 판매방식의 평형별 상세 보기"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white z-10 whitespace-nowrap border-r border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isCurrentTarget ? 'bg-[#284F42] ring-2 ring-[#284F42]/30' : 'bg-brand-mint'}`} />
                          <span>{group.channelName}</span>
                          {isCurrentTarget && (
                            <span className="text-[10px] font-bold text-[#284F42] bg-[#284F42]/15 px-1 rounded">주력</span>
                          )}
                        </div>
                      </td>

                      {uniqueRoomTypes.map(rt => {
                        const cell = itemByRoom.get(rt);
                        if (!cell || (cell.roomsSold === 0 && cell.revenue === 0)) {
                          return (
                            <td key={rt} className="py-3 px-3 text-right text-slate-300 font-normal">
                              -
                            </td>
                          );
                        }
                        return (
                          <td key={rt} className="py-3 px-3 text-right">
                            <div className="font-extrabold text-slate-900">
                              {formatRevenue(cell.revenue)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {cell.roomsSold}실 · {cell.adr > 0 ? `${formatRevenue(cell.adr)}원` : '-'}
                            </div>
                          </td>
                        );
                      })}

                      {/* Channel Row Grand Total */}
                      <td className="py-3 px-4 text-right bg-slate-50/80 font-black text-slate-900 border-l border-slate-200">
                        <div className="font-black text-slate-900 text-sm">
                          {formatRevenue(group.totalRevenue)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {group.totalRooms}실 · ADR {formatRevenue(group.averageAdr)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Column Totals Row */}
                <tr className="bg-slate-200/80 border-t-2 border-slate-400 font-black text-slate-900">
                  <td className="py-3.5 px-4 sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                    전사 평형별 합계
                  </td>
                  {uniqueRoomTypes.map(rt => {
                    const rtTotalItem = channelRawData.find(
                      r => (r.channelName === '총합계' || r.channel_name === '총합계' || (r as any).isRoomTypeSubtotal) &&
                           (r.roomType === rt || r.room_type === rt)
                    );
                    const colRooms = rtTotalItem ? Number(rtTotalItem.todayRooms ?? rtTotalItem.mtdRooms ?? 0) : null;
                    const colRev = rtTotalItem ? Number(rtTotalItem.todayRevenue ?? rtTotalItem.mtdRevenue ?? 0) : null;
                    return (
                      <td key={rt} className="py-3.5 px-3 text-right">
                        <div className="font-black text-slate-900">
                          {colRev != null ? formatRevenue(colRev) : '-'}
                        </div>
                        <div className="text-[10px] text-slate-600 font-bold">
                          {colRooms != null ? `${colRooms}실` : '-'}
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-3.5 px-4 text-right bg-slate-300 font-black text-slate-950">
                    <div className="text-sm font-black">
                      {formatRevenue(grandTotals.revenue)}원
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold">
                      {grandTotals.rooms}실 · ADR {formatRevenue(grandTotals.adr)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🌟 3. 전체 판매방식 아코디언 목록 뷰 */}
      {viewMode === 'ALL_CHANNELS' && (
        <div className="space-y-4">
          {channelGroups.map((group) => {
            const channelFinancial = formatFinancialKorean(group.totalRevenue);
            const isTarget = group.channelName === '단체영업' || group.channelName === '세미나' || group.channelName === '단체영업(세미나)';

            return (
              <div 
                key={group.channelName}
                className={`bg-white rounded-[24px] border shadow-xs overflow-hidden transition-all duration-200 ${
                  isTarget ? 'border-[#284F42]/40 ring-2 ring-[#284F42]/10' : 'border-slate-200/90'
                }`}
              >
                <div className="p-5 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      {group.iconType === 'group' && <Users className="w-5 h-5 text-[#284F42]" />}
                      {group.iconType === 'corporate' && <Building2 className="w-5 h-5 text-blue-600" />}
                      {group.iconType === 'direct' && <Globe className="w-5 h-5 text-emerald-600" />}
                      {group.iconType === 'ota' && <Plane className="w-5 h-5 text-sky-600" />}
                      {group.iconType === 'phone' && <PhoneCall className="w-5 h-5 text-amber-600" />}
                      {group.iconType === 'etc' && <Coins className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{group.channelName}</h4>
                        {isTarget && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#284F42] text-white">주력</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                          {group.items.length}개 평형
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        전사 기여도: <strong className="text-slate-700 font-semibold">{group.revenueSharePct != null ? `${group.revenueSharePct.toFixed(1)}%` : '-'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 font-financial text-right">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">판매 객실</div>
                      <div className="text-sm font-extrabold text-slate-800">{group.totalRooms.toLocaleString()}실</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">채널 총매출</div>
                      <div className="text-base font-extrabold text-slate-900">{formatRevenue(group.totalRevenue)}원</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{channelFinancial.formatted}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">평균 ADR</div>
                      <div className="text-sm font-bold text-slate-700">{group.averageAdr > 0 ? `${formatRevenue(group.averageAdr)}원` : '-'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannel(group.channelName);
                        setViewMode('FOCUS_SINGLE');
                      }}
                      className="px-3 py-1.5 bg-[#284F42] hover:bg-[#1E3E34] text-white text-xs font-bold rounded-lg transition-all border border-[#1B382E] shadow-xs cursor-pointer"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-financial">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-bold">
                        <th className="py-2.5 px-4 text-left">평형</th>
                        <th className="py-2.5 px-4 text-right">판매 객실</th>
                        <th className="py-2.5 px-4 text-right">매출액</th>
                        <th className="py-2.5 px-4 text-right">ADR</th>
                        <th className="py-2.5 px-4 text-right">채널 내 비중</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-4 font-bold text-slate-800">
                            <span className="inline-flex items-center gap-1.5">
                              {item.roomType}
                              {item.roomType.includes('미지정') && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  호실 배정대기
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right">{item.roomsSold}실</td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900">{formatRevenue(item.revenue)}원</td>
                          <td className="py-2 px-4 text-right">{item.adr > 0 ? `${formatRevenue(item.adr)}원` : '-'}</td>
                          <td className="py-2 px-4 text-right font-bold text-brand-mint">{item.channelSharePct != null ? `${item.channelSharePct.toFixed(1)}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* 4. 🏛️ [NEW] 세일즈본부 연회/세미나실 장소별(Venue) 판매 현황 & 평균 가격 분석 */}
      {pageSection === 'VENUE_PERFORMANCE' && (
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-slate-200/90 shadow-xs space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#284F42]/10 text-[#284F42] rounded-2xl border border-[#284F42]/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-[#1B382E] tracking-tight">
                  연회/세미나실 장소별(Venue) 판매 현황 & 평균 가격 분석
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                  세미나A · 세미나B · 벨포레홀 · 그랜드볼룸
                </span>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                세미나 및 대관 장소별 판매 실적, 건당 평균 가격(대관료 단가), 연도별/월별 판매 건수 추이 및 이용 단체 명부를 분석합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-[#5A6B63] bg-[#F4F3EE] px-3 py-1.5 rounded-xl border border-[#D0C6BB]/70">
              연회 대관 원장 연동
            </span>
          </div>
        </div>

        {/* 🚨 FAIL-STOP & BACKEND AWAITING BANNER or DATA DISPLAY */}
        {venueLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#284F42] animate-spin" />
            <p className="text-sm font-bold text-slate-600">장소별 대관 판매 실적 데이터를 불러오는 중입니다...</p>
          </div>
        ) : !venuePerformanceData || !venuePerformanceData.venues || venuePerformanceData.venues.length === 0 ? (
          /* Fail-Stop Banner: No Mocking Principle */
          <div className="space-y-6">
            <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-2xl p-6 text-amber-900 shadow-xs flex flex-col md:flex-row items-start gap-4">
              <div className="p-2.5 bg-amber-200/60 rounded-xl text-amber-800 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-base text-amber-950">
                    [Fail-Stop] 연회/세미나실 장소별 대관 판매 현황 조회 구간 데이터 없음
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                    Fail-Stop 모드 가동 중
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>'절대 가짜 숫자 날조 금지(Zero Fake Numbers)'</strong> 헌법에 따라, 백엔드 <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">GET /api/v6/report/sales-venue-performance</code> 응답이 없거나 해당 조회 구간 데이터가 비어 있을 때 임의의 더미/Mock 데이터를 화면에 표시하지 않습니다.
                </p>
                <div className="pt-2 text-xs font-semibold text-amber-700 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-amber-600" />
                  <span>연동 스펙: 장소별(세미나A, 세미나B, 벨포레홀 등) 판매건수, 총매출, 건당 평균가격, 연도별×월별 추이, 이용 단체명 명부</span>
                </div>
              </div>
            </div>

            {/* Skeleton Placeholders for Venue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-40 select-none pointer-events-none">
              {['세미나A', '세미나B', '벨포레홀', '그랜드볼룸'].map((vName, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>{vName}</span>
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">대관 분석</span>
                  </div>
                  <div className="text-2xl font-black text-slate-300 font-financial">- 건</div>
                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                    <span>평균 대관 가격</span>
                    <span className="font-bold">- 원</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Live Data Render: 100% Pure Consumer from Backend Mart */
          <div className="space-y-6">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-500 block">총 대관/이용 건수</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-financial">
                    {venuePerformanceData.summary.totalEventsCount?.toLocaleString() || 0}건
                  </span>
                  {venuePerformanceData.summary.eventsGrowthRate !== undefined && (
                    <span className={`text-xs font-bold ${
                      venuePerformanceData.summary.eventsGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {venuePerformanceData.summary.eventsGrowthRate > 0 ? '+' : ''}{venuePerformanceData.summary.eventsGrowthRate.toFixed(1)}% YoY
                    </span>
                  )}
                </div>
                {venuePerformanceData.summary.lyTotalEventsCount !== undefined && (
                  <span className="text-[11px] text-slate-400 block mt-1">
                    작년 동기: {venuePerformanceData.summary.lyTotalEventsCount.toLocaleString()}건
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-500 block">대관 총매출 (순매출)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-[#284F42] font-financial">
                    {formatRevenue(venuePerformanceData.summary.totalRentalRevenue)}원
                  </span>
                  {venuePerformanceData.summary.revenueGrowthRate !== undefined && (
                    <span className={`text-xs font-bold ${
                      venuePerformanceData.summary.revenueGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {venuePerformanceData.summary.revenueGrowthRate > 0 ? '+' : ''}{venuePerformanceData.summary.revenueGrowthRate.toFixed(1)}%
                    </span>
                  )}
                </div>
                {venuePerformanceData.summary.lyTotalRentalRevenue !== undefined && (
                  <span className="text-[11px] text-slate-400 block mt-1">
                    작년 동기: {formatRevenue(venuePerformanceData.summary.lyTotalRentalRevenue)}원
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-500 block">건당 평균 대관 가격</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-financial">
                    {formatRevenue(venuePerformanceData.summary.averageRentalPrice)}원
                  </span>
                  <span className="text-xs text-[#B59269] font-semibold">/ 건</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  전체 대관료 합산의 산술평균
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-500 block">최다 대관 장소</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-brand-mint font-financial">
                    {venuePerformanceData.summary.mostBookedVenue || '-'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  운영 장소 총 {venuePerformanceData.summary.totalVenuesCount || venuePerformanceData.venues.length}개소
                </span>
              </div>
            </div>

            {/* Part 1: 장소별 판매현황 & 평균가격 카드 그리드 */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <MapPin size={16} className="text-[#284F42]" />
                <span>장소별 판매 실적 & 평균 대관 가격 현황</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {venuePerformanceData.venues.map((v) => (
                  <div key={v.venueId || v.venueName} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#284F42]/40 shadow-2xs transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                        <Building2 size={16} className="text-[#284F42]" />
                        <span>{v.venueName}</span>
                      </span>
                      {v.capacity && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          수용 {v.capacity}석
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-900 font-financial">
                            {v.bookedCount.toLocaleString()}건
                          </span>
                          {v.sharePct !== undefined && (
                            <span className="text-xs font-bold text-[#284F42]">
                              ({v.sharePct.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                        {v.growthRate !== undefined && (
                          <span className={`text-[11px] font-bold ${
                            v.growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {v.growthRate > 0 ? '+' : ''}{v.growthRate.toFixed(1)}% YoY
                          </span>
                        )}
                      </div>
                      {v.lyBookedCount !== undefined && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          작년 동기: {v.lyBookedCount.toLocaleString()}건
                        </span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs font-financial">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">건당 평균 가격</span>
                        <strong className="text-[#284F42] font-extrabold text-sm">
                          {formatRevenue(v.averagePrice)}원
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">대관 총매출</span>
                        <span className="text-slate-800 font-bold">
                          {formatRevenue(v.totalRevenue)}원
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2: 연도별 × 월별 장소별 판매 건수 추이 피벗 매트릭스 */}
            {venuePerformanceData.monthlyTrends && venuePerformanceData.monthlyTrends.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-[#284F42]" />
                    <span>연도별 · 월별 장소 판매 건수 추이 매트릭스</span>
                  </h4>
                  <span className="text-xs text-slate-400">월별 각 장소의 판매 건수를 교차 비교합니다.</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-3 px-4 text-left whitespace-nowrap">조회 월 (Year-Month)</th>
                        {uniqueVenueNames.map(vName => (
                          <th key={vName} className="py-3 px-4 text-center whitespace-nowrap">{vName}</th>
                        ))}
                        <th className="py-3 px-4 text-center bg-[#284F42]/10 text-[#1B382E] font-extrabold whitespace-nowrap">
                          월간 총 대관 건수
                        </th>
                        <th className="py-3 px-4 text-right bg-[#284F42]/10 text-[#1B382E] font-extrabold whitespace-nowrap">
                          월간 대관 총매출
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-financial">
                      {venuePerformanceData.monthlyTrends.map((trend) => {
                        const venueCounts = trend.venues || trend.venueBreakdown || {};
                        const totalB = trend.totalBookings ?? trend.totalCount ?? 0;
                        return (
                          <tr key={trend.yearMonth} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                              {trend.yearMonth}
                            </td>
                            {uniqueVenueNames.map(vName => {
                              const cnt = venueCounts[vName];
                              return (
                                <td key={vName} className="py-3 px-4 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    cnt && cnt > 0 ? 'bg-[#284F42]/10 text-[#284F42]' : 'text-slate-400'
                                  }`}>
                                    {cnt !== undefined ? `${cnt}건` : '-'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-center font-black text-[#1B382E] bg-[#284F42]/5 whitespace-nowrap">
                              {totalB.toLocaleString()}건
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-800 bg-[#284F42]/5 whitespace-nowrap">
                              {trend.totalRevenue !== undefined ? `${formatRevenue(trend.totalRevenue)}원` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Part 3: 장소별 이용 단체(기업명/기관명) 상세 명부 */}
            {venuePerformanceData.groupBookings && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Users size={16} className="text-[#284F42]" />
                      <span>장소별 이용 단체(기업명/기관명) 상세 명부</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      세미나실 및 연회장을 이용한 실제 기업/기관명과 행사 내역을 확인합니다.
                    </p>
                  </div>

                  {/* Filters: Venue Filter & Search */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedVenueFilter}
                      onChange={(e) => setSelectedVenueFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-[#284F42] cursor-pointer"
                    >
                      <option value="ALL">🏛️ 전체 장소 보기</option>
                      {uniqueVenueNames.map(vName => (
                        <option key={vName} value={vName}>📍 {vName}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <Search size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={venueSearchKeyword}
                        onChange={(e) => setVenueSearchKeyword(e.target.value)}
                        placeholder="기업명 / 행사명 / 담당자 검색..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#284F42] w-52"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-3 px-4 text-left whitespace-nowrap">행사 일자</th>
                        <th className="py-3 px-4 text-left whitespace-nowrap">이용 장소</th>
                        <th className="py-3 px-4 text-left whitespace-nowrap">이용 단체명 (행사명)</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">참석 인원</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">대관료 (원)</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">예약 번호</th>
                        <th className="py-3 px-4 text-left whitespace-nowrap">영업 담당자</th>
                        <th className="py-3 px-4 text-left whitespace-nowrap">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-financial">
                      {filteredVenueBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                            해당 조건에 일치하는 장소 이용 단체 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredVenueBookings.map((b, idx) => (
                          <tr key={b.reservationNo || b.eventId || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                              {b.eventDate || b.bookingDate}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-bold text-[#284F42] bg-[#284F42]/10 px-2 py-0.5 rounded text-[11px]">
                                {b.venueName}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900">
                                {b.clientName || b.corporateName || '-'}
                              </div>
                              {b.eventName && (
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {b.eventName}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {b.paxCount ? `${b.paxCount.toLocaleString()}명` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                              {b.rentalPrice !== undefined ? `${formatRevenue(b.rentalPrice)}원` : '-'}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="text-[10px] font-financial font-medium text-[#B59269] bg-[#B59269]/10 px-2 py-0.5 rounded border border-[#B59269]/20">
                                {b.reservationNo || b.eventId || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {b.salesManager || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs" title={b.remarks || undefined}>
                              {b.remarks || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      )}

      {/* 5. 👥 단체영업(세미나) 실제 예약 단체 마스터 명부 & 복수 방문(단골) 심층 분석 (아코디언 접기/펼치기) */}
      {pageSection === 'GROUP_MASTER_CRM' && (
      <>
      <div className="bg-white rounded-[32px] border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        
        {/* Section Header (Clickable Accordion Bar) */}
        <div 
          onClick={() => setIsGroupMasterListOpen(prev => !prev)}
          className="p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#284F42]/10 text-[#284F42] rounded-2xl border border-[#284F42]/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-[#1B382E] tracking-tight">
                  단체영업(세미나) 예약 단체 마스터 명부
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#284F42] text-white shadow-xs">
                  총 {totalSeminarGroupsCount}개 기관 / 단체
                </span>
                {repeatGroupsCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <RotateCcw size={12} className="text-emerald-600" />
                    복수 재방문 {repeatGroupsCount}개사
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {isGroupMasterListOpen ? '클릭 시 접기' : '클릭 시 상세 명부 펼치기'}
                </span>
              </div>
              <p className="text-xs text-[#5A6B63] mt-1">
                세미나/교육/워크샵으로 예약된 단체별 대여 객실 수, 이용 평형, 복수 방문 횟수 및 방문 일정을 통합 조회합니다.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge & Accordion Toggle */}
          <div className="flex items-center gap-3 self-start lg:self-auto font-financial flex-wrap">
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
              <div className="px-3 py-1">
                <div className="text-[11px] text-slate-400 font-medium">유치 단체수</div>
                <div className="text-base font-extrabold text-slate-900">{totalSeminarGroupsCount}개 기관</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="px-3 py-1">
                <div className="text-[11px] text-slate-400 font-medium">총 계약 객실</div>
                <div className="text-base font-extrabold text-[#284F42]">{totalBookedRoomsInGroups.toLocaleString()}실</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="px-3 py-1">
                <div className="text-[11px] text-slate-400 font-medium">복수 방문 기관</div>
                <div className="text-base font-extrabold text-emerald-600">{repeatGroupsCount}개사</div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsGroupMasterListOpen(prev => !prev);
              }}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <span>{isGroupMasterListOpen ? '명부 접기' : '명부 펼치기'}</span>
              {isGroupMasterListOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Accordion Expandable Content */}
        {isGroupMasterListOpen && (
          <div className="border-t border-slate-100">
            {/* Filter Tabs & Search Bar */}
            <div className="p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setGroupFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    groupFilterTab === 'ALL'
                      ? 'bg-[#284F42] text-white shadow-xs'
                      : 'bg-white text-[#5A6B63] border border-[#D0C6BB]/70 hover:bg-[#F4F3EE]'
                  }`}
                >
                  전체 단체 ({totalSeminarGroupsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFilterTab('REPEAT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    groupFilterTab === 'REPEAT'
                      ? 'bg-[#1E523F] text-white shadow-xs'
                      : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <RotateCcw size={12} />
                  ★ 복수 방문 단체 ({repeatGroupsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFilterTab('LARGE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    groupFilterTab === 'LARGE'
                      ? 'bg-[#B59269] text-white shadow-xs'
                      : 'bg-white text-[#B59269] border border-[#B59269]/40 hover:bg-[#B59269]/10'
                  }`}
                >
                  대규모 (20실 이상)
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFilterTab('SINGLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    groupFilterTab === 'SINGLE'
                      ? 'bg-[#1B382E] text-white shadow-xs'
                      : 'bg-white text-[#5A6B63] border border-[#D0C6BB]/70 hover:bg-[#F4F3EE]'
                  }`}
                >
                  단일 방문
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={groupSearchKeyword}
                  onChange={(e) => setGroupSearchKeyword(e.target.value)}
                  placeholder="단체명, 담당자, 객실평형 검색..."
                  className="w-full bg-white border border-[#D0C6BB]/70 rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#1B382E] outline-none focus:border-[#284F42]"
                />
              </div>
            </div>

            {/* Master Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-financial">
                <thead>
                  <tr className="border-b-2 border-[#1B382E] text-xs font-bold text-[#1B382E] bg-[#F4F3EE]/60">
                    <th className="py-3.5 px-6 text-left whitespace-nowrap">단체 / 기업명</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">방문 횟수</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">총 대여 객실수</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">행사 인원수</th>
                    <th className="py-3.5 px-4 text-left whitespace-nowrap">이용 평형 (객실 타입)</th>
                    <th className="py-3.5 px-4 text-left whitespace-nowrap">방문 기간 (체크인)</th>
                    <th className="py-3.5 px-4 text-left whitespace-nowrap">담당자 / 연락처</th>
                    <th className="py-3.5 px-6 text-center whitespace-nowrap">차수별 상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredOrganizedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        조회된 단체영업 예약 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredOrganizedGroups.map((org) => {
                      const isExpanded = expandedGroupNames.has(org.name);

                      return (
                        <React.Fragment key={org.name}>
                          <tr className={`hover:bg-slate-50/90 transition-colors ${org.isRepeatCustomer ? 'bg-[#284F42]/5' : ''}`}>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm">{org.name}</span>
                                {org.isRepeatCustomer && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                    <RotateCcw size={10} />
                                    ★ 복수 방문 {org.visitCount != null ? `(${org.visitCount}회차)` : ''}
                                  </span>
                                )}
                                {(org.totalRooms ?? 0) >= 30 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B59269]/10 text-[#B59269] border border-[#B59269]/20">
                                    대규모
                                  </span>
                                )}
                              </div>
                              {org.corporateName && org.corporateName !== org.name && (
                                <p className="text-[11px] text-slate-400 mt-0.5">거래처: {org.corporateName}</p>
                              )}
                            </td>

                            <td className="py-4 px-4 text-center">
                              {org.visitCount != null ? (
                                <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg text-xs ${
                                  org.visitCount > 1 
                                    ? 'bg-emerald-500 text-white font-black' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {org.visitCount}회
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right">
                              {org.totalRooms != null ? (
                                <>
                                  <span className="text-base font-black text-slate-900 font-financial">
                                    {org.totalRooms.toLocaleString()}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-400 ml-1">실</span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right">
                              {org.totalPax != null ? (
                                <>
                                  <span className="font-bold text-slate-700 font-financial">
                                    {org.totalPax.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-1">명</span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                {org.roomTypesSummary.length > 0 ? (
                                  org.roomTypesSummary.map((t, idx) => (
                                    <span key={idx} className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 whitespace-nowrap">
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600">
                              {org.firstCheckIn === org.lastCheckIn ? (
                                <span>{org.firstCheckIn}</span>
                              ) : (
                                <span>{org.firstCheckIn} ~ {org.lastCheckIn}</span>
                              )}
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="text-xs font-bold text-slate-800">{org.primaryContact || '-'}</div>
                              {org.primaryPhone && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Phone size={10} /> {org.primaryPhone}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-6 text-center">
                              <button
                                type="button"
                                onClick={() => toggleGroupExpand(org.name)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <span>{org.visits.length}차수</span>
                                <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Drilldown Timeline */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                              <td colSpan={8} className="p-4 px-8">
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                                   <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                      <CalendarDays size={13} className="text-[#284F42]" />
                                      <span>{org.name} - 방문 차수별 상세 내역 (총 {org.visits.length}회차)</span>
                                    </h5>
                                    <span className="text-[11px] text-slate-400">담당: {org.salesManager || 'B2B영업팀'}</span>
                                  </div>

                                  <div className="divide-y divide-slate-100 text-xs">
                                    {org.visits.map((v, vIdx) => (
                                      <div key={vIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                          <span className="font-extrabold text-[#284F42] bg-[#284F42]/10 border border-[#284F42]/20 px-2 py-0.5 rounded text-[11px]">
                                            {vIdx + 1}차 방문
                                          </span>
                                          <span className="font-bold text-slate-800">
                                            체크인: {v.checkIn} ~ 체크아웃: {v.checkOut} ({v.stayDays}박)
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            v.isWeekend ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                          }`}>
                                            {v.isWeekend ? '주말(금·토)' : '주중(일~목)'}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-slate-600 font-financial flex-wrap">
                                          <div>
                                            <span className="text-slate-400 mr-1">대여 객실:</span>
                                            <strong className="text-slate-900 font-black">{v.roomsCount}실</strong>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 mr-1">인원:</span>
                                            <strong className="text-slate-900">{v.paxCount}명</strong>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 mr-1">평형:</span>
                                            <span className="text-slate-700 font-semibold">{v.roomTypesUsed.join(', ') || '-'}</span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 mr-1">결제:</span>
                                            <span className="text-slate-700">{v.paymentMethod}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Collapse Helper */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>총 {filteredOrganizedGroups.length}개 단체 목록 표출 중</span>
              <button
                type="button"
                onClick={() => setIsGroupMasterListOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>명부 접기</span>
                <ChevronUp size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5.5. [Ticket 31] 판촉 영업담당자별 B2B·연회 수주 순기여도(Net Contribution) 및 세미나홀 가동 효율 분석 */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#284F42]/5 via-white to-[#B59269]/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#284F42] text-white shadow-xs shrink-0 mt-0.5">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900">
                  판촉 영업담당자별 B2B 수주 순기여도(Net Contribution) 및 연회장 가동 효율
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20">
                  단체 판촉 실적 분석
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                객실·연회 원천 예약의 <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">영업직원명</code> 실명 귀속 실적(유치 건수, 평균 ADR, 연회 결합 매출, 사전 취소율)과 세미나홀·아트홀별 예상➔보장➔확정 인원 이행률 및 시간당 공간 수익성(RevPASH)을 추적합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {salesRepIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={14} />
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle size={14} />
                Fail-Stop · 조회 구간 데이터 없음 (/api/v6/report/sales-rep-banquet-intelligence)
              </span>
            )}
          </div>
        </div>

        {!salesRepIntel ? (
          <div className="p-8 bg-slate-50/60">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle size={20} />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">
                [Zero-Fake / Fail-Stop] 판촉 영업담당자 순기여도 및 세미나홀 RevPASH 데이터 미수신 또는 조회 구간 내역 없음
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">GET /api/v6/report/sales-rep-banquet-intelligence</code> 응답이 없거나 선택 구간 데이터가 비어 있을 경우 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">판촉 담당자 총 유치 객실</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">영업직원명 귀속 예약 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">판촉 담당자 귀속 연회 행사</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">연회 예약 담당자 매핑 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">보장 대비 확정 인원 이행률</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">예상➔보장➔확정 인원 검증 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">세미나홀 공간 수익(RevPASH)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">세미나 A~E홀·아트홀 집계 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 상단 요약 KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">판촉 담당자 귀속 객실 예약</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {salesRepIntel.summary?.totalRepRoomBookings != null
                    ? `${Number(salesRepIntel.summary.totalRepRoomBookings).toLocaleString()}건`
                    : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  활동 담당자: {salesRepIntel.summary?.activeSalesReps != null ? `${salesRepIntel.summary.activeSalesReps}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">판촉 담당자 귀속 연회 수주</div>
                <div className="text-xl font-black text-[#284F42] mt-1">
                  {salesRepIntel.summary?.totalRepBanquetEvents != null
                    ? `${Number(salesRepIntel.summary.totalRepBanquetEvents).toLocaleString()}건`
                    : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  수주 총액: {salesRepIntel.summary?.totalRepRevenue != null ? formatRevenue(salesRepIntel.summary.totalRepRevenue) : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">연회 보장인원 이행률 (보장/예상)</div>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {salesRepIntel.summary?.guaranteeFulfillmentRate != null
                    ? `${salesRepIntel.summary.guaranteeFulfillmentRate}%`
                    : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  예상 {salesRepIntel.summary?.totalExpectedGuests != null ? `${Number(salesRepIntel.summary.totalExpectedGuests).toLocaleString()}명` : '-'} / 보장 {salesRepIntel.summary?.totalGuaranteedGuests != null ? `${Number(salesRepIntel.summary.totalGuaranteedGuests).toLocaleString()}명` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">B2B 단체 사전 취소율</div>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {salesRepIntel.summary?.repCancelRate != null
                    ? `${salesRepIntel.summary.repCancelRate}%`
                    : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  취소 건수: {salesRepIntel.summary?.cancelledCount != null ? `${Number(salesRepIntel.summary.cancelledCount).toLocaleString()}건` : '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 좌측: 영업담당자 리더보드 */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">판촉 영업담당자별 B2B 수주 리더보드 (Net Contribution)</span>
                  <span className="text-[11px] text-slate-500">단위: 건 / 원</span>
                </div>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-bold">영업담당자</th>
                        <th className="py-2.5 px-3 text-right font-bold">객실 유치</th>
                        <th className="py-2.5 px-3 text-right font-bold">연회 수주</th>
                        <th className="py-2.5 px-3 text-right font-bold">평균 ADR</th>
                        <th className="py-2.5 px-3 text-right font-bold">총 결합매출</th>
                        <th className="py-2.5 px-3 text-right font-bold">취소율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(salesRepIntel.salesReps || []).map((rep: any, idx: number) => (
                        <tr key={rep.salesRepName || idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{rep.salesRepName ?? '-'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {rep.roomBookingCount != null ? `${Number(rep.roomBookingCount).toLocaleString()}건` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#284F42] font-semibold">
                            {rep.banquetEventCount != null ? `${Number(rep.banquetEventCount).toLocaleString()}건` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {rep.avgRoomAdr != null ? formatRevenue(rep.avgRoomAdr) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {rep.totalNetRevenue != null ? formatRevenue(rep.totalNetRevenue) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                            {rep.cancelRate != null ? `${rep.cancelRate}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 우측: 연회장(세미나홀/아트홀) 가동 효율 및 인원 이행률 */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">연회장(세미나홀·아트홀)별 가동 건수 및 인원 이행 분석</span>
                  <span className="text-[11px] text-slate-500">예상 ➔ 보장 ➔ 확정</span>
                </div>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-bold">연회장명</th>
                        <th className="py-2.5 px-3 text-right font-bold">대관 건수</th>
                        <th className="py-2.5 px-3 text-right font-bold">예상 인원</th>
                        <th className="py-2.5 px-3 text-right font-bold">보장 인원</th>
                        <th className="py-2.5 px-3 text-right font-bold">대관·식음 매출</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(salesRepIntel.banquetHalls || []).map((hall: any, idx: number) => (
                        <tr key={hall.hallName || idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{hall.hallName ?? '-'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {hall.eventCount != null ? `${Number(hall.eventCount).toLocaleString()}건` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {hall.expectedGuests != null ? `${Number(hall.expectedGuests).toLocaleString()}명` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                            {hall.guaranteedGuests != null ? `${Number(hall.guaranteedGuests).toLocaleString()}명` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {hall.hallRevenue != null ? formatRevenue(hall.hallRevenue) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* 6. 숙박·연회 단체 × 식음/부대 영업장 선호도 및 평균 매출·급증률 분석 리포트 */}
      {pageSection === 'GROUP_VENUE_PREFERENCE' && (
        <GroupVenuePreferenceSection initialVenueCategory="ALL" mode="ALL" isStandalonePage={false} />
      )}

      {/* 7. Strategy Insight Footer */}
      <div className="bg-white rounded-3xl p-6 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#284F42]/10 text-[#284F42] border border-[#284F42]/20 shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#1B382E]">세일즈본부 단체영업(세미나) 주력 전략 인사이트</h4>
            <p className="text-xs text-[#284F42]/70 mt-0.5">
              세미나/기업연수 등 대량 단체 고객을 위한 16평/35평 패키지 견적과 F&B 연계 시너지를 분석하여 객단가를 방어하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-[11px] font-bold bg-[#284F42]/10 text-[#284F42] px-3.5 py-1.5 rounded-xl border border-[#284F42]/20">
            세일즈본부 공식 집계
          </span>
        </div>
      </div>

      </div>
    </div>
  );
}
