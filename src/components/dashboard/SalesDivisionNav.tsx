import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BedDouble, Building2, Users, Trophy, Briefcase } from 'lucide-react';

interface SalesNavItem {
  path: string;
  matchPaths: string[];
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: SalesNavItem[] = [
  {
    path: '/group-sales',
    matchPaths: ['/group-sales', '/sales/room-channels'],
    label: '객실 판매방식 & 세미나 점유율',
    sublabel: '주중·주말 세미나 점유율 및 채널×평형 실적',
    icon: <BedDouble size={16} />
  },
  {
    path: '/sales/venue-performance',
    matchPaths: ['/sales/venue-performance'],
    label: '연회·세미나실 대관 현황',
    sublabel: '장소별 대관 건수·평균 단가·월별 추이',
    icon: <Building2 size={16} />
  },
  {
    path: '/sales/group-master-crm',
    matchPaths: ['/sales/group-master-crm'],
    label: '단체 예약 명부 & 판촉 실적',
    sublabel: '재방문 단체 명부 및 영업담당자 수주 리더보드',
    icon: <Users size={16} />
  },
  {
    path: '/sales/group-venue-preference',
    matchPaths: ['/sales/group-venue-preference'],
    label: '단체 방문 매장 순위 & 동선',
    sublabel: '식음·부대 매장별 단체 평균 매출 및 선호 동선',
    icon: <Trophy size={16} />
  }
];

export default function SalesDivisionNav() {
  const location = useLocation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
            <Briefcase size={15} />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-800 tracking-tight">
              세일즈본부 세부 리포트 메뉴
            </span>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-2">
              원하시는 분석 영역을 선택하세요
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 flex-1 lg:max-w-5xl">
          {NAV_ITEMS.map((item) => {
            const isActive = item.matchPaths.includes(location.pathname);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-brand-mint/20 text-brand-mint'
                      : 'bg-white text-slate-500 border border-slate-200/80'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-extrabold truncate ${
                      isActive ? 'text-white' : 'text-slate-800'
                    }`}
                    title={item.label}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                    title={item.sublabel}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
