import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Menu, X, LayoutDashboard, ShieldCheck, TrendingUp,
  ChevronDown, ChevronRight, Hotel, Ticket, Key, Flag, Database, MonitorPlay,
  Briefcase, Sparkles, Users, CloudRain, Pin, PanelLeftClose, PanelLeftOpen, Tag,
  Palette, Package, Gift
} from 'lucide-react';

export default function Layout() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isEmbed = searchParams.get('embed') === 'true' || location.pathname.startsWith('/embed');

  if (isEmbed) {
    return (
      <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E]">
        <Outlet />
      </div>
    );
  }

  const { logout, isAdmin, hasRole, updateUserPassword, userEmail } = useAuth();
  const navigate = useNavigate();
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('belleforet_sidebar_pinned');
    return saved !== null ? saved === 'true' : true; // 사용자 승인 기본값: 펼침(고정)
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(() => location.pathname.startsWith('/sales') || location.pathname.startsWith('/group-sales'));
  const [golfOpen, setGolfOpen] = useState(() => location.pathname.startsWith('/golf'));
  const [resortOpen, setResortOpen] = useState(() => location.pathname.startsWith('/resort') || location.pathname.startsWith('/condo') || location.pathname.includes('reservation-status'));
  const [leisureOpen, setLeisureOpen] = useState(() => location.pathname.startsWith('/leisure'));
  const [contentOpen, setContentOpen] = useState(() => location.pathname.startsWith('/content') || location.pathname.includes('outsourced-fnb'));
  const [membersOpen, setMembersOpen] = useState(() => location.pathname.startsWith('/members') || location.pathname.startsWith('/online-members'));
  const [synergyOpen, setSynergyOpen] = useState(() => location.pathname.startsWith('/synergy'));

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    localStorage.setItem('belleforet_sidebar_pinned', String(next));
    if (next) {
      setSidebarOpen(false);
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024 || !isPinned) {
      setSidebarOpen(false);
    }
  };

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) {
      alert('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    if (!confirm('정말 이 비밀번호로 변경하시겠습니까?')) return;
    
    setIsChangingPwd(true);
    const result = await updateUserPassword(newPwd);
    setIsChangingPwd(false);
    
    if (result.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요.');
      setPwdModalOpen(false);
      setNewPwd('');
    } else {
      alert(result.errorMsg);
    }
  };

  // 전사 공통 3대 대시보드 (모든 로그인 임직원 공통 노출)
  const commonMenuItems = [
    { name: '전사 종합 매출 & TRevPAR', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: '부문별 주간정산 & 요일별 매출', path: '/matrix-weekly', icon: <Database size={20} /> },
    { name: '영업장별 월별 추이 & 시즌성', path: '/facility-trend', icon: <TrendingUp size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1B382E] font-sans flex">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#1B382E]/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Hover Trigger when collapsed on desktop */}
      {!isPinned && !sidebarOpen && (
        <div 
          className="hidden lg:block fixed inset-y-0 left-0 w-4 z-40 bg-transparent cursor-pointer"
          onMouseEnter={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar - Forest & Stone Luxury Theme */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-hidden bg-[#284F42] text-white transform transition-transform duration-300 ease-in-out flex flex-col border-r border-[#1B382E] shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isPinned ? 'lg:translate-x-0' : (sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full')
        }`}
        onMouseLeave={() => {
          if (!isPinned) setSidebarOpen(false);
        }}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {/* Mac-style 3 dots from reference image */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DE6E6D]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5B85C]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#5FB878]" />
            </div>
            <h1 className="font-emphatic text-base tracking-widest text-white font-black">BELLE FORET</h1>
          </div>
          <div className="flex items-center gap-1">
            {/* Desktop Pin/Collapse Button */}
            <button
              onClick={togglePin}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isPinned ? "사이드바 접기 (넓은 화면)" : "사이드바 고정"}
            >
              {isPinned ? <PanelLeftClose size={18} /> : <Pin size={18} className="rotate-45" />}
            </button>
            {/* Mobile Close Button */}
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(false);
              }} 
              className="lg:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer select-none"
              title="메뉴 닫기"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 space-y-1.5">
          <div className="text-[11px] font-semibold text-white/45 mb-3 px-2 tracking-widest uppercase">Dashboards</div>
          
          {commonMenuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => `flex items-center gap-2.5 px-3.5 py-2.5 font-medium transition-all rounded-xl leading-snug break-keep text-sm ${
                (isActive || (item.path === '/matrix-weekly' && window.location.pathname === '/day-of-week-sales')) && (item.path === '/' ? window.location.pathname === '/' : true)
                  ? 'bg-[#B59269] text-white font-bold shadow-xs'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
              onClick={(e) => {
                  if (item.path.startsWith('#')) e.preventDefault();
                  else {
                    handleNavClick();
                  }
                }}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}

          {/* 세일즈본부 Accordion */}
          {hasRole('sales') && (
            <div className="mt-1.5">
              <button
                onClick={() => setSalesOpen(!salesOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Briefcase size={20} />
                  세일즈본부
                </div>
                {salesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {salesOpen && (
                <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                  <NavLink
                    to="/group-sales"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive || window.location.pathname === '/sales/room-channels'
                        ? 'bg-[#B59269] text-white font-bold shadow-xs'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    객실 판매채널 & 세미나 점유율
                  </NavLink>
                  <NavLink
                    to="/sales/venue-performance"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    연회·세미나실 대관 & 단가
                  </NavLink>
                  <NavLink
                    to="/sales/group-master-crm"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    단체 이용 명부 & 영업담당자 실적
                  </NavLink>
                  <NavLink
                    to="/sales/group-venue-preference"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    단체 방문 매장 순위 & 선호 동선
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 골프사업본부 Accordion */}
          {hasRole('golf') && (
            <div className="mt-1.5">
              <button
                onClick={() => setGolfOpen(!golfOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Flag size={20} />
                  골프사업본부
                </div>
                {golfOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {golfOpen && (
                <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                  <NavLink
                    to="/golf-business"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    골프 매출 & 내장객 현황
                  </NavLink>
                  <NavLink
                    to="/golf/channel-intelligence"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    채널별 그린피 수익성 & 내장객 CRM
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 2. 리조트사업본부 Accordion */}
          {hasRole('resort') && (
            <div className="mt-1.5">
            <button
              onClick={() => setResortOpen(!resortOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Hotel size={20} />
                리조트사업본부
              </div>
              {resortOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {resortOpen && (
              <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                <NavLink
                  to="/resort-business"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  콘도 매출 & 가동률·ADR 현황
                </NavLink>
                <NavLink
                  to="/resort/reservation-status"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/reservation-status'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  향후 객실 예약 & 단체 입실 예정
                </NavLink>
                <NavLink
                  to="/condo/dynamic-pricing"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/resort/dynamic-pricing'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <Sparkles size={14} className="shrink-0 text-[#CAAC86]" />
                  객실 추천 요금 & 경쟁사 가격 비교
                </NavLink>
                <NavLink
                  to="/resort/room-guest-analysis"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  일일 투숙객 & 골프제외 이용객 분석
                </NavLink>
                <NavLink
                  to="/resort/room-guests-yoy"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  연도별 투숙객·판매방수 & 객실소계
                </NavLink>
              </div>
            )}
          </div>
          )}

          {/* 3. 레저본부 Accordion (리조트사업본부 바로 아래) */}
          {hasRole('leisure') && (
          <div className="mt-1.5">
            <button
              onClick={() => setLeisureOpen(!leisureOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Ticket size={20} />
                레저본부
              </div>
              {leisureOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {leisureOpen && (
              <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                <NavLink
                  to="/leisure"
                  end
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  레저 매출 · 인기티켓 & 할인누수
                </NavLink>
                <NavLink
                  to="/leisure/usage-rate"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/leisure-usage-rate'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  골프제외 이용객 대비 레저 이용률
                </NavLink>
                <NavLink
                  to="/leisure/package-sales"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/leisure-package-sales'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <Package size={14} className="shrink-0 text-white" />
                  복합 패키지 매출 & 유입 기여도
                </NavLink>
                <NavLink
                  to="/leisure/simulator"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/leisure-simulator'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  티켓 단가 & 수요 시뮬레이터
                </NavLink>
                <NavLink
                  to="/leisure/gift-shop"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/leisure-gift-shop'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <Gift size={14} className="shrink-0 text-white" />
                  기념품 샵 품목별 매출 랭킹
                </NavLink>
                <NavLink
                  to="/leisure/organization"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/leisure-organization'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  레저 조직도 & 인력 배치 현황
                </NavLink>
              </div>
            )}
          </div>
          )}

          {/* 4. 컨텐츠기획본부 Accordion (외주식음 정예화) */}
          {hasRole(['content', 'fnb']) && (
            <div className="mt-1.5">
              <button
                onClick={() => setContentOpen(!contentOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Palette size={20} />
                  컨텐츠기획본부
                </div>
                {contentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {contentOpen && (
                <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                  <NavLink
                    to="/content/outsourced-fnb"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive || window.location.pathname === '/outsourced-fnb'
                        ? 'bg-[#B59269] text-white font-bold shadow-xs'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    외주식음 매장별 매출 & Top 3 메뉴
                  </NavLink>
                  <NavLink
                    to="/content/fnb-directory"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    외주식음 종합 일람표 & 운영·휴무 안내
                  </NavLink>
                  <NavLink
                    to="/content/group-rankings"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    식음 매장별 단체 매출 & 방문 동선
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 5. 👥 회원 & 멤버십 분석 Accordion */}
          {(hasRole('management') || hasRole('resort') || hasRole('golf')) && (
            <div className="mt-1.5">
              <button
                onClick={() => setMembersOpen(!membersOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users size={20} />
                  회원 & 멤버십 분석
                </div>
                {membersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {membersOpen && (
                <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                  <NavLink
                    to="/members"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    분양회원(콘도·골프) & 휴양소 실적
                  </NavLink>
                  <NavLink
                    to="/online-members"
                    className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                      isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={handleNavClick}
                  >
                    온라인 회원 가입 추이 & 휴면 단골 관리
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 6. ⚡ 시너지 & 매출 예측 분석 Accordion */}
          {hasRole('management') && (
            <div className="mt-1.5">
            <button
              onClick={() => setSynergyOpen(!synergyOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all rounded-xl text-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MonitorPlay size={20} />
                시너지 & 매출 예측 분석
              </div>
              {synergyOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {synergyOpen && (
              <div className="ml-2.5 mt-1 pl-2.5 border-l-2 border-white/15 space-y-1">
                <NavLink
                  to="/synergy"
                  end
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive ? 'bg-[#B59269] text-white font-bold shadow-xs' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <Sparkles size={14} className="shrink-0 text-[#CAAC86]" />
                  객실 채널·체류시간별 복합 소비 시너지
                </NavLink>

                <NavLink
                  to="/synergy/correlation"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/synergy-correlation'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  숙박객 유입 매장별 동반 소비 분석
                </NavLink>

                <NavLink
                  to="/synergy/weather-sales"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/synergy-weather'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <CloudRain size={14} className="shrink-0" />
                  날씨(강수·적설)-매출 상관관계 & 시뮬레이션
                </NavLink>

                <NavLink
                  to="/synergy/forecast"
                  className={({ isActive }) => `flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] font-medium rounded-xl transition-colors leading-snug break-keep ${
                    isActive || window.location.pathname === '/synergy-forecast'
                      ? 'bg-[#B59269] text-white font-bold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={handleNavClick}
                >
                  <TrendingUp size={14} className="shrink-0 text-white" />
                  당일·익일 예상 매출 (예약·날씨 연동)
                </NavLink>
              </div>
            )}
          </div>
          )}

          {/* 7. 전략 목표 시뮬레이터 & 전 부문 종합 요금표 */}
          {hasRole('management') && (
            <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
              <NavLink
                to="/strategic-simulator"
                className={({ isActive }) => `flex items-center justify-between px-3.5 py-2.5 font-medium transition-all rounded-xl leading-snug break-keep text-sm ${
                  isActive || window.location.pathname.startsWith('/target-simulator')
                    ? 'bg-[#B59269] text-white font-bold shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={handleNavClick}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-[#CAAC86]" />
                  <span className="text-sm font-bold">전략 목표 & 영업계획 시뮬레이터</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">v2 PRO</span>
              </NavLink>
            </div>
          )}

          {(hasRole('leisure') || hasRole('resort') || hasRole('management')) && (
            <div className="space-y-1">
              <NavLink
                to="/leisure/pricing"
                className={({ isActive }) => `flex items-center gap-2.5 px-3.5 py-2.5 font-medium transition-all rounded-xl leading-snug break-keep text-sm ${
                  isActive || window.location.pathname === '/pricing' || window.location.pathname === '/leisure-pricing'
                    ? 'bg-[#B59269] text-white font-bold shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={handleNavClick}
              >
                <Tag size={18} className="text-[#CAAC86]" />
                <span className="text-sm font-bold">전 부문 이용요금 & 할인 혜택 카탈로그</span>
              </NavLink>
            </div>
          )}

        </div>
          
        {/* 하단 유틸리티 및 관리자 메뉴 */}
        <div className="p-4 space-y-2 border-t border-white/10">
            <button
              onClick={() => setPwdModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/75 hover:bg-white/10 hover:text-white transition-all font-medium text-sm cursor-pointer"
            >
              <Key size={20} />
              비밀번호 변경
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/75 hover:bg-white/10 hover:text-white transition-all font-medium text-sm cursor-pointer"
            >
              <LogOut size={20} />
              로그아웃
            </button>

            {/* 관리자 (맨 아래) */}
            {isAdmin && (
              <NavLink
                to="/admin/roles"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm bg-[#B59269] hover:bg-[#9E7542] text-white shadow-md mt-2"
              >
                <ShieldCheck size={20} className="text-white" />
                관리자
              </NavLink>
            )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'lg:ml-72' : 'lg:ml-0'}`}>
        {/* Desktop Expand Button when unpinned */}
        {!isPinned && (
          <button
            onClick={() => {
              setIsPinned(true);
              localStorage.setItem('belleforet_sidebar_pinned', 'true');
            }}
            className="hidden lg:flex fixed top-4 left-4 z-40 items-center gap-1.5 px-3 py-2 rounded-xl bg-[#284F42]/95 backdrop-blur-md border border-white/20 shadow-lg text-white hover:bg-[#2F5548] text-xs font-bold transition-all hover:scale-105 cursor-pointer select-none"
            title="사이드바 펼쳐서 고정"
          >
            <PanelLeftOpen size={16} className="text-[#CAAC86]" />
            <span>메뉴 열기</span>
          </button>
        )}
        {/* Topbar for mobile */}
        <header className="lg:hidden h-16 bg-[#284F42] border-b border-[#1B382E] flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm text-white">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setSidebarOpen(true)} 
              className="p-2 -ml-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer select-none"
              title="메뉴 열기"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-emphatic text-xl tracking-widest text-white font-black mt-1">BELLE FORET</h1>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* Outlet is wrapped by Home.tsx which handles its own padding. But Layout wrapper usually needs w-full h-full */}
          <div className="w-full h-full relative">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden relative">
            <button 
              onClick={() => setPwdModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-medium text-slate-800 mb-2 flex items-center gap-2">
              <Key className="text-brand-mint" size={24} /> 비밀번호 변경
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">현재 접속된 계정 ({userEmail})의 비밀번호를 새로 설정합니다.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">새 비밀번호 (6자리 이상)</label>
                <input 
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="새로운 비밀번호를 입력하세요"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 font-sans"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPwd || newPwd.length < 6}
                className="w-full py-3 bg-brand-mint text-white font-medium rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 mt-4"
              >
                {isChangingPwd ? '변경하는 중...' : '이 비밀번호로 변경하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
