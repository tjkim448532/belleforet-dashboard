import { NavLink } from 'react-router-dom';
import { Utensils, Trophy, Building2, Table } from 'lucide-react';

const CONTENT_PAGES = [
  {
    path: '/content/outsourced-fnb',
    label: '외주식음 매출 & 인기메뉴',
    desc: '당일·당월·연간 매출 및 매장별 Top 3 메뉴',
    icon: Utensils
  },
  {
    path: '/content/group-rankings',
    label: '영업장별 단체 순위 & 평균매출',
    desc: '단체 유치 순위·팀당 평균 매출·방문일 급증률',
    icon: Trophy
  },
  {
    path: '/content/group-segments',
    label: '단체 유형별 선호도 & 방문동선',
    desc: '기업·공공·학교별 선호 매장 및 1:N 이용 동선',
    icon: Building2
  },
  {
    path: '/content/fnb-directory',
    label: '종합 일람표 & 휴무일 안내',
    desc: '전 매장 실적 비교표 및 운영시간·정기휴무',
    icon: Table
  }
];

export default function ContentDivisionNav() {
  return (
    <div className="bg-white rounded-2xl p-2 border border-[#D0C6BB]/75 shadow-xs grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
      {CONTENT_PAGES.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#284F42] text-white shadow-xs font-bold'
                  : 'bg-[#F4F3EE]/70 hover:bg-[#F4F3EE] text-[#5A6B63] hover:text-[#1B382E] border border-[#D0C6BB]/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-[#5FB878] border border-white/20'
                      : 'bg-white text-[#284F42] border border-[#D0C6BB]/60 shadow-2xs'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold truncate" title={item.label}>
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-white/80' : 'text-[#8C9E96]'
                    }`}
                    title={item.desc}
                  >
                    {item.desc}
                  </div>
                </div>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
