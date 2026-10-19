import LeisurePricingSimulator from '../components/dashboard/LeisurePricingSimulator';
import { Ticket } from 'lucide-react';

export default function LeisureSimulator() {
  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="bg-[#284F42] rounded-3xl p-7 lg:p-8 text-white relative overflow-hidden shadow-xl border border-[#1B382E]">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#5FB878]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-20 w-64 h-64 bg-[#B59269]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>BELLEFORET RESORT · LEISURE SIMULATOR</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Ticket className="w-7 h-7 text-[#5FB878]" />
                티켓 가격 & 수요 탄력성 시뮬레이터
              </h1>
              <p className="text-sm text-white/80 mt-1">
                각 레저 영업장의 가장 마지막 연도 누적 트랜잭션 판매금액 Top 5 티켓 단가 변동 및 고객 수요 탄력성에 따른 예상 월·연 매출을 시뮬레이션합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Main Simulator Component */}
        <LeisurePricingSimulator />
      </div>
    </div>
  );
}
