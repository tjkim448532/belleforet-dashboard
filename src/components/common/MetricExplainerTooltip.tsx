import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, AlertCircle, X, Calculator, Lightbulb, BookOpen } from 'lucide-react';

export type MetricPresetKey = 
  | 'netRevenue' 
  | 'trevpar' 
  | 'visitorCount' 
  | 'connectingRoom' 
  | 'adr' 
  | 'yoyDow' 
  | 'occupancy' 
  | 'golfRevenuePerTeam'
  | 'arpu'
  | 'mtdRevenue'
  | 'ytdRevenue'
  | 'leadTime'
  | 'cancellationRate'
  | 'waitingReservation'
  | 'unitWearSpread'
  | 'walkInVisitor';

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
    insight: '모든 대시보드의 매출 집계는 본 순매출(VAT 제외)을 공식 기준으로 삼아 부서 간 실적 왜곡을 원천 방지합니다.'
  },
  mtdRevenue: {
    title: '월별 누적 매출 (MTD Revenue)',
    badge: '월간 누적 실적',
    definition: '당월 1일부터 조회일까지 리조트 전사(객실+골프+식음+레저 등)에서 발생한 순매출(VAT 제외) 누적 합산입니다.',
    formula: '당월 1일 ~ 조회일 전사 일별 순매출 합산 vs 전년 동월 동일 기간(Calendar MTD) 누적 비교',
    insight: '회계 기준에 따라 전년 동월 동일 일수 구간(예: 9/1~9/27 vs 전년 9/1~9/27)과 1:1 대조하여 당월 목표 달성 진척도와 성장세를 정밀 평가합니다.'
  },
  ytdRevenue: {
    title: '올해 누적 매출 (YTD Revenue)',
    badge: '연간 누적 실적',
    definition: '당해 1월 1일부터 조회일까지 리조트 전사에서 발생한 순매출(VAT 제외) 총 누적 합산입니다.',
    formula: '당해 1월 1일 ~ 조회일 전사 순매출 누적 vs 전년 1월 1일 ~ 동일 일자(Calendar YTD) 누적 비교',
    insight: '연간 경영 목표 달성률을 추적하고, 전년 동기간 대비 전사 외형 성장과 사업 부문별 기여도를 총괄 진단하는 최상위 재무 지표입니다.'
  },
  trevpar: {
    title: 'TrevPAR (가용객실당 총매출)',
    badge: '리조트 핵심 KPI',
    definition: '리조트가 보유한 175실 전체 물리적 객실 1실당 창출된 리조트 전사(객실+식음+레저+골프) 통합 매출 효율입니다.',
    formula: '리조트 전사 총 순매출 ÷ (물리 가용객실수 175실 × 운영일수)',
    insight: '단순 객실 판매단가(ADR)를 넘어, 투숙객이 리조트 내 다른 시설(루지, 미디어아트, F&B)에서 소비한 시너지 총량을 측정하는 최상위 경영 지표입니다.'
  },
  visitorCount: {
    title: '진성 방문객 수 (순수 입장객 기준)',
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
  },
  arpu: {
    title: '1인당 객단가 (ARPU)',
    badge: '골프 수익성 지표',
    definition: '골프장을 방문한 실제 내장객 1인이 그린피, 카트비, 식음료(그늘집/레스토랑), 프로샵 등에서 지출한 평균 소비 금액입니다.',
    formula: '골프 총 순매출액 ÷ 실제 총 내장객 수 (명)',
    insight: '단순 내장객 수 증가를 넘어, 고부가가치 내장객 유치 및 부대시설(식음료, 용품) 소비 시너지를 정밀하게 진단하는 핵심 수익성 지표입니다.'
  },
  leadTime: {
    title: '평균 예약 리드타임 (Booking Lead Time)',
    badge: '예약 선행 지표',
    definition: '고객이 객실을 예약 접수(등록일자)한 시점부터 실제 체크인(도착일자)하기까지 걸린 평균 사전 예약 일수입니다.',
    formula: 'Σ(체크인 도착일자 - 예약 등록일자) ÷ 전체 원천 예약 건수 (일)',
    insight: '리드타임이 길수록 조기 예약(얼리버드·회원 선점) 수요가 높음을 뜻하며, 성수기·주말 가격 인상(Yield Management) 및 프로모션 투입 시점을 결정하는 핵심 기준입니다.'
  },
  cancellationRate: {
    title: '사전 예약 취소율 (Cancellation Rate)',
    badge: '공실 방어 지표',
    definition: '전체 접수된 원천 객실 예약 중 투숙 전에 취소(Cancelled Reservation)된 예약 건수의 비율입니다.',
    formula: '(사전 취소 예약 건수 ÷ 총 원천 예약 건수) × 100 (%)',
    insight: '장기 리드타임(31일 이상) 구간은 가수요 선점으로 인해 취소율이 급증(Cancellation Cliff)합니다. 취소 집중 구간의 위약금 정책 강화 및 오버부킹·대기예약 전환율 관리가 필수적입니다.'
  },
  waitingReservation: {
    title: '대기 예약 (Waiting Reservation)',
    badge: '수익 방어 버퍼',
    definition: '만실이거나 희망 객실 마감 시 취소 객실이 발생할 경우 우선 배정받기 위해 대기 등록한 예약 건수입니다.',
    formula: 'PMS 원천 예약 상태가 대기(Waiting Reservation)인 건수 합계',
    insight: '사전 취소 발생 시 공실 손실(Spoilage)을 즉시 방어할 수 있는 잠재 수요층입니다. 취소 임계 시점에 대기 고객에게 알림톡·전화를 즉시 발송하여 실투숙 전환율을 극대화해야 합니다.'
  },
  unitWearSpread: {
    title: '물리 호실 마스터 가동 범위 및 배정 편차',
    badge: '시설 감가상각 감사',
    definition: '조회 기간 중 실제 투숙객이 배정되어 가동된 물리 호실(객실번호)의 수와, 최다 배정 호실 대비 최소 배정 호실 간의 회전율 격차(배수)입니다.',
    formula: '가동 호실 수 = 배정 1회 이상 고유 호실 수 / 편차 = 최다 배정 호실 횟수 ÷ 최소 배정 호실 횟수',
    insight: '특정 선호 동·층·뷰 호실에만 배정이 집중되면 침구·가구·설비 노후화(감가상각)가 편중됩니다. 프런트 자동 배정 로테이션을 통해 175개 전 호실의 컨디션을 균등하게 유지해야 합니다.'
  },
  walkInVisitor: {
    title: '워크인 방문객 (Walk-in Visitors)',
    badge: '주차관제 SSOT',
    definition: '주차관제상 미등록(직원·골프·콘도·업무 등 제외) 순수 당일 차량으로 내장한 워크인 방문객 수입니다.',
    formula: '미등록 순수 워크인 차량(actualWalkInCars) × 3명 (탑승객 배수, 백엔드 완제품)',
    insight: '사내 주차관제 시스템(ATS3000_Bell)의 고유 차량번호 1일 1대 중복 제거 원장을 기반으로 산출되며, 콘도 투숙객(객실 PMS)과 함께 리조트 전체 진성 유입 인구를 구성합니다.'
  }
};

