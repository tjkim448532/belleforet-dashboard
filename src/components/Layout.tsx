import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Menu, X, LayoutDashboard, ShieldCheck, 
  ChevronDown, ChevronRight, Briefcase, Building, Hotel, Ticket, Coffee, Key, Flag, Database 
} from 'lucide-react';

export default function Layout() {
  const { logout, isAdmin, userRole, updateUserPassword, userEmail } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leisureOpen, setLeisureOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [resortOpen, setResortOpen] = useState(false);

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

  const menuItems = [
    { name: '전사 종합 매출', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'executive', 'sales', 'leisure', 'resort', 'management', 'content', 'guest', 'fnb'] },
    { name: '골프사업본부', path: '/golf-business', icon: <Flag size={20} />, roles: ['admin', 'executive', 'leisure'] },
    { name: '세일즈본부', path: '#세일즈본부', icon: <Building size={20} />, roles: ['admin', 'executive', 'sales'] },
    { name: '식음본부', path: '#식음본부', icon: <Coffee size={20} />, roles: ['admin', 'executive', 'fnb'] },
  ];

  const visibleMenuItems = menuItems.filter(item => !userRole || item.roles.includes(userRole));

  const leisureItems = [
    '목장', '미디어아트센터', '썸머랜드', '원더풀', 
    '사계절썰매', '마리나클럽', '미니포렛', '그랜드포렛', '놀이동산', '모토아레나'
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Belleforet Light Theme */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col border-r border-slate-200 shadow-sm`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-2xl font-emphatic text-brand-mint tracking-widest">BELLE FORET</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 mb-4 px-2 tracking-widest uppercase">Dashboards</div>
          
          {visibleMenuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 font-bold transition-all rounded-xl ${
                isActive && item.path === '/' // Only active state for real routes
                  ? 'bg-brand-mint/10 text-brand-mint'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              onClick={(e) => {
                if (item.path.startsWith('#')) e.preventDefault();
                else setSidebarOpen(false);
              }}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}

          {/* 리조트사업본부 Accordion */}
          {(userRole === 'admin' || userRole === 'executive' || userRole === 'resort') && (
            <div className="mt-2">
            <button
              onClick={() => setResortOpen(!resortOpen)}
              className="w-full flex items-center justify-between px-4 py-3 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Hotel size={20} />
                리조트사업본부
              </div>
              {resortOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {resortOpen && (
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-100 space-y-1">
                <NavLink
                  to="/resort-business"
                  className={({ isActive }) => `block w-full text-left px-4 py-3 md:py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    isActive ? 'text-brand-mint bg-brand-mint/10' : 'text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5'
                  }`}
                  onClick={() => { 
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  경영 현황 대시보드
                </NavLink>
                <NavLink
                  to="/members"
                  className={({ isActive }) => `block w-full text-left px-4 py-3 md:py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    isActive ? 'text-brand-mint bg-brand-mint/10' : 'text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5'
                  }`}
                  onClick={() => { 
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  회원관리
                </NavLink>
              </div>
            )}
          </div>
          )}
          {/* 경영지원실 Accordion */}
          {(userRole === 'admin' || userRole === 'executive' || userRole === 'sales' || userRole === 'management') && (
            <div className="mt-2">
            <button
              onClick={() => setManagementOpen(!managementOpen)}
              className="w-full flex items-center justify-between px-4 py-3 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Briefcase size={20} />
                경영지원실
              </div>
              {managementOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {managementOpen && (
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-100 space-y-1">
                <NavLink
                  to="#management-dashboard"
                  className="block w-full text-left px-4 py-3 md:py-2 text-sm font-medium text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5 rounded-lg transition-colors"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  영업보고 대시보드
                </NavLink>
                <NavLink
                  to="/management-support"
                  className={({ isActive }) => `block w-full text-left px-4 py-3 md:py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    isActive ? 'text-brand-mint bg-brand-mint/10' : 'text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5'
                  }`}
                  onClick={() => { 
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  영업보고 문자보내기
                </NavLink>
              </div>
            )}
          </div>
          )}
          {/* 레져본부 Accordion */}
          {(userRole === 'admin' || userRole === 'executive' || userRole === 'leisure') && (
          <div className="mt-2">
            <button
              onClick={() => setLeisureOpen(!leisureOpen)}
              className="w-full flex items-center justify-between px-4 py-3 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Ticket size={20} />
                레져본부
              </div>
              {leisureOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {leisureOpen && (
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-100 space-y-1">
                {leisureItems.map((subItem, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-3 md:py-2 text-sm font-medium text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5 rounded-lg transition-colors"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      if (window.innerWidth < 1024) setSidebarOpen(false); // Close sidebar on mobile
                    }}
                  >
                    {subItem}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

        </div>
          
        <div className="p-4 space-y-2 border-t border-slate-100">
            <NavLink
              to="/etl-status"
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Database size={20} />
              데이터 연동 현황
            </NavLink>
            
            {isAdmin && (
              <NavLink
                to="/admin/simulator"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm bg-slate-900 text-white shadow-lg hover:bg-slate-800"
              >
                <ShieldCheck size={20} className="text-brand-mint" />
                관리자 센터 입장
              </NavLink>
            )}
            <button
              onClick={() => setPwdModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all font-bold text-sm"
            >
              <Key size={20} />
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all font-bold text-sm"
            >
            <LogOut size={20} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar for mobile */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500">
              <Menu size={24} />
            </button>
            <h1 className="font-emphatic text-xl tracking-widest text-brand-mint mt-1">BELLE FORET</h1>
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
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Key className="text-brand-mint" size={24} /> 비밀번호 변경
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">현재 접속된 계정 ({userEmail})의 비밀번호를 새로 설정합니다.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">새 비밀번호 (6자리 이상)</label>
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
                className="w-full py-3 bg-brand-mint text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 mt-4"
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
