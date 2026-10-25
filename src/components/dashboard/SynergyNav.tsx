import { NavLink } from 'react-router-dom';
import { Sparkles, Zap, CloudRain, TrendingUp } from 'lucide-react';

const SYNERGY_PAGES = [
  {
    path: '/synergy',
    label: '1. 객실 채널·체류시간별 복합 소비 시너지',
    icon: Sparkles
  },
  {
    path: '/synergy/correlation',
    label: '2. 숙박객 유입 매장별 동반 소비 분석',
    icon: Zap
  },
  {
    path: '/synergy/weather-sales',
    label: '3. 🌦️ 날씨-매출 상관관계 & 시뮬레이션',
    icon: CloudRain
  },
  {
    path: '/synergy/forecast',
    label: '4. 🔮 당일·익일 예상 매출 (예약·날씨 연동)',
    icon: TrendingUp
  }
];

export default function SynergyNav() {
  return (
    <div className="bg-white rounded-2xl p-1.5 border border-[#D0C6BB]/75 shadow-xs flex items-center gap-1.5 overflow-x-auto">
      {SYNERGY_PAGES.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/synergy'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#284F42] text-white shadow-2xs font-extrabold'
                  : 'text-[#5A6B63] hover:text-[#1B382E] hover:bg-[#F4F3EE]'
              }`
            }
          >
            <Icon size={14} className="shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
