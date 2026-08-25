// [벨포레 V6] 크로스 시너지 & 계량경제학 낙수효과 공식 타입 정의 (SSOT)

export interface DailyTrendItem {
  date: string;
  roomsSold: number;
  storeSales: number;
}

// 1. 기준 앵커 메타 정보
export interface AnchorMeta {
  code: string;               // 예: "GOLF"
  name: string;               // 예: "골프장"
  categoryName?: string;      // 예: "골프"
  periodTotalRevenue: number; // 분석 기간 총매출 (원 단위)
  dailyAvgRevenue: number;    // 일평균 매출 (원 단위)
}
export type AnchorInfo = AnchorMeta;

// 2. 외생 통제 요인 정보
export interface ExogenousControlMeta {
  controlledVariables: string[]; // 통제된 8종 외생 변수 목록
  observationDays: number;       // 관측 일수 (예: 236일)
  totalOffDays?: number;         // 주말 및 법정 공휴일 일수 (예: 77일)
}

// 3. GIRF 시계열 충격 반응 (T+0 ~ T+3)
export interface GIRFDivisionResponse {
  mean: number;       // 점추정치 반응액 (원 단위)
  bcaLowerCI: number; // 90% BCa 신뢰구간 하한 (5%)
  bcaUpperCI: number; // 90% BCa 신뢰구간 상한 (95%)
}

export interface GIRFHorizonRow {
  horizonDay: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  responses: {
    golf: GIRFDivisionResponse;
    room: GIRFDivisionResponse;
    fnb: GIRFDivisionResponse;
    leisure: GIRFDivisionResponse;
  };
}

// 4. 개별 매장별 계량경제학 분석 지표
export type CausalGrade = 
  | 'CONFIRMED_TEMPORAL_CAUSAL'     // [1등급] 시계열 선행 인과 확실 (Granger FDR q < 0.05)
  | 'CONTEMPORANEOUS_CORRELATION'   // [2등급] 당일 동시적 상관관계 (HAC-t FDR q < 0.05)
  | 'SPURIOUS';                     // [3등급] 외생효과 통제 시 통계적 비유의 (가짜 연관)

export interface ShopSynergyItem {
  targetShopName: string;          // 매장명 (예: "남도예담")
  categoryName: string;            // 화면 표시 카테고리명 (예: "식음")
  categoryCode?: string;           // 카테고리 코드 (예: "FNB")
  
  // (A) 순수 구조적 낙수효과 (날씨/휴일 통제 후)
  pureSpilloverPerMillion: number; // 앵커 매출 100만원 증가 시 순수 낙수액 (원)
  pureElasticity: number;          // 순수 탄력성 (앵커 10% 증가 시 해당 매장 증가율 %)
  pureCorrelation: number;         // Frisch-Waugh-Lovell 순수 편상관계수 (-1.0 ~ 1.0)
  
  // (B) 통계적 유의성 및 가설검정
  neweyWestHacTStat?: number;      // Newey-West HAC 강건 t-통계량
  hacPValue?: number;              // 단일 t-검정 p-value
  hacRank?: number;                // HAC 검정 순위
  hacFdrQValue?: number;           // Benjamini-Hochberg FDR 보정 q-value
  isHacFdrSignificant?: boolean;   // HAC FDR 유의 여부 (q < 0.05)
  
  // (C) Granger 시계열 선행 인과성
  grangerCausality?: {
    fStatistic: number;            // Granger F-통계량
    pValue: number;                // Granger p-value
    isGrangerCausal: boolean;      // 단일 검정 기준 유의 여부
  };
  grangerRank?: number;            // Granger 검정 순위
  grangerFdrQValue?: number;       // Granger FDR 보정 q-value
  isGrangerFdrSignificant?: boolean;// Granger FDR 유의 여부 (q < 0.05)
  
  // (D) 최종 인과 판정 및 인사이트
  causalInferenceGrade?: CausalGrade; // 최종 인과 등급
  isSpurious?: boolean;               // 가짜 연관 여부
  insight?: string;                   // 비즈니스 액션 제안 문구
  
  // (E) 기초 실적 및 외생 감응도
  totalRevenue?: number;           // 분석 기간 매장 실측 총매출 (원)
  dailyAvgRevenue?: number;        // 매장 일평균 매출 (원)
  timeLagDistribution?: {
    sameDayRatio: number;          // 당일 반응 비중 (%)
    nextDayRatio: number;          // 익일 지연 반응 비중 (%)
  };
  exogenousSensitivities?: {
    holidayPremiumPct: number;     // 주말/공휴일 매출 프리미엄 (%)
    rain10mmImpactPct: number;     // 강수 10mm당 매출 영향 (%)
    temp1degImpactPct: number;     // 기온 1도 상승당 매출 영향 (%)
  };
  
  // CAPA & 추가 지표
  saturationThreshold_K?: number;
  currentCapacityUtilization?: number;
  bottleneckRisk?: 'SAFE' | 'WARNING' | 'CRITICAL' | string;
  missedSpilloverRevenue?: number;
  aiStrategyInsight?: string;
  
  // 호환성 필드
  shopName?: string;
  storeName?: string;
  divisionName?: string;
  totalSales?: number;
  correlatedSales?: number;
  correlatedVisitors?: number;
  spilloverRate?: number;
  correlationCoefficient?: number;
  rawCorrelation?: number;
  elasticityPercent?: number;
  spilloverPerMillion?: number;
  synergyGrade?: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW' | 'INSIGNIFICANT' | string;
  causalConfidenceGrade?: 'CONFIRMED' | 'MODERATE' | 'NOISE' | string;
  dailyTrends?: DailyTrendItem[];
}
export type StoreCorrelationItem = ShopSynergyItem;
export type CrossSynergyItem = ShopSynergyItem;

// 5. 최상위 API 응답 구조
export interface CrossSynergyApiResponse {
  status: 'success' | 'error' | string;
  econometricStandard?: string;
  anchor: AnchorMeta;
  exogenousControl: ExogenousControlMeta;
  generalizedImpulseResponses?: {
    pointEstimates?: number[][];
    girfTable: GIRFHorizonRow[];
  };
  summary: {
    totalShopsAnalyzed?: number;    // 분석 대상 매장 총수 (34개)
    totalPureSpillover: number;    // 앵커 100만당 34개 매장 순수 낙수액 총합 (원)
    topSynergyShop?: string;        // 최고 시너지 매장명
    maxSpilloverAmount?: number;    // 최고 낙수액
    averageElasticity?: number;     // 평균 탄력성
  };
  byCategory?: {
    fnb: ShopSynergyItem[];        // 식음 매장 리스트
    leisure: ShopSynergyItem[];    // 레저본부 매장 리스트
    room: ShopSynergyItem[];       // 객실 매장 리스트
    moto?: ShopSynergyItem[];      // 모토아레나 매장 리스트
    banquet?: ShopSynergyItem[];   // 연회/대관 매장 리스트
  };
  correlations: ShopSynergyItem[]; // 34개 전수 매장 리스트 (낙수액 내림차순 정렬)
  synergyMatrix?: ShopSynergyItem[];
}
export type CrossSynergyMatrixResponse = CrossSynergyApiResponse;

