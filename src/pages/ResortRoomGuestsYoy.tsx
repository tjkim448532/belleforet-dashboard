import { Hotel } from 'lucide-react';
import GlobalDatePicker from '../components/GlobalDatePicker';
import RoomGuestsYoyTable from '../components/dashboard/RoomGuestsYoyTable';

export default function ResortRoomGuestsYoy() {
  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-slate-800 rounded-[32px] p-6 lg:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Hotel size={22} className="text-indigo-200" />
              <span className="font-semibold tracking-wider text-xs lg:text-sm text-indigo-100 uppercase whitespace-nowrap">
                BELLE FORET RESORT DIVISION · ROOM GUEST & REVENUE MATRIX
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap break-keep">
              <span className="whitespace-nowrap">리조트사업본부 연도별 숙박객 및 객실 소계 매출 매트릭스</span>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                24 · 25 · 26 연도별 YoY 정밀 분석
              </span>
            </h1>
            <p className="text-indigo-100 text-sm mt-2 font-normal opacity-90 break-keep max-w-3xl leading-relaxed">
              관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)으로 산출한 전체 숙박객(진성 투숙객 모수)과 객실 소계(ROOM + ROOM OTHER) 매출의 연도별 월별 실적 추이입니다.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20">
              <GlobalDatePicker showPresets={false} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Room Guests YoY Matrix Table */}
      <RoomGuestsYoyTable />
    </div>
  );
}
