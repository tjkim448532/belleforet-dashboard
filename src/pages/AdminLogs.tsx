import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Database } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';

interface LogEntry {
  email: string;
  timestamp: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'loginLogs'), orderBy('timestamp', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const fetchedLogs: LogEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedLogs.push({
            email: data.email,
            timestamp: data.localTimeStr || new Date(data.timestamp?.toDate()).toLocaleString('ko-KR')
          });
        });
        setLogs(fetchedLogs);
      } catch (e) {
        console.error("Error fetching logs from Firebase:", e);
        // Fallback to local storage if Firebase read fails
        const savedLogs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
        setLogs(savedLogs.reverse());
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const clearLogs = () => {
    if (confirm('모든 접속 로그를 삭제하시겠습니까? (현재 로컬 뷰에서만 삭제되며 DB에는 유지됩니다)')) {
      setLogs([]);
    }
  };

  return (
    <div className="w-full mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-400" size={28} />
          <div>
            <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
              시스템 접속 로그 모니터링 <Database size={16} className="text-emerald-400" />
            </h1>
            <p className="text-white/60 text-xs">Firebase Firestore와 실시간 연동되어 임직원 접속 기록을 추적합니다.</p>
          </div>
        </div>
        <button onClick={clearLogs} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-xl transition-colors font-bold text-sm">
          <Trash2 size={16} /> 화면 지우기
        </button>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-bold animate-pulse">
            Firebase에서 로그를 불러오는 중...
          </div>
        ) : logs.length === 0 ? (
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
