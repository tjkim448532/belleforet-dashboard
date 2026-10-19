import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, ShieldCheck, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, limit, writeBatch, doc } from 'firebase/firestore';

interface LogEntry {
  email: string;
  timestamp: string;
}

export default function AdminLogs() {
  const [loginLogs, setLoginLogs] = useState<LogEntry[]>([]);
  const [loadingLogin, setLoadingLogin] = useState(true);

  useEffect(() => {
    const fetchLoginLogs = async () => {
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
        setLoginLogs(fetchedLogs);
      } catch (e) {
        console.error("Error fetching logs from Firebase:", e);
        const savedLogs = JSON.parse(localStorage.getItem('superAdminLoginLogs') || '[]');
        setLoginLogs(savedLogs.reverse());
      } finally {
        setLoadingLogin(false);
      }
    };

    fetchLoginLogs();
  }, []);

  const clearLoginLogs = async () => {
    if (confirm('모든 접속 로그를 데이터베이스(Firestore)에서 완전히 삭제하시겠습니까? (복구 불가능)')) {
      try {
        const q = query(collection(db, 'loginLogs'));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(doc(db, 'loginLogs', document.id));
        });
        
        await batch.commit();
        setLoginLogs([]);
        alert('모든 접속 로그가 성공적으로 영구 삭제되었습니다.');
      } catch (error) {
        console.error('Error deleting logs:', error);
        alert('로그 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#284F42] p-6 text-white flex items-center justify-between border-b border-[#1B382E]">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[#5FB878]" size={28} />
          <div>
            <h1 className="text-xl font-bold mb-1 flex items-center gap-2 break-keep whitespace-nowrap">
              임직원 접속 및 보안 로그 <ShieldCheck size={18} className="text-[#5FB878] shrink-0" />
            </h1>
            <p className="text-white/75 text-xs">
              대시보드 로그인 이력 및 접근 계정을 모니터링합니다. (백엔드 V6 API 완전연동 완료)
            </p>
          </div>
        </div>
        <button 
          onClick={clearLoginLogs} 
          className="flex items-center gap-2 bg-[#8B2635]/80 hover:bg-[#8B2635] text-white px-4 py-2 rounded-xl transition-colors font-bold text-xs border border-white/20 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <Trash2 size={14} /> 접속 로그 전체 초기화
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#F4F3EE] border-b border-[#D0C6BB]/60 p-4 text-xs text-[#5A6B63] flex items-center justify-between whitespace-nowrap">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Users size={16} className="text-[#284F42] shrink-0" />
          <span>최근 100건의 임직원 접속 로그를 실시간으로 기록합니다.</span>
        </div>
        <span className="font-bold text-[#1B382E] whitespace-nowrap">총 {loginLogs.length}건 기록됨</span>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-auto bg-white">
        {loadingLogin ? (
          <div className="flex items-center justify-center h-64 text-[#5A6B63] font-medium animate-pulse">
            접속 로그를 불러오는 중입니다...
          </div>
        ) : loginLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#5A6B63] text-sm gap-2">
            <ShieldCheck size={32} className="text-[#D0C6BB]" />
            <span>기록된 접속 로그가 없습니다.</span>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#1B382E] whitespace-nowrap min-w-[500px]">
            <thead className="bg-[#F4F3EE] sticky top-0 border-b border-[#D0C6BB]/75 text-[#1B382E] text-xs font-bold">
              <tr>
                <th className="p-4 w-20 text-center whitespace-nowrap">번호</th>
                <th className="p-4 text-left whitespace-nowrap">접속 임직원 이메일 계정</th>
                <th className="p-4 w-64 text-right whitespace-nowrap">접속 일시 (KST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0C6BB]/30">
              {loginLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                  <td className="p-4 text-center font-bold text-[#5A6B63] text-xs">{loginLogs.length - idx}</td>
                  <td className="p-4 font-bold text-[#1B382E]">{log.email}</td>
                  <td className="p-4 font-mono text-[#5A6B63] text-xs text-right">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
