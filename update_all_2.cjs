const fs = require('fs');

// 1. Fix AdminMapping.tsx
let mCode = fs.readFileSync('src/pages/AdminMapping.tsx', 'utf8');
if (!mCode.includes('if (apiError) throw apiError;')) {
  mCode = mCode.replace('<div className="flex flex-col h-full bg-slate-900">', "if (apiError) throw apiError;\n\n  return (\n    <ErrorBoundary>\n      <div className=\"flex flex-col h-full bg-slate-900\">");
  mCode = mCode.replace("</div>\r\n    </ErrorBoundary>", ""); // Cleanup if accidentally messed up
  mCode = mCode.substring(0, mCode.lastIndexOf('</div>')) + "</div>\n    </ErrorBoundary>\n  );\n}";
}
fs.writeFileSync('src/pages/AdminMapping.tsx', mCode, 'utf8');

// 2. Fix AdminDaolRules.tsx
let dCode = fs.readFileSync('src/pages/AdminDaolRules.tsx', 'utf8');
if (!dCode.includes('데이터 동기화 실패')) {
  dCode = dCode.replace('<div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">', "if (apiError) throw apiError;\n\n  if (!loading && rules.length === 0) {\n    return (\n      <div className=\"flex items-center justify-center h-full min-h-[500px] w-full bg-slate-900 p-8\">\n        <div className=\"bg-rose-950/40 border border-rose-500/50 rounded-xl p-8 max-w-2xl w-full flex flex-col items-center justify-center text-center shadow-2xl\">\n          <h2 className=\"text-2xl font-black text-rose-500 mb-4 tracking-tight\">데이터 동기화 실패: 안분 룰 데이터가 유실(또는 미응답)되었습니다</h2>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <ErrorBoundary>\n      <div className=\"p-4 lg:p-8 space-y-8 max-w-5xl mx-auto\">");
  dCode = dCode.substring(0, dCode.lastIndexOf('</div>')) + "</div>\n    </ErrorBoundary>\n  );\n}";
}
fs.writeFileSync('src/pages/AdminDaolRules.tsx', dCode, 'utf8');