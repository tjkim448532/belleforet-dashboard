import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[500px] w-full bg-slate-900 p-8">
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-8 max-w-2xl w-full flex flex-col items-center justify-center text-center shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
            <h2 className="text-2xl font-black text-rose-500 mb-4 tracking-tight">[API Server Error: 시스템 정지 및 원인]</h2>
            <div className="text-rose-200 bg-rose-950/80 p-4 rounded-lg w-full overflow-auto text-left font-mono text-sm border border-rose-800 break-words">
              {this.state.error?.message || '알 수 없는 서버 통신 에러가 발생했습니다.'}
            </div>
            <button 
              className="mt-8 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition-colors shadow-lg"
              onClick={() => window.location.reload()}
            >
              화면 새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
