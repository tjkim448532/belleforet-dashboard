import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calculator, Database, ShieldCheck } from 'lucide-react';

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { name: '매출 시뮬레이터', path: '/admin/simulator', icon: <Calculator size={20} /> },
    { name: '매장 분류 매핑 관리', path: '/admin/mapping', icon: <Database size={20} /> },
    { name: '접속 로그 모니터링', path: '/admin/logs', icon: <ShieldCheck size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-6">
          <div className="flex items-center gap-2 text-brand-mint mb-2">
            <ShieldCheck size={24} />
            <span className="font-emphatic text-xl tracking-widest">ADMIN</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">최고 경영진 전용 센터</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  isActive
                    ? 'bg-brand-mint text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700"
          >
            <LayoutDashboard size={20} />
            일반 대시보드로 복귀
          </NavLink>
        </div>
      </aside>

      {/* Admin Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
