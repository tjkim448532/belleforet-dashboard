import React, { useEffect, useState } from 'react';
import { RefreshCw, FileText, Calendar, Database, AlertCircle } from 'lucide-react';

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

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // In production, ensure this points to the correct backend URL
      const response = await fetch('https://belleforet-data.vercel.app/api/v3/etl/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch data sync status');
      }
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setLogs(data.data);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getFileName = (path: string) => {
    if (!path) return 'Unknown';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">데이터 적재 현황 (Data Sync)</h1>
          <p className="text-gray-400 mt-1 flex items-center">
            <Database className="w-4 h-4 mr-1 text-blue-400" />
            다올(PMS)에서 전송된 S3 파일 파싱 및 적재 내역을 모니터링합니다.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-4 py-2 rounded-xl transition-all border border-blue-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur-xl text-gray-400">
          <Database className="w-12 h-12 mb-4 opacity-20" />
          <p>표시할 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:bg-slate-800/60 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-gray-200 font-semibold truncate max-w-[150px] sm:max-w-[200px]" title={log.source_file_name}>
                      {getFileName(log.source_file_name)}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{log.source_file_name}</p>
                  </div>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                  {log.record_count.toLocaleString()} 건
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    업로드/파싱일 (S3 ➔ DB)
                  </p>
                  <p className="text-sm text-gray-300 font-medium">
                    {formatDate(log.upload_date)}
                  </p>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-gray-500 mb-2 flex items-center">
                    <Database className="w-3.5 h-3.5 mr-1" />
                    실제 데이터 기간 (Date Range)
                  </p>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-blue-300">{formatDate(log.min_date)}</span>
                    <span className="text-gray-600 mx-2">➔</span>
                    <span className="text-purple-300">{formatDate(log.max_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
