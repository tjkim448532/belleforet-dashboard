const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminMapping.tsx', 'utf8');

// Import ErrorBoundary
if (!code.includes('ErrorBoundary')) {
  code = code.replace(/import \{ secureFetcher \} from '\.\.\/lib\/secureFetcher';/, "import { secureFetcher } from '../lib/secureFetcher';\nimport { ErrorBoundary } from '../components/ErrorBoundary';");
}

// Add state
if (!code.includes('const [apiError')) {
  code = code.replace(/const \[viewMode, setViewMode\] = useState<'KANBAN' \| 'TABLE'>\('KANBAN'\);/, "const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');\n  const [apiError, setApiError] = useState<Error | null>(null);");
}

// Modify try-catch block 1
code = code.replace(/catch \(err\) \{\n\s*console.error\('Failed to fetch ROOM_SEGMENT mapping:', err\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed to fetch ROOM_SEGMENT mapping:', err);\n      setApiError(new Error(err.message || 'API 통신 중 오류가 발생했습니다.'));\n    } finally");

// Modify try-catch block 2
code = code.replace(/catch \(err\) \{\n\s*console.error\('Failed to update room segment mapping:', err\);\n\s*alert\('세그먼트 반영 중 오류가 발생했습니다.'\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed to update room segment mapping:', err);\n      setApiError(new Error(err.message || '세그먼트 반영 중 오류가 발생했습니다.'));\n    } finally");

// Modify try-catch block 3
code = code.replace(/catch \(err\) \{\n\s*console.error\('Failed bulk confirmation:', err\);\n\s*alert\('일괄 승인 중 오류가 발생했습니다.'\);\n\s*\} finally/, "catch (err: any) {\n      console.error('Failed bulk confirmation:', err);\n      setApiError(new Error(err.message || '일괄 승인 중 오류가 발생했습니다.'));\n    } finally");

// Add render block
if (!code.includes('if (apiError) throw apiError;')) {
  code = code.replace(/return \(\n\s*<div className="flex flex-col h-full bg-slate-900">/, "if (apiError) throw apiError;\n\n  return (\n    <ErrorBoundary>\n      <div className=\"flex flex-col h-full bg-slate-900\">");
  code = code.replace(/<\/div>\n\s*\);\n\}/, "      </div>\n    </ErrorBoundary>\n  );\n}");
}

fs.writeFileSync('src/pages/AdminMapping.tsx', code, 'utf8');