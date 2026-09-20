const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const oldTrevBlock = `<div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">객실당 총매출 (TrevPOR)</div>
                  {(() => {
                    const trevPor = (coreData.core?.summary?.trevPOR && Number(coreData.core.summary.trevPOR) > 0) ? Number(coreData.core.summary.trevPOR)
                                  : displayData?.kpiMetrics?.trevPOR;
                    return trevPor !== undefined && trevPor !== null && Number(trevPor) > 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {formatCurrency(trevPor)} <span className="text-sm font-medium text-slate-500">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          리조트 총매출 ÷ 실측 판매 객실
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        TrevPOR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>`;

const newTrevBlock = `<div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center h-[130px] shadow-sm hover:shadow-md transition-all bg-gradient-to-b from-white to-slate-50">
                  <div className="text-sm text-slate-700 font-medium mb-1">가용객실당 총매출 (TrevPAR)</div>
                  {(() => {
                    const trevPar = (coreData.core?.summary?.trevPAR && Number(coreData.core.summary.trevPAR) > 0) ? Number(coreData.core.summary.trevPAR)
                                  : displayData?.kpiMetrics?.trevPAR;
                    return trevPar !== undefined && trevPar !== null && Number(trevPar) > 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {formatCurrency(trevPar)} <span className="text-sm font-medium text-slate-500">원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          물리적 전체 가용 객실 1실당 창출한 리조트 전체 총매출입니다.
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium h-full flex flex-col justify-center">
                        TrevPAR 산출 불가<br/>(API 연동 대기)
                      </div>
                    );
                  })()}
                </div>`;

code = code.replace(oldTrevBlock, newTrevBlock);
fs.writeFileSync('src/pages/Home.tsx', code);
