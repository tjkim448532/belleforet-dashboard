import React from 'react';
import DailySalesReport from '../../components/DailySalesReport';

export default function DaolDepartment() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">다올 매출 상세</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            레저, 골프, 콘도/객실, 식음(F&B) 부서의 상세 실적을 확인합니다.
          </p>
        </div>
      </div>
      
      <DailySalesReport />
    </div>
  );
}