interface MetricExplainerTooltipProps {
  presetKey?: MetricPresetKey;
  customData?: MetricExplainerData;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  className?: string;
  iconSize?: number;
  iconType?: 'question' | 'exclamation';
}

export default function MetricExplainerTooltip({
  presetKey,
  customData,
  position = 'bottom',
  align = 'left',
  className = '',
  iconSize = 15,
  iconType = 'question'
}: MetricExplainerTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: 0,
    left: 0,
    opacity: 0
  });

  const data: MetricExplainerData | undefined = customData || (presetKey ? METRIC_PRESETS[presetKey] : undefined);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : Math.min(384, window.innerWidth - 32);
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 260;
    const padding = 16;

    let left = triggerRect.left;
    if ( position === 'left') {
      left = triggerRect.left - tooltipWidth - 8;
    } else if (position === 'right') {
      left = triggerRect.right + 8;
    } else if (align === 'right') {
      left = triggerRect.right - tooltipWidth;
    } else if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else {
      left = triggerRect.left;
    }

    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    let top = triggerRect.bottom + 8;
    if (position === 'top') {
      top = triggerRect.top - tooltipHeight - 8;
      if (top < padding) {
        top = triggerRect.bottom + 8;
      }
    } else if (position === 'left' || position === 'right') {
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
    } else {
      top = triggerRect.bottom + 8;
      if (top + tooltipHeight > window.innerHeight - padding && triggerRect.top - tooltipHeight - 8 >= padding) {
        top = triggerRect.top - tooltipHeight - 8;
      }
    }

    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    setFixedStyle({ top, left, opacity: 1 });
  }, [align, position]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!tooltipRef.current || !tooltipRef.current.contains(target))
      ) {
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

  useEffect(() => {
    if (!isOpen) {
      setFixedStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  if (!data) return null;

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
        {iconType === 'exclamation' ? (
          <AlertCircle size={iconSize} className="transition-transform duration-200 hover:scale-110" />
        ) : (
          <HelpCircle size={iconSize} className="transition-transform duration-200 hover:scale-110" />
        )}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${fixedStyle.top}px`,
              left: `${fixedStyle.left}px`,
              opacity: fixedStyle.opacity
            }}
            className="z-[99999] w-[calc(100vw-32px)] max-w-sm sm:max-w-md sm:w-96 max-h-[85vh] overflow-y-auto p-4 bg-white rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.22)] text-slate-800 text-left transition-opacity duration-100"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setIsOpen(false)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-brand-mint ring-4 ring-brand-mint/20 shrink-0" />
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
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
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
              <span className="font-semibold text-brand-mint">공식 집계 Ver 6.0</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
