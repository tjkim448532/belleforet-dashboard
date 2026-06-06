import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Menu, X, LayoutDashboard, ShieldCheck, 
  ChevronDown, ChevronRight, Briefcase, Building, Hotel, Ticket 
} from 'lucide-react';

export default function Layout() {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leisureOpen, setLeisureOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: '전사 종합 매출', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: '경영지원실', path: '#경영지원실', icon: <Briefcase size={20} /> },
    { name: '세일즈본부', path: '#세일즈본부', icon: <Building size={20} /> },
    { name: '콘도', path: '#콘도', icon: <Hotel size={20} /> },
  ];

  const leisureItems = [
    '목장', '미디어아트센터', '썸머랜드', '원더풀', 
    '사계절썰매', '마리나클럽', '미니포렛', '그랜드포렛', '놀이동산'
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
          
          {menuItems.map((item, idx) => (
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

          {/* 레져본부 Accordion */}
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
                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-500 hover:text-brand-mint hover:bg-brand-mint/5 rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); }}
                  >
                    {subItem}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
          
        <div className="p-4 space-y-2 border-t border-slate-100">
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
    </div>
  );
}
