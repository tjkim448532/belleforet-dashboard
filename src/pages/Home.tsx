import React from 'react';

export default function Home() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">전사 종합 매출</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            벨포레 전사의 핵심 KPI 현황 및 종합 대시보드입니다.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Placeholder cards */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 rounded-2xl glass-panel-light dark:glass-panel-dark shadow-sm">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4"></div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
      
      <div className="h-96 rounded-2xl glass-panel-light dark:glass-panel-dark flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm border border-dashed border-slate-300 dark:border-slate-700">
        전사 종합 지표 시각화 영역 (준비중)
      </div>
    </div>
  );
}
