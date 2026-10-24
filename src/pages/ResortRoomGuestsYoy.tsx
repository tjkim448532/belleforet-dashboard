import GlobalDatePicker from '../components/GlobalDatePicker';
import RoomGuestsYoyTable from '../components/dashboard/RoomGuestsYoyTable';

export default function ResortRoomGuestsYoy() {
  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16">
      {/* Decorative Ambient Header Background */}
      <div className="w-full bg-[#284F42] h-[190px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 relative z-10 pt-8 space-y-6">
        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET RESORT · 리조트사업본부 연도별 숙박객 및 객실 소계</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight break-keep">리조트사업본부 연도별 숙박객 및 객실 소계</h1>
            <p className="text-sm text-white/80 mt-1 break-keep">
              관리자 설정 기준 정원(16평 2.5명, 35평 4.5명, 51평 5.5명, R51/단독/펫51 6.0명)으로 산출한 전체 숙박객과 객실 소계 매출의 연도별 YoY 정밀 분석
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <GlobalDatePicker showPresets={false} />
          </div>
        </div>

        {/* 2. Room Guests YoY Matrix Table */}
        <RoomGuestsYoyTable />
      </div>
    </div>
  );
}
