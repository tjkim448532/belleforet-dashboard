import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, LayoutDashboard, Calculator } from 'lucide-react';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: '전사 종합 매출', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: '매출 시뮬레이터', path: '/simulator', icon: <Calculator size={20} /> },
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
                isActive
                  ? 'bg-brand-mint/10 text-brand-mint'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
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
