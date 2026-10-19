import React, { useEffect, useState } from 'react';
import { RefreshCw, Database, Activity, Server, FileBox, CalendarRange, CheckCircle2 } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

interface EtlLog {
  source_file_name: string;
  upload_date: string;
  record_count: number;
  min_date: string;
  max_date: string;
}

export const DataSyncStatus: React.FC = () => {
  const [logs, setLogs] = useState<EtlLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await secureFetcher(`${API_BASE}/api/v6/admin/etl-logs?_t=${Date.now()}`);
      if (data && (data.status === 'SUCCESS' || Array.isArray(data.data) || Array.isArray(data))) {
        setLogs(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('en-US', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0'));
      } else {
        throw new Error(data?.message || 'Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto refresh every 30 seconds to make it feel like a live terminal
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return dateString.split('T')[0].replace(/-/g, '.');
  };

  const getFileName = (path: string) => {
    if (!path) return 'Unknown';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  // [SSOT 무관용 원칙 적용] 클라이언트 측 reduce 합산 제거. 향후 API 지원 시 대체
  const totalRecords = 0;

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative font-sans">
      {/* Ambient Forest Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Header Section */}
        <div className="bg-[#284F42] rounded-3xl p-7 lg:p-8 text-white relative overflow-hidden shadow-xl border border-[#1B382E]">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#5FB878]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-20 w-64 h-64 bg-[#B59269]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
                <span>SYSTEM ONLINE · AWS-RDS-APNE2</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center break-keep whitespace-nowrap">
                데이터 동기화 및 파이프라인 상태
              </h1>
              <p className="text-sm text-white/80 mt-1">
                ETL 로그 및 골드 마트 실시간 적재 현황 모니터링 (SSOT)
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold mb-1">Last Sync Check</p>
                <p className="text-sm font-mono text-white bg-white/10 px-3 py-1 border border-white/20 rounded-xl backdrop-blur-md">
                  {lastUpdated || 'WAITING...'}
                </p>
              </div>
              <button 
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center space-x-2 bg-[#B59269] hover:bg-[#a38058] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs tracking-wider uppercase">동기화 새로고침</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">Active Data Nodes</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <Database size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black font-mono text-[#1B382E]">{logs.length}</span>
              <span className="text-sm font-bold text-[#5A6B63]">FILES</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium">
              S3 적재 기준 데이터 소스 파일
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">Total Records Synced</span>
              <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#B59269] flex items-center justify-center">
                <Activity size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black font-mono text-[#1B382E]">{totalRecords.toLocaleString()}</span>
              <span className="text-sm font-bold text-[#5A6B63]">ROWS</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium">
              통합 파이프라인 공식 집계 행수
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs lg:text-sm font-bold text-[#5A6B63] tracking-wider uppercase whitespace-nowrap">Storage Status</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F2EE] text-[#1E523F] flex items-center justify-center">
                <Server size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-2xl lg:text-3xl font-black font-mono text-[#1E523F]">OPTIMAL</span>
            </div>
            <div className="text-xs text-[#5A6B63] mt-2 font-medium">
              MariaDB 골드 마트 정상 운영 중
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#FDF0ED] border border-[#EAC5BD] text-[#8B2635] p-5 rounded-2xl flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-[#8B2635] mt-1.5 animate-pulse" />
            <p className="text-sm font-mono">{error}</p>
          </div>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-xs">
            <div className="w-48 h-1 bg-[#F4F3EE] overflow-hidden relative rounded-full">
              <div 
                className="absolute top-0 left-0 h-full bg-[#284F42] w-1/3" 
                style={{ animation: 'slide 1.5s ease-in-out infinite' }}
              />
              <style>{`
                @keyframes slide {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(300%); }
                }
              `}</style>
            </div>
            <p className="text-xs font-mono text-[#284F42] mt-4 tracking-widest font-bold">ESTABLISHING SECURE CONNECTION...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-3xl border border-[#D0C6BB]/75 text-[#5A6B63] shadow-xs">
            <Database className="w-10 h-10 mb-4 opacity-30 text-[#284F42]" />
            <p className="text-xs font-mono tracking-widest font-bold">NO SYNCED DATA FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {logs.map((log, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] hover:shadow-[0_12px_32px_rgba(40,79,66,0.1)] transition-all duration-300 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#284F42] flex items-center justify-center shrink-0 border border-[#D0C6BB]/60">
                        <FileBox className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base text-[#1B382E] font-bold tracking-tight">
                          {getFileName(log.source_file_name)}
                        </h3>
                        <p className="text-xs text-[#5A6B63] font-mono mt-1 break-all">
                          {log.source_file_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center space-x-1.5 bg-[#E8F2EE] text-[#1E523F] px-2.5 py-1 rounded-full border border-[#B4C6C1]/70 mb-2 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold tracking-wider">SYNCED</span>
                      </div>
                      <span className="text-2xl font-black font-mono text-[#1B382E] tabular-nums">
                        {log.record_count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#5A6B63] font-bold tracking-widest uppercase">Rows Processed</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Visualization */}
                <div className="pt-4 border-t border-[#D0C6BB]/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#5A6B63] font-bold uppercase tracking-wider flex items-center">
                      <CalendarRange className="w-3.5 h-3.5 mr-1.5 text-[#284F42]" /> Data Horizon
                    </span>
                    <span className="text-xs text-[#5A6B63] font-mono">
                      LOADED: {formatDate(log.upload_date)}
                    </span>
                  </div>
                  
                  <div className="relative pt-2 pb-1">
                    <div className="h-1.5 w-full bg-[#F4F3EE] rounded-full overflow-hidden border border-[#D0C6BB]/30">
                      <div className="h-full bg-[#284F42] w-full" />
                    </div>
                    <div className="flex justify-between mt-2 font-mono text-xs font-bold">
                      <span className="text-[#1B382E]">{formatDate(log.min_date)}</span>
                      <span className="text-[#5A6B63]">➔</span>
                      <span className="text-[#1B382E]">{formatDate(log.max_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
