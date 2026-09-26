import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Calculator, Lightbulb, BookOpen } from 'lucide-react';

export type MetricPresetKey = 
  | 'netRevenue' 
  | 'trevpar' 
  | 'visitorCount' 
  | 'connectingRoom' 
  | 'adr' 
  | 'yoyDow' 
  | 'occupancy' 
  | 'golfRevenuePerTeam';

interface MetricExplainerData {
  title: string;
  badge?: string;
  definition: string;
  formula: string;
  insight: string;
}

const METRIC_PRESETS: Record<MetricPresetKey, MetricExplainerData> = {
  netRevenue: {
    title: '순매출 (Net Revenue)',
    badge: '회계 표준',
    definition: '고객이 결제한 총매출(Gross Sales)에서 부가가치세(10%)를 제외하고 벨포레에 실질적으로 귀속되는 실제 순수익입니다.',
    formula: '총 결제 금액 (Gross) ÷ 1.1 = 순매출 (원단위 절사)',
    insight: '모든 대시보드의 매출 집계는 본 순매출(VAT 제외)을 SSOT 단일 기준으로 삼아 부서 간 실적 왜곡을 원천 방지합니다.'
  },
  trevpar: {
    title: 'TrevPAR (가용객실당 총매출)',
    badge: '리조트 핵심 KPI',
    definition: '리조트가 보유한 175실 전체 물리적 객실 1실당 창출된 리조트 전사(객실+식음+레저+골프) 통합 매출 효율입니다.',
    formula: '리조트 전사 총 순매출 ÷ (물리 가용객실수 175실 × 운영일수)',
    insight: '단순 객실 판매단가(ADR)를 넘어, 투숙객이 리조트 내 다른 시설(루지, 미디어아트, F&B)에서 소비한 시너지 총량을 측정하는 최상위 경영 지표입니다.'
  },
  visitorCount: {
    title: '진성 방문객 수 (is_visitor_count)',
    badge: '집계 무결성',
    definition: '리조트에 실제로 발을 디딘 순수 사람(Person)의 수입니다. 식음료 단품 주문이나 연회 식수 등 상품 수량은 엄격히 배제됩니다.',
    formula: '객실 투숙객수(정원 기반) + 골프 내장객수 + 레저 입장객수 (식음 단품 판매량 제외)',
    insight: '카페에서 커피 5잔을 결제해도 방문객은 1명일 수 있습니다. 본 지표는 상품 판매 건수와 실제 유입 인구를 분리하여 정밀한 객단가를 산출합니다.'
  },
  connectingRoom: {
    title: '커넥팅 룸 (51평) 안분 점유율',
    badge: '운영 최적화',
    definition: '독립 객실(16평+35평) 2개를 문으로 연결하여 51평형 1세트로 판매할 때 발생하는 복합 점유율 계산 기준입니다.',
    formula: '실물 키 분배 기준 16평(1실) + 35평(1실) = 물리 2실 점유 반영',
    insight: '단일 계약 1건으로 51평이 판매되더라도 실제로는 2개의 물리 객실이 소진되므로, 물리 가동률과 회계 계약 건수를 일치시키는 핵심 기준입니다.'
  },
  adr: {
    title: '객실 ADR (Average Daily Rate)',
    badge: '호텔 경영 지표',
    definition: '실제 판매된 객실 1실당 평균 판매 단가로, 순수 객실 부문의 가격 방어력과 수익성을 나타냅니다.',
    formula: '객실 순매출 ÷ 실제 판매 객실 수 (Rooms Sold)',
    insight: '점유율(OCC)이 상승해도 ADR이 하락하면 출혈 할인 판매를 의미합니다. OCC와 ADR이 균형을 이루는 최적의 가격 정책을 모니터링해야 합니다.'
  },
  yoyDow: {
    title: '전년 동요일 비교 (YoY DOW)',
    badge: '통계 정밀화',
    definition: '단순 달력 날짜(예: 3월 15일)가 아닌, 동일 요일(월요일은 월요일과, 토요일은 토요일과)끼리 1:1 매칭하여 비교하는 리조트 특화 비교법입니다.',
    formula: '당해 n주차 토요일 실적 vs 전년 동일 주차 토요일 실적',
    insight: '리조트/레저는 주말과 평일의 매출 격차가 3~5배에 달하므로, 달력 일자로 비교 시 발생하는 착시를 방지하고 실제 영업 신장률을 정확히 판별합니다.'
  },
  occupancy: {
    title: '객실 점유율 (Occupancy / OCC)',
    badge: '호텔 경영 지표',
    definition: '전체 가용 객실(175실) 중 당일 실제로 판매 및 배정되어 운영된 객실의 백분율입니다.',
    formula: '(판매 객실 수 ÷ 전체 가용 객실 175실) × 100 (%)',
    insight: '비수기/성수기 공급 조절 및 하우스키핑/프런트 운영 인력 배치의 기본 잣대가 됩니다.'
  },
  golfRevenuePerTeam: {
    title: '골프 팀당 매출 (Rev Per Team)',
    badge: '골프 KPI',
    definition: '예약된 골프 1팀(4인 기준)이 그린피, 카트비, F&B 그늘집 등에서 발생시킨 평균 매출액입니다.',
    formula: '골프장 총 순매출 ÷ 완주/정산 팀 수',
    insight: '예약 팀 수의 물리적 한계(티타임 간격) 내에서 F&B 패키지나 프리미엄 카트 옵션을 통한 부가가치 창출력을 평가합니다.'
  }
};

