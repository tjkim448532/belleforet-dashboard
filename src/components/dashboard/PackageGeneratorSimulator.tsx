import { useState, useMemo } from 'react';
import { 
  Package, Sparkles, Sliders, DollarSign,
  Hotel, Utensils, Ticket, CheckCircle2, 
  ShieldCheck, Flame, HelpCircle
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { MULTI_YEAR_SEASONALITY_DATA } from '../../data/monthlySeasonalityData';

interface PackagePreset {
  id: string;
  name: string;
  badge: string;
  targetPriceGross: number; // VAT 포함
  roomType: string;
  roomSharePct: number;
  fnbSharePct: number;
  leisureSharePct: number;
  desc: string;
  highlightFnb: string;
  highlightActivity: string;
}

const PRESET_PACKAGES: PackagePreset[] = [
  {
    id: 'PKG_GOURMET',
    name: 'Winter Gourmet 1박 2식 패키지',
    badge: '1단계 방어형',
    targetPriceGross: 279000,
    roomType: '16평형 콘도',
    roomSharePct: 43.4,
    fnbSharePct: 41.4,
    leisureSharePct: 15.2,
    desc: '겨울철 최저점(1~2월) 극복을 위해 식음 바우처(석식+조식)를 결합하여 객단가를 확실히 락인하는 볼륨 모델',
    highlightFnb: '남도예담 or 쿠치나 석식 바우처 + 조식 2인',
    highlightActivity: '미디어아트센터 2인 관람권'
  },
  {
    id: 'PKG_BBQ_SPA',
    name: 'Cozy BBQ & Healing 스파 패키지',
    badge: '2단계 도전형',
    targetPriceGross: 329000,
    roomType: '35평형 콘도',
    roomSharePct: 46.8,
    fnbSharePct: 40.1,
    leisureSharePct: 13.1,
    desc: '브리스킷346 바베큐 디너와 사우나/힐링 시설을 결합하여 가족/커플 고객의 체류 소비를 극대화하는 프리미엄 모델',
    highlightFnb: '브리스킷346 패밀리 BBQ 세트 + 조식 2인',
    highlightActivity: '사우나 2인 + 벨포레 목장 입장권'
  },
  {
    id: 'PKG_FAMILY_DELUXE',
    name: 'Family Play & Dine 51평 패키지',
    badge: '패밀리 풀패키지형',
    targetPriceGross: 389000,
    roomType: '51평형 커넥팅룸',
    roomSharePct: 48.1,
    fnbSharePct: 39.6,
    leisureSharePct: 12.3,
    desc: '대형 객실(51평) 소진을 위해 4인 기준 식음과 액티비티를 풀 패키징하여 최고 TrevPAR를 창출하는 모델',
    highlightFnb: '리조트 전사 F&B 통합 식음권 (4인 기준)',
    highlightActivity: '미디어아트 4인 + 사계절썰매 4인'
  }
];

export default function PackageGeneratorSimulator() {
  // 1. Season / Month Selection (Focus on low seasons: Month 1, 2, 12, 3)
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  // 2. Simulation Direction Mode
  // Mode A: Set Target TrevPAR -> Generate Package Price & Component Split
  // Mode B: Set Custom Package Price -> Reverse Calculate TrevPAR & RevPAR
  const [simDirection, setSimDirection] = useState<'TREVPAR_TO_PKG' | 'PKG_TO_TREVPAR'>('TREVPAR_TO_PKG');

  // Mode A Inputs (TrevPAR -> Package Price)
  const [targetTrevpar, setTargetTrevpar] = useState<number>(250000); // 목표 순수 리조트 TrevPAR (골프 제외)
  const [targetOccupancy, setTargetOccupancy] = useState<number>(40); // 목표 점유율 (비수기 평일 40%)
  const [targetDOW, setTargetDOW] = useState<'WEEKDAY' | 'WEEKEND'>('WEEKDAY');

  // Mode B Inputs (Package Price -> TrevPAR reverse calculation)
  const [customPkgPriceGross, setCustomPkgPriceGross] = useState<number>(279000);
  const [customPkgSoldRooms, setCustomPkgSoldRooms] = useState<number>(70);
  const [customRoomShare, setCustomRoomShare] = useState<number>(43);
  const [customFnbShare, setCustomFnbShare] = useState<number>(42);
  const [customLeisureShare, setCustomLeisureShare] = useState<number>(15);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val));
  };

  // SSOT Historical Baseline for Selected Month
  const monthBaseline = useMemo(() => {
    const y2025 = MULTI_YEAR_SEASONALITY_DATA[2025]?.months[selectedMonth];
    const y2024 = MULTI_YEAR_SEASONALITY_DATA[2024]?.months[selectedMonth];
    const base = y2025 ? y2025 : y2024;

    const days = base?.days ? base.days : new Date(2025, selectedMonth, 0).getDate();
    const totalRev = base?.totalRevenue ? Number(base.totalRevenue) : 0;
    const totalTrevpar = base?.trevpar ? Number(base.trevpar) : 0;
    const golfShare = base?.divisionShares?.GOLF ? Number(base.divisionShares.GOLF) : 0;
    const roomShare = base?.divisionShares?.ROOM ? Number(base.divisionShares.ROOM) : 0;
    
    // SSOT 기반 순수 리조트(골프 제외) TrevPAR 및 객실 RevPAR 직결 계산
    const exGolfTrevpar = Math.round(totalTrevpar * (1 - golfShare));
    const revPar = Math.round(totalTrevpar * roomShare);

    // Non-golf division distribution
    const nonGolfTotalShare = (1 - golfShare) > 0 ? (1 - golfShare) : 1;
    const normRoomShare = Number(((base?.divisionShares?.ROOM ? Number(base.divisionShares.ROOM) : 0.35) / nonGolfTotalShare * 100).toFixed(1));
    const normFnbShare = Number(((base?.divisionShares?.FNB ? Number(base.divisionShares.FNB) : 0.40) / nonGolfTotalShare * 100).toFixed(1));
    const normLeisureShare = Number(((base?.divisionShares?.LEISURE ? Number(base.divisionShares.LEISURE) : 0.15) / nonGolfTotalShare * 100).toFixed(1));

    return {
      days,
      totalRev,
      totalTrevpar,
      exGolfTrevpar,
      revPar,
      normRoomShare,
      normFnbShare,
      normLeisureShare
    };
  }, [selectedMonth]);

  // Calculations for Mode A (TrevPAR -> Package)
  const modeAResults = useMemo(() => {
    const physicalRoomCount = 175; // 가용 객실수
    const targetDailyNonGolfRev = Math.round(targetTrevpar * physicalRoomCount);
    const targetDailyRoomsSold = Math.max(1, Math.round(physicalRoomCount * (targetOccupancy / 100)));
    
    // TrevPOR (Total Revenue Per Occupied Room = 1실 투숙객당 필요 순매출)
    const requiredTrevPOR = Math.round(targetTrevpar / (targetOccupancy / 100));

    // 실측 비수기 가중치 적용한 패키지 1실 순매출 배분
    const roomNetPrice = Math.round(requiredTrevPOR * (monthBaseline.normRoomShare / 100));
    const fnbNetPrice = Math.round(requiredTrevPOR * (monthBaseline.normFnbShare / 100));
    const leisureNetPrice = Math.max(0, requiredTrevPOR - roomNetPrice - fnbNetPrice);

    // 소비자 판매가 (VAT 10% 포함)
    const recommendedPkgPriceGross = Math.round(requiredTrevPOR * 1.1 / 1000) * 1000;

    // 예상 RevPAR
    const expectedRevPAR = Math.round((roomNetPrice * targetDailyRoomsSold) / physicalRoomCount);

    // 기준선 대비 추가 창출 일매출 및 월매출
    const dailyDiffRev = targetDailyNonGolfRev - Math.round(monthBaseline.exGolfTrevpar * physicalRoomCount);
    const monthlyDiffRev = dailyDiffRev * monthBaseline.days;
    const growthRate = monthBaseline.exGolfTrevpar > 0 
      ? ((targetTrevpar - monthBaseline.exGolfTrevpar) / monthBaseline.exGolfTrevpar * 100).toFixed(1)
      : '0.0';

    return {
      physicalRoomCount,
      targetDailyNonGolfRev,
      targetDailyRoomsSold,
      requiredTrevPOR,
      roomNetPrice,
      fnbNetPrice,
      leisureNetPrice,
      recommendedPkgPriceGross,
      expectedRevPAR,
      dailyDiffRev,
      monthlyDiffRev,
      growthRate
    };
  }, [targetTrevpar, targetOccupancy, monthBaseline]);

  // Calculations for Mode B (Package -> TrevPAR)
  const modeBResults = useMemo(() => {
    const physicalRoomCount = 175;
    const pkgNetPrice = Math.round(customPkgPriceGross / 1.1);
    const totalDailyPkgNetRev = pkgNetPrice * customPkgSoldRooms;

    const roomNetPrice = Math.round(pkgNetPrice * (customRoomShare / 100));
    const fnbNetPrice = Math.round(pkgNetPrice * (customFnbShare / 100));
    const leisureNetPrice = Math.max(0, pkgNetPrice - roomNetPrice - fnbNetPrice);

    // 패키지 판매로 인한 RevPAR
    const pkgRevPAR = Math.round((roomNetPrice * customPkgSoldRooms) / physicalRoomCount);
    
    // 패키지 판매로 창출되는 골프 제외 TrevPAR
    const pkgExGolfTrevPAR = Math.round(totalDailyPkgNetRev / physicalRoomCount);
    const effectiveOccupancy = Number(((customPkgSoldRooms / physicalRoomCount) * 100).toFixed(1));

    // 월간 순매출
    const monthlyPkgRevenue = totalDailyPkgNetRev * monthBaseline.days;

    return {
      physicalRoomCount,
      pkgNetPrice,
      totalDailyPkgNetRev,
      roomNetPrice,
      fnbNetPrice,
      leisureNetPrice,
      pkgRevPAR,
      pkgExGolfTrevPAR,
      effectiveOccupancy,
      monthlyPkgRevenue
    };
  }, [customPkgPriceGross, customPkgSoldRooms, customRoomShare, customFnbShare, customLeisureShare, monthBaseline]);

  // Load Preset
  const handleApplyPreset = (preset: PackagePreset) => {
    if (simDirection === 'TREVPAR_TO_PKG') {
      const net = Math.round(preset.targetPriceGross / 1.1);
      const calculatedTrevpar = Math.round(net * (targetOccupancy / 100));
      setTargetTrevpar(calculatedTrevpar);
    } else {
      setCustomPkgPriceGross(preset.targetPriceGross);
      setCustomRoomShare(Math.round(preset.roomSharePct));
      setCustomFnbShare(Math.round(preset.fnbSharePct));
      setCustomLeisureShare(Math.round(preset.leisureSharePct));
    }
  };

  // Pie Chart Option for Package Component Distribution
  const packagePieOptions = useMemo(() => {
    const isModeA = simDirection === 'TREVPAR_TO_PKG';
    const roomVal = isModeA ? modeAResults.roomNetPrice : modeBResults.roomNetPrice;
    const fnbVal = isModeA ? modeAResults.fnbNetPrice : modeBResults.fnbNetPrice;
    const leisureVal = isModeA ? modeAResults.leisureNetPrice : modeBResults.leisureNetPrice;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString()}원 (${p.percent}%)`
      },
      legend: {
        bottom: 0,
        itemGap: 12,
        textStyle: { fontSize: 11, fontWeight: 'bold' }
      },
      series: [
        {
          name: '패키지 품목 안분',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 'bold'
          },
          data: [
            { name: '객실 (Room)', value: roomVal, itemStyle: { color: '#1E3A8A' } },
            { name: '식음 (F&B)', value: fnbVal, itemStyle: { color: '#16A34A' } },
            { name: '레저/체험', value: leisureVal, itemStyle: { color: '#EAB308' } }
          ]
        }
      ]
    };
  }, [simDirection, modeAResults, modeBResults]);

  return (
    <div className="space-y-6">

      {/* 1. Header Banner & Target Month Selection */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 rounded-[28px] p-6 lg:p-8 text-white relative overflow-hidden shadow-lg border border-teal-800/40">
        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-1.5 uppercase">
                <Package size={13} />
                EX-GOLF RESORT PACKAGE GENERATOR
              </span>
              <span className="text-xs text-slate-300 font-medium">
                가용객실 175실 기준
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 break-keep">
              비수기 패키지 가격 & 수익 시뮬레이터
            </h2>
            <p className="text-slate-300 text-xs lg:text-sm mt-1.5 max-w-3xl leading-relaxed">
              골프가 비활성화되는 동계 비수기에 <strong>순수 리조트 TrevPAR(골프 제외)</strong>와 <strong>객실 RevPAR</strong>를 극대화할 수 있도록, 
              <strong>객단가(TrevPOR) 락인 패키지 가격과 객실/식음/레저 최적 안분비</strong>를 실시간 도출합니다.
            </p>
          </div>

          {/* Month Selector for Low Seasons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/10 shrink-0">
            <span className="text-xs font-bold text-slate-400 px-2">시뮬레이션 타깃 월:</span>
            <div className="flex items-center gap-1">
              {[
                { m: 1, label: '1월', sub: '겨울 비수기' },
                { m: 2, label: '2월', sub: '연중 최저점' },
                { m: 3, label: '3월', sub: '봄 개장기' },
                { m: 12, label: '12월', sub: '동계 진입기' }
              ].map(item => (
                <button
                  key={item.m}
                  onClick={() => setSelectedMonth(item.m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === item.m
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div>{item.label}</div>
                  <div className="text-[9px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SSOT 실측 기준선 정보 카드 */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-teal-600 shrink-0" />
          <div>
            <span className="font-extrabold text-slate-800">
              {selectedMonth}월 실측 베이스라인 (SSOT):
            </span>
            <span className="text-slate-600 ml-2">
              전사 TrevPAR <strong>{formatCurrency(monthBaseline.totalTrevpar)}원</strong> ➔ 
              골프 제외 순수 리조트 TrevPAR <strong className="text-teal-800">{formatCurrency(monthBaseline.exGolfTrevpar)}원</strong> 
              (객실 RevPAR {formatCurrency(monthBaseline.revPar)}원)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
            비골프 비중: 식음 {monthBaseline.normFnbShare}% · 객실 {monthBaseline.normRoomShare}% · 레저 {monthBaseline.normLeisureShare}%
          </span>
        </div>
      </div>

      {/* 3. Predefined Strategy Packages (One-click Presets) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Flame size={14} className="text-amber-500" />
            전략 기획 패키지 3종 퀵 템플릿 (원클릭 로드)
          </span>
          <span className="text-[11px] text-slate-400">
            원클릭 시 설정값이 즉시 시뮬레이션 계산기에 반영됩니다
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {PRESET_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => handleApplyPreset(pkg)}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                    {pkg.badge}
                  </span>
                  <span className="text-sm font-black text-indigo-950 group-hover:text-teal-700 transition-colors">
                    {formatCurrency(pkg.targetPriceGross)}원
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm mb-1">
                  {pkg.name}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {pkg.desc}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 space-y-0.5">
                <div>🍽️ <strong>식음:</strong> {pkg.highlightFnb}</div>
                <div>🎢 <strong>레저:</strong> {pkg.highlightActivity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Dual-Direction Mode Toggle Bar */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSimDirection('TREVPAR_TO_PKG')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            simDirection === 'TREVPAR_TO_PKG'
              ? 'bg-white text-teal-900 shadow-md border border-slate-200/80 font-black'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sliders size={14} className={simDirection === 'TREVPAR_TO_PKG' ? 'text-teal-600' : ''} />
          <span>모드 A. [목표 TrevPAR ➔ 적정 패키지 가격 & 품목 안분 자동 산출]</span>
        </button>

        <button
          onClick={() => setSimDirection('PKG_TO_TREVPAR')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            simDirection === 'PKG_TO_TREVPAR'
              ? 'bg-white text-indigo-950 shadow-md border border-slate-200/80 font-black'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <DollarSign size={14} className={simDirection === 'PKG_TO_TREVPAR' ? 'text-indigo-600' : ''} />
          <span>모드 B. [기획 패키지 가격 ➔ 달성 TrevPAR & RevPAR 실시간 역산]</span>
        </button>
      </div>

      {/* 5. Main Simulation Workspace (Grid: Inputs on Left, Results on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sliders size={16} className="text-teal-600" />
              {simDirection === 'TREVPAR_TO_PKG' ? '목표 조건 입력 (Mode A)' : '패키지 기획안 입력 (Mode B)'}
            </h3>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {simDirection === 'TREVPAR_TO_PKG' ? 'TrevPAR 기반 자동 설계' : '가격 기반 역산'}
            </span>
          </div>

          {simDirection === 'TREVPAR_TO_PKG' ? (
            /* Mode A Controls */
            <div className="space-y-4">
              {/* Target Ex-Golf TrevPAR */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    목표 순수 리조트 TrevPAR (골프 제외):
                  </label>
                  <span className="text-sm font-black text-teal-800">
                    {formatCurrency(targetTrevpar)}원 <span className="text-[11px] font-normal text-slate-400">/실</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="160000"
                  max="350000"
                  step="5000"
                  value={targetTrevpar}
                  onChange={(e) => setTargetTrevpar(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>현재 실측 {formatCurrency(monthBaseline.exGolfTrevpar)}원</span>
                  <span>{formatCurrency(250000)}원</span>
                  <span>{formatCurrency(300000)}원</span>
                </div>
              </div>

              {/* Target Occupancy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    목표 객실 점유율 (Target OCC):
                  </label>
                  <span className="text-sm font-black text-indigo-950">
                    {targetOccupancy}% <span className="text-[11px] font-normal text-slate-400">(판매 {modeAResults.targetDailyRoomsSold}실)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={targetOccupancy}
                  onChange={(e) => setTargetOccupancy(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>비수기 주중 평균: 35~40%</span>
                  <span>손익분기: 50%</span>
                  <span>주말 목표: 70~80%</span>
                </div>
              </div>

              {/* Target DOW Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  판매 타깃 요일:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setTargetDOW('WEEKDAY'); setTargetOccupancy(40); }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      targetDOW === 'WEEKDAY'
                        ? 'bg-teal-600 text-white border-teal-600 font-black'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    일~목 주중 (OCC 40% 타깃)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetDOW('WEEKEND'); setTargetOccupancy(75); }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      targetDOW === 'WEEKEND'
                        ? 'bg-indigo-900 text-white border-indigo-900 font-black'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    금~토 주말 (OCC 75% 타깃)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Mode B Controls */
            <div className="space-y-4">
              {/* Custom Package Gross Price */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    기획 패키지 소비자 가격 (VAT 포함):
                  </label>
                  <span className="text-sm font-black text-indigo-900">
                    {formatCurrency(customPkgPriceGross)}원
                  </span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="450000"
                  step="10000"
                  value={customPkgPriceGross}
                  onChange={(e) => setCustomPkgPriceGross(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  순매출 환산 (VAT 제외): <strong>{formatCurrency(modeBResults.pkgNetPrice)}원</strong>
                </div>
              </div>

              {/* Target Sold Rooms */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    일일 판매 목표 객실 수:
                  </label>
                  <span className="text-sm font-black text-teal-800">
                    {customPkgSoldRooms}실 <span className="text-[11px] font-normal text-slate-400">({modeBResults.effectiveOccupancy}% 점유율 기여)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="140"
                  step="5"
                  value={customPkgSoldRooms}
                  onChange={(e) => setCustomPkgSoldRooms(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Internal Component Share Customization */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>패키지 내부 매출 안분율:</span>
                  <span className="text-[10px] text-slate-400">합계 {customRoomShare + customFnbShare + customLeisureShare}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">객실 (Room)</span>
                    <input
                      type="number"
                      value={customRoomShare}
                      onChange={(e) => setCustomRoomShare(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 text-xs py-0.5"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">식음 (F&B)</span>
                    <input
                      type="number"
                      value={customFnbShare}
                      onChange={(e) => setCustomFnbShare(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 text-xs py-0.5"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">레저/체험</span>
                    <input
                      type="number"
                      value={customLeisureShare}
                      onChange={(e) => setCustomLeisureShare(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 text-xs py-0.5"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theoretical Core Formula Callout */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={13} className="text-teal-600" />
              <span>수익 공식: 패키지 가격과 TrevPAR의 연계</span>
            </div>
            <p className="leading-relaxed">
              <strong>TrevPOR(객실당 총지출) = 목표 TrevPAR ÷ 점유율(OCC)</strong><br />
              고객이 리조트 내에서 식음/레저를 소비하지 않고 룸만 사면 전사 TrevPAR가 달성되지 않으므로, 
              패키지 내에 F&B 바우처와 레저 티켓을 필수 포함하여 객단가를 고정시킵니다.
            </p>
          </div>
        </div>

        {/* Right Column: Generated Package Blueprint & Revenue Outcomes */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Highlight Blueprint Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal-400" />
                {simDirection === 'TREVPAR_TO_PKG' ? '산출된 최적 권장 패키지 판매가' : '시뮬레이션 전사 성과 예측'}
              </span>
              <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 text-slate-300 font-medium">
                {selectedMonth}월 기준
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="text-xs text-slate-400 font-medium">
                  {simDirection === 'TREVPAR_TO_PKG' ? '권장 패키지 소비자 판매가 (VAT 포함)' : '패키지 1실당 순매출'}
                </div>
                <div className="text-3xl lg:text-4xl font-black text-white mt-1 tabular-nums">
                  {simDirection === 'TREVPAR_TO_PKG' 
                    ? `${formatCurrency(modeAResults.recommendedPkgPriceGross)}원`
                    : `${formatCurrency(modeBResults.pkgNetPrice)}원`}
                </div>
                <div className="text-xs text-teal-300 mt-1 font-medium">
                  {simDirection === 'TREVPAR_TO_PKG'
                    ? `필요 순수 TrevPOR(객실당 소비액): ${formatCurrency(modeAResults.requiredTrevPOR)}원`
                    : `일 목표 판매: ${customPkgSoldRooms}실 (총 ${formatCurrency(modeBResults.totalDailyPkgNetRev)}원)`}
                </div>
              </div>

              {/* Result Metrics */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">달성 객실 RevPAR:</span>
                  <span className="font-extrabold text-white">
                    {simDirection === 'TREVPAR_TO_PKG'
                      ? `${formatCurrency(modeAResults.expectedRevPAR)}원`
                      : `${formatCurrency(modeBResults.pkgRevPAR)}원`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">달성 골프제외 TrevPAR:</span>
                  <span className="font-black text-teal-300 text-sm">
                    {simDirection === 'TREVPAR_TO_PKG'
                      ? `${formatCurrency(targetTrevpar)}원`
                      : `${formatCurrency(modeBResults.pkgExGolfTrevPAR)}원`}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                  <span className="text-slate-300">월간 추가 순매출:</span>
                  <span className="font-extrabold text-amber-300">
                    {simDirection === 'TREVPAR_TO_PKG'
                      ? `+${(modeAResults.monthlyDiffRev / 100000000).toFixed(2)}억 원`
                      : `${(modeBResults.monthlyPkgRevenue / 100000000).toFixed(2)}억 원`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Package Component Itemized Breakdown (How the package is constructed) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center justify-between">
              <span>패키지 내부 품목별 최적 안분표 (SSOT 기준)</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {simDirection === 'TREVPAR_TO_PKG' ? '실측 비수기 식음/객실 비중 반영' : '사용자 지정 안분율'}
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Room */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-indigo-900 font-bold mb-1">
                    <span className="flex items-center gap-1.5"><Hotel size={14} /> 객실 부문</span>
                    <span className="text-[10px] bg-indigo-200/60 px-2 py-0.5 rounded-full font-bold">
                      {simDirection === 'TREVPAR_TO_PKG' ? `${monthBaseline.normRoomShare}%` : `${customRoomShare}%`}
                    </span>
                  </div>
                  <div className="text-lg font-black text-indigo-950 mt-1">
                    {simDirection === 'TREVPAR_TO_PKG' 
                      ? `${formatCurrency(modeAResults.roomNetPrice)}원`
                      : `${formatCurrency(modeBResults.roomNetPrice)}원`}
                  </div>
                </div>
                <div className="text-[10px] text-indigo-700 mt-2">
                  16평/35평 1박 기본 귀속 순매출
                </div>
              </div>

              {/* F&B */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-emerald-900 font-bold mb-1">
                    <span className="flex items-center gap-1.5"><Utensils size={14} /> 식음 (F&B) 부문</span>
                    <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-bold">
                      {simDirection === 'TREVPAR_TO_PKG' ? `${monthBaseline.normFnbShare}%` : `${customFnbShare}%`}
                    </span>
                  </div>
                  <div className="text-lg font-black text-emerald-950 mt-1">
                    {simDirection === 'TREVPAR_TO_PKG' 
                      ? `${formatCurrency(modeAResults.fnbNetPrice)}원`
                      : `${formatCurrency(modeBResults.fnbNetPrice)}원`}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-700 mt-2">
                  남도예담/쿠치나 석식 + 조식 바우처
                </div>
              </div>

              {/* Leisure */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-900 font-bold mb-1">
                    <span className="flex items-center gap-1.5"><Ticket size={14} /> 레저/문화 부문</span>
                    <span className="text-[10px] bg-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                      {simDirection === 'TREVPAR_TO_PKG' ? `${monthBaseline.normLeisureShare}%` : `${customLeisureShare}%`}
                    </span>
                  </div>
                  <div className="text-lg font-black text-amber-950 mt-1">
                    {simDirection === 'TREVPAR_TO_PKG' 
                      ? `${formatCurrency(modeAResults.leisureNetPrice)}원`
                      : `${formatCurrency(modeBResults.leisureNetPrice)}원`}
                  </div>
                </div>
                <div className="text-[10px] text-amber-700 mt-2">
                  미디어아트 / 목장 / 사우나 관람권
                </div>
              </div>
            </div>

            {/* Visual Pie Chart */}
            <div className="h-[200px] w-full pt-2">
              <ReactECharts option={packagePieOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* 3. Executive Summary Briefing Note */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-950 space-y-1.5">
            <div className="font-extrabold text-teal-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-600" />
              <span>경영진 보고용 패키지 전략 시뮬레이션 요약</span>
            </div>
            <p className="leading-relaxed text-teal-900/90">
              {simDirection === 'TREVPAR_TO_PKG' ? (
                <>
                  {selectedMonth}월에 <strong>{formatCurrency(modeAResults.recommendedPkgPriceGross)}원</strong>짜리 체류형 1박 2식 패키지를 
                  일일 <strong>{modeAResults.targetDailyRoomsSold}실(점유율 {targetOccupancy}%)</strong> 판매할 경우, 
                  기존 {selectedMonth}월 순수 리조트 TrevPAR는 <strong>{formatCurrency(monthBaseline.exGolfTrevpar)}원</strong>에서 
                  <strong>{formatCurrency(targetTrevpar)}원</strong>으로 <strong className="text-teal-800">+{modeAResults.growthRate}% 신장</strong>되며, 
                  월간 <strong className="text-teal-800">+{formatCurrency(modeAResults.monthlyDiffRev)}원</strong>의 추가 순매출이 창출됩니다.
                </>
              ) : (
                <>
                  <strong>{formatCurrency(customPkgPriceGross)}원</strong>짜리 패키지를 일일 <strong>{customPkgSoldRooms}실(점유율 기여 {modeBResults.effectiveOccupancy}%)</strong> 판매 시, 
                  객실 RevPAR는 <strong>{formatCurrency(modeBResults.pkgRevPAR)}원</strong>, 
                  순수 리조트 TrevPAR는 <strong>{formatCurrency(modeBResults.pkgExGolfTrevPAR)}원</strong> 수준으로 직접 견인됩니다.
                </>
              )}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
