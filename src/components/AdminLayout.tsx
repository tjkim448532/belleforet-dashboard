import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calculator, Database, ShieldCheck, Users, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  const [etlAlert, setEtlAlert] = useState<{ gap: number; msg: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      const fetchEtlStatus = async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/api/v3';
          const res = await fetch(`${API_BASE}/admin/system/etl-status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'SUCCESS' && data.data) {
              const gap = Number(data.data.ticket_gap) || 0;
              if (Math.abs(gap) >= 1000) {
                setEtlAlert({
                  gap,
                  msg: `[데이터 불일치 경고] 티켓 원천 데이터와 분배 결과 사이에 ${gap.toLocaleString()}원의 차이가 발생했습니다. 매핑 룰의 중복/누락을 확인하세요!`
                });
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch ETL status", e);
        }
      };
      fetchEtlStatus();
      // Polling every 30 seconds to keep admin updated
      const interval = setInterval(fetchEtlStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { name: '본부지정', path: '/admin/simulator', icon: <Calculator size={20} /> },
    { name: '매장 분류 매핑 관리', path: '/admin/mapping', icon: <Database size={20} /> },
    { name: '객실/티켓 패키지 분배 관리', path: '/admin/daol-rules', icon: <Calculator size={20} /> },
    { name: '레져본부 묶음 설정', path: '/admin/leisure-mapping', icon: <Database size={20} /> },
    { name: '접속 로그 모니터링', path: '/admin/logs', icon: <ShieldCheck size={20} /> },
    { name: '임직원 권한 관리', path: '/admin/roles', icon: <Users size={20} /> },
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
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700"
          >
            <LayoutDashboard size={20} />
            일반 대시보드로 복귀
          </NavLink>
        </div>
      </aside>

      {/* Admin Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {etlAlert && (
          <div className="bg-red-600 text-white p-4 shadow-md flex items-center justify-center gap-3 animate-pulse">
            <AlertTriangle size={24} className="text-yellow-300" />
            <span className="font-bold text-lg">{etlAlert.msg}</span>
          </div>
        )}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