interface MetricExplainerTooltipProps {
  presetKey?: MetricPresetKey;
  customData?: MetricExplainerData;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: number;
}

export default function MetricExplainerTooltip({
  presetKey,
  customData,
  position = 'bottom',
  className = '',
  iconSize = 15
}: MetricExplainerTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const data: MetricExplainerData | undefined = customData || (presetKey ? METRIC_PRESETS[presetKey] : undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!data) return null;

  // 위치 스타일 계산
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'bottom':
      default:
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
    }
  };

  return (
    <div className={`relative inline-flex items-center align-middle ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        className="p-0.5 rounded-full text-slate-400 hover:text-brand-mint hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-mint/40 cursor-pointer"
        aria-label={`${data.title} 지표 설명 보기`}
        title={`${data.title} 설명`}
      >
        <HelpCircle size={iconSize} className="transition-transform duration-200 hover:scale-110" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-80 sm:w-96 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.18)] text-slate-800 text-left animate-in fade-in zoom-in-95 duration-150 ${getPositionClasses()}`}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-mint ring-4 ring-brand-mint/20" />
              <h4 className="font-bold text-sm text-slate-900 tracking-tight">{data.title}</h4>
              {data.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                  {data.badge}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          {/* 3-Section Content */}
          <div className="space-y-3 text-xs leading-relaxed">
            {/* 1. 정의 */}
            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                <BookOpen size={12} className="text-brand-mint" />
                <span>지표 정의</span>
              </div>
              <p className="text-slate-700 font-normal">{data.definition}</p>
            </div>

            {/* 2. 산출 공식 */}
            <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/70">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
                <Calculator size={12} className="text-brand-mint" />
                <span>산출 공식</span>
              </div>
              <code className="block font-mono text-[11px] font-semibold text-emerald-900 bg-white/80 px-2 py-1 rounded border border-emerald-100 break-words">
                {data.formula}
              </code>
            </div>

            {/* 3. 경영진 의사결정 포인트 */}
            <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/70">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold mb-1">
                <Lightbulb size={12} className="text-amber-500" />
                <span>경영진 의사결정 포인트</span>
              </div>
              <p className="text-amber-900/90 font-normal leading-normal">{data.insight}</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>벨포레 데이터 표준 관리 시스템</span>
            <span className="font-semibold text-brand-mint">SSOT Ver 6.0</span>
          </div>
        </div>
      )}
    </div>
  );
}
