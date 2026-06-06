import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';

interface LogEntry {
  email: string;
  timestamp: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const savedLogs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
    // 최신 접속이 위로 오도록 역순 정렬
    setLogs(savedLogs.reverse());
  }, []);

  const clearLogs = () => {
    if (confirm('모든 접속 로그를 삭제하시겠습니까?')) {
      localStorage.removeItem('superAdminLoginLogs');
      setLogs([]);
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-8 h-[calc(100vh-140px)]">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-400" size={28} />
          <div>
            <h1 className="text-xl font-bold mb-1">슈퍼 관리자 전용: 시스템 접속 로그</h1>
            <p className="text-white/60 text-xs">최근 로그인한 임직원의 접속 기록을 모니터링합니다. 본 화면은 외부에 절대 노출되지 않습니다.</p>
          </div>
        </div>
        <button onClick={clearLogs} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-xl transition-colors font-bold text-sm">
          <Trash2 size={16} /> 로그 초기화
        </button>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-0">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-bold">
            아직 기록된 접속 로그가 없습니다.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
              <tr>
                <th className="p-4 w-16 text-center">No.</th>
                <th className="p-4">접속 이메일 주소</th>
                <th className="p-4 w-64 text-right">접속 일시 (KST)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-bold text-slate-400">{logs.length - idx}</td>
                  <td className="p-4 font-bold text-slate-700">{log.email}</td>
                  <td className="p-4 font-mono text-slate-500 text-right">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
