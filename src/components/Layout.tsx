import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LogOut, Moon, Sun, Menu, X, LayoutDashboard, 
  TrendingUp, BarChart3, PieChart
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
    { name: '다올 매출 상세', path: '/daol', icon: <TrendingUp size={20} /> },
    { name: '객실 부문 (준비중)', path: '/rooms', icon: <BarChart3 size={20} />, disabled: true },
    { name: 'F&B 부문 (준비중)', path: '/fnb', icon: <PieChart size={20} />, disabled: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel-light dark:glass-panel-dark transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BELLEFORET</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 mb-4 px-2 tracking-wider">DASHBOARDS</div>
          {menuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.disabled ? '#' : item.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                item.disabled 
                  ? 'opacity-50 cursor-not-allowed text-slate-500'
                  : isActive && item.path !== '#'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              onClick={() => { if (!item.disabled) setSidebarOpen(false); }}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar for mobile */}
        <header className="lg:hidden h-16 glass-panel-light dark:glass-panel-dark flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg">BELLEFORET</h1>
          </div>
          <button onClick={toggleTheme} className="text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100/50 dark:bg-[#0B0F19]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
