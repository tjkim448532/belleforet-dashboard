const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDaolRules.tsx', 'utf8');

if (!code.includes('if (apiError) throw apiError;')) {
  code = code.replace(/return \(\n\s*<div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">/, "if (apiError) throw apiError;\n\n  if (!loading && rules.length === 0) {\n    return (\n      <div className=\"flex items-center justify-center h-full min-h-[500px] w-full bg-slate-900 p-8\">\n        <div className=\"bg-rose-950/40 border border-rose-500/50 rounded-xl p-8 max-w-2xl w-full flex flex-col items-center justify-center text-center shadow-2xl\">\n          <AlertCircle className=\"w-16 h-16 text-rose-500 mb-4 animate-pulse\" />\n          <h2 className=\"text-2xl font-black text-rose-500 mb-4 tracking-tight\">데이터 동기화 실패: 안분 룰 데이터가 유실(또는 미응답)되었습니다</h2>\n          <button \n            className=\"mt-8 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition-colors shadow-lg\"\n            onClick={() => window.location.reload()}\n          >\n            화면 새로고침\n          </button>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <ErrorBoundary>\n      <div className=\"p-4 lg:p-8 space-y-8 max-w-5xl mx-auto\">");
  
  code = code.replace(/<\/div>\n\s*\);\n\}/, "      </div>\n    </ErrorBoundary>\n  );\n}");
}

// Import ErrorBoundary if needed
if (!code.includes('ErrorBoundary')) {
  code = code.replace(/import \{ secureFetcher \} from '\.\.\/lib\/secureFetcher';/, "import { secureFetcher } from '../lib/secureFetcher';\nimport { ErrorBoundary } from '../components/ErrorBoundary';");
}

// Add state
if (!code.includes('const [apiError')) {
  code = code.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [apiError, setApiError] = useState<Error | null>(null);");
}

// Fix fetchRules catch
code = code.replace(/catch \(err\) \{\n\s*console.error\(err\);\n\s*\} finally/, "catch (err: any) {\n        console.error(err);\n        setApiError(new Error(err.message || 'API 통신 중 오류가 발생했습니다.'));\n      } finally");

fs.writeFileSync('src/pages/AdminDaolRules.tsx', code, 'utf8');