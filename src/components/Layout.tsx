import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LogOut, Moon, Sun, Menu, X, LayoutDashboard
} from 'lucide-react';

export default function Layout() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: '전사 종합 매출', path: '/', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#0a0f16] text-slate-900 dark:text-slate-100 flex transition-colors duration-300 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - McKinsey Style (Deep Navy, sharp) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#002855] text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col border-r border-[#001f42]`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <h2 className="text-xl font-bold tracking-widest">BELLEFORET</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-white/50 mb-4 px-2 tracking-widest uppercase">Dashboards</div>
          {menuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white border-l-4 border-blue-400'
                  : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors border-l-4 border-transparent"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 font-medium text-red-400 hover:bg-red-500/10 transition-colors border-l-4 border-transparent"
          >
            <LogOut size={20} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar for mobile */}
        <header className="lg:hidden h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg tracking-widest text-[#002855] dark:text-white">BELLEFORET</h1>
          </div>
          <button onClick={toggleTheme} className="text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="w-full h-full p-4 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
