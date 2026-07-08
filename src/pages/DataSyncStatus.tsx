import React, { useEffect, useState } from 'react';
import { RefreshCw, Database, Activity, Server, FileBox, CalendarRange, CheckCircle2 } from 'lucide-react';

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

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://belleforet-data.vercel.app/api/v5/etl/logs');
      if (!response.ok) throw new Error('Failed to fetch data sync status');
      
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setLogs(data.data);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('en-US', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0'));
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

  const totalRecords = logs.reduce((sum, log) => sum + log.record_count, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 font-sans">
      
      {/* Header Section - High-tech Financial Look */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium tracking-widest uppercase">System Online</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider">NODE: AWS-RDS-APNE2</div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
            DATA WAREHOUSE <span className="text-slate-600 mx-3">/</span> <span className="text-blue-400 font-light">SYNC STATUS</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Last Sync Check</p>
            <p className="text-sm font-mono text-slate-300 bg-slate-900 px-3 py-1 border border-slate-800 rounded-md">
              {lastUpdated || 'WAITING...'}
            </p>
          </div>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-medium tracking-widest uppercase">Force Sync</span>
          </button>
        </div>
      </div>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border-l-2 border-blue-500 border-y border-r border-slate-800 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Database className="w-16 h-16" />
          </div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mb-1">Active Data Nodes</p>
          <p className="text-3xl font-light font-mono text-white">{logs.length}<span className="text-sm text-slate-500 ml-2">FILES</span></p>
        </div>
        
        <div className="bg-slate-900/80 border-l-2 border-purple-500 border-y border-r border-slate-800 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity className="w-16 h-16" />
          </div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mb-1">Total Records Synced</p>
          <p className="text-3xl font-light font-mono text-white">{totalRecords.toLocaleString()}<span className="text-sm text-slate-500 ml-2">ROWS</span></p>
        </div>

        <div className="bg-slate-900/80 border-l-2 border-emerald-500 border-y border-r border-slate-800 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Server className="w-16 h-16" />
          </div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mb-1">Storage Status</p>
          <p className="text-3xl font-light font-mono text-emerald-400">OPTIMAL</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-sm flex items-start space-x-3">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 animate-pulse" />
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 bg-slate-900/50 border border-slate-800">
          <div className="w-48 h-1 bg-slate-800 overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 w-1/3" 
              style={{ animation: 'slide 1.5s ease-in-out infinite' }}
            />
            <style>{`
              @keyframes slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
              }
            `}</style>
          </div>
          <p className="text-xs font-mono text-blue-400 mt-4 tracking-widest">ESTABLISHING SECURE CONNECTION...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 bg-slate-900/50 border border-slate-800 text-slate-500">
          <Database className="w-10 h-10 mb-4 opacity-20" />
          <p className="text-xs font-mono tracking-widest">NO SYNCED DATA FOUND</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition-colors group relative flex flex-col"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <FileBox className="w-5 h-5 text-blue-400/70" />
                    </div>
                    <div>
                      <h3 className="text-sm text-slate-200 font-medium tracking-wide">
                        {getFileName(log.source_file_name)}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                        {log.source_file_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20 mb-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-medium tracking-wider">SYNCED</span>
                    </div>
                    <span className="text-2xl font-light font-mono text-white tabular-nums">
                      {log.record_count.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 tracking-widest uppercase">Rows Processed</span>
                  </div>
                </div>

                {/* Timeline Visualization */}
                <div className="mt-auto pt-5 border-t border-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center">
                      <CalendarRange className="w-3 h-3 mr-1.5" /> Data Horizon
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      LOADED: {formatDate(log.upload_date)}
                    </span>
                  </div>
                  
                  <div className="relative pt-2 pb-1">
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-blue-500/40 w-full" />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs font-mono text-blue-300">{formatDate(log.min_date)}</span>
                      <span className="text-[10px] text-slate-600">➔</span>
                      <span className="text-xs font-mono text-purple-300">{formatDate(log.max_date)}</span>
                    </div>
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
