import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Database, ListOrdered, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, limit, writeBatch, doc } from 'firebase/firestore';

interface LogEntry {
  email: string;
  timestamp: string;
}

interface SyncLogEntry {
  job_id: string;
  status: string;
  room_synced: number;
  pos_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  s3_total_net: number | null;
  db_total_net: number | null;
}

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState<'login' | 'sync'>('sync');
  
  const [loginLogs, setLoginLogs] = useState<LogEntry[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  
  const [loadingLogin, setLoadingLogin] = useState(true);
  const [loadingSync, setLoadingSync] = useState(true);

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

    const fetchSyncLogs = async () => {
      try {
        const response = await fetch('https://belleforet-data.vercel.app/api/logs', {
          headers: {
            'Authorization': 'Bearer belleforet-secret-token'
          }
        });
        const data = await response.json();
        if (data.success) {
          setSyncLogs(data.logs);
        } else {
          console.error("Failed to fetch sync logs:", data.error);
        }
      } catch (e) {
        console.error("Error fetching sync logs:", e);
      } finally {
        setLoadingSync(false);
      }
    };

    fetchLoginLogs();
    fetchSyncLogs();
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
        alert('모든 로그가 성공적으로 영구 삭제되었습니다.');
      } catch (error) {
        console.error('Error deleting logs:', error);
        alert('로그 삭제에 실패했습니다. (방화벽 문제일 수 있습니다.)');
      }
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
              시스템 감시 및 로그 <Database size={16} className="text-emerald-400" />
            </h1>
            <p className="text-white/60 text-xs">접속 기록 및 S3 데이터 동기화 파이프라인 무결성을 모니터링합니다.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sync' ? 'border-brand-mint text-brand-mint bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ListOrdered size={18} />
          데이터 동기화 (파이프라인)
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'login' ? 'border-brand-mint text-brand-mint bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert size={18} />
          시스템 접속 로그
        </button>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-0 bg-slate-50">
        {activeTab === 'login' && (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex justify-end">
              <button onClick={clearLoginLogs} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors font-bold text-sm shadow-sm border border-red-200">
                <Trash2 size={16} /> 접속 로그 전체 초기화
              </button>
            </div>
            {loadingLogin ? (
              <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">불러오는 중...</div>
            ) : loginLogs.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400 font-bold">접속 로그가 없습니다.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600 bg-white">
                <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                  <tr>
                    <th className="p-4 w-16 text-center">No.</th>
                    <th className="p-4">접속 이메일 주소</th>
                    <th className="p-4 w-64 text-right">접속 일시 (KST)</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{loginLogs.length - idx}</td>
                      <td className="p-4 font-bold text-slate-700">{log.email}</td>
                      <td className="p-4 font-mono text-slate-500 text-right">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'sync' && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm leading-relaxed flex gap-3">
              <ShieldAlert className="text-blue-500 shrink-0" size={20} />
              <div>
                <strong className="block mb-1">무결성 검증 알림</strong>
                파이프라인이 S3 엑셀 양식 변경 등을 감지하면, 즉시 '오류(FAILED)' 처리하고 쓰레기 데이터 적재를 차단합니다.<br/>
                오류 발생 시 상세 원인(error_message)을 확인하고 원본 파일을 수정해주세요.
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingSync ? (
                <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">불러오는 중...</div>
              ) : syncLogs.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400 font-bold">동기화 로그가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-4 font-semibold whitespace-nowrap">상태 (정합성)</th>
                        <th className="p-4 font-semibold whitespace-nowrap">작업 시작 시간</th>
                        <th className="p-4 font-semibold whitespace-nowrap text-right">S3 산출 총액</th>
                        <th className="p-4 font-semibold whitespace-nowrap text-right">DB 적재 총액</th>
                        <th className="p-4 font-semibold w-1/3">오류 내용 (상세)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {syncLogs.map((log) => (
                        <tr key={log.job_id} className="hover:bg-slate-50">
                          <td className="p-4">
                            {log.status === 'SUCCESS' ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                                <CheckCircle2 size={14} /> 성공 (일치)
                              </div>
                            ) : log.status === 'FAILED_VALIDATION' ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs">
                                <XCircle size={14} /> 검증 실패
                              </div>
                            ) : log.status === 'FAILED' ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs">
                                <XCircle size={14} /> 에러 (차단됨)
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs animate-pulse">
                                진행중
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.started_at).toLocaleString('ko-KR')}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-700">
                            {log.s3_total_net != null ? `${Number(log.s3_total_net).toLocaleString()}원` : '-'}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-700">
                            {log.db_total_net != null ? `${Number(log.db_total_net).toLocaleString()}원` : '-'}
                          </td>
                          <td className="p-4">
                            {log.error_message ? (
                              <span className="text-red-600 text-xs font-semibold break-keep">{log.error_message}</span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
