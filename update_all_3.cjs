const fs = require('fs');

let mCode = fs.readFileSync('src/pages/AdminMapping.tsx', 'utf8');
mCode = mCode.replace("import { secureFetcher } from '../lib/secureFetcher';", "import { secureFetcher } from '../lib/secureFetcher';\nimport { ErrorBoundary } from '../components/ErrorBoundary';");
mCode = mCode.replace("const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');", "const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');\n  const [apiError, setApiError] = useState<Error | null>(null);");
mCode = mCode.replace(/catch \(err\) \{\n\s*console.error\('Failed to fetch ROOM_SEGMENT mapping:', err\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed to fetch ROOM_SEGMENT mapping:', err);\n      setApiError(new Error(err.message || 'API Server Error'));\n    } finally");
mCode = mCode.replace(/catch \(err\) \{\n\s*console.error\('Failed to update room segment mapping:', err\);\n\s*alert\('세그먼트 반영 중 오류가 발생했습니다.'\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed to update room segment mapping:', err);\n      setApiError(new Error(err.message || 'API Server Error'));\n    } finally");
mCode = mCode.replace(/catch \(err\) \{\n\s*console.error\('Failed bulk confirmation:', err\);\n\s*alert\('일괄 승인 중 오류가 발생했습니다.'\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed bulk confirmation:', err);\n      setApiError(new Error(err.message || 'API Server Error'));\n    } finally");
mCode = mCode.replace("return (\n    <div className=\"flex flex-col h-full bg-slate-900\">", "if (apiError) throw apiError;\n\n  return (\n    <ErrorBoundary>\n      <div className=\"flex flex-col h-full bg-slate-900\">");
mCode = mCode.replace("</div>\n  );\n}", "</div>\n    </ErrorBoundary>\n  );\n}");
fs.writeFileSync('src/pages/AdminMapping.tsx', mCode, 'utf8');

let dCode = fs.readFileSync('src/pages/AdminDaolRules.tsx', 'utf8');
dCode = dCode.replace("import { secureFetcher } from '../lib/secureFetcher';", "import { secureFetcher } from '../lib/secureFetcher';\nimport { ErrorBoundary } from '../components/ErrorBoundary';");
dCode = dCode.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [apiError, setApiError] = useState<Error | null>(null);");
dCode = dCode.replace(/catch \(err\) \{\n\s*console.error\(err\);\n\s*\} finally/, "catch (err: any) {\n        console.error(err);\n        setApiError(new Error(err.message || 'API Server Error'));\n      } finally");
dCode = dCode.replace("return (\n    <div className=\"p-4 lg:p-8 space-y-8 max-w-5xl mx-auto\">", "if (apiError) throw apiError;\n\n  if (!loading && rules.length === 0) {\n    return (\n      <div className=\"flex items-center justify-center h-full min-h-[500px] w-full bg-slate-900 p-8\">\n        <div className=\"bg-rose-950/40 border border-rose-500/50 rounded-xl p-8 max-w-2xl w-full flex flex-col items-center justify-center text-center shadow-2xl\">\n          <h2 className=\"text-2xl font-black text-rose-500 mb-4 tracking-tight\">데이터 동기화 실패: 안분 룰 데이터가 유실(또는 미응답)되었습니다</h2>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <ErrorBoundary>\n      <div className=\"p-4 lg:p-8 space-y-8 max-w-5xl mx-auto\">");
dCode = dCode.replace("</div>\n  );\n}", "</div>\n    </ErrorBoundary>\n  );\n}");
fs.writeFileSync('src/pages/AdminDaolRules.tsx', dCode, 'utf8');