const fs = require('fs');
let content = fs.readFileSync('src/pages/ResortBusiness.tsx', 'utf8');

content = content.replace('channelBreakdown?: { facility_name: string; today_actual: number; qty?: number; visitors?: number; }[];', 'channelBreakdown?: { facility_name: string; today_actual: number; qty?: number; visitors?: number; }[];\n    rateTypeBreakdown?: { facility_name: string; today_actual: number; qty?: number; visitors?: number; }[];');
content = content.replace('channelBreakdown: payload.channelBreakdown || payload.marketTypeBreakdown || payload.segmentBreakdown || []', 'channelBreakdown: payload.channelBreakdown || payload.marketTypeBreakdown || payload.segmentBreakdown || [],\n            rateTypeBreakdown: payload.rateTypeBreakdown || []');
content = content.replace('channelBreakdown: []', 'channelBreakdown: [],\n            rateTypeBreakdown: []');

const rateAdrDataStr = `
  const rateAdrData = (() => {
    if (!data || !data.rateTypeBreakdown) return [];
    return data.rateTypeBreakdown.map(item => {
      const revenue = item.today_actual || 0;
      const sold = Number(item.visitors || item.qty || 0);
      return {
        rateType: item.facility_name,
        roomsSold: sold,
        totalRevenue: revenue,
        adr: sold > 0 ? Math.round(revenue / sold) : 0
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();
`;
content = content.replace('if (loading || !data) {', rateAdrDataStr + '\n  if (loading || !data) {');

const tableUi = `        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
              💰 판매채널별 객단가 분석
            </h2>
            {channelAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">판매 채널명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {channelAdrData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.channel}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 판매 채널 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
              💳 요금타입별 비중 및 객단가 (회원/비회원 분석)
            </h2>
            {rateAdrData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">요금 타입명</th>
                      <th className="py-3 px-4 text-right">판매 객실수</th>
                      <th className="py-3 px-4 text-right">총 매출액</th>
                      <th className="py-3 px-4 text-right">평균 객단가 (ADR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {rateAdrData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{row.rateType}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{row.roomsSold}실</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{formatCurrency(row.totalRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                해당 날짜의 요금타입 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>`;

content = content.replace(/\{\/\* Detailed Channel Table \*\/\}.*?해당 날짜의 객실 판매 채널 데이터가 없습니다\.\s*<\/div>\s*\)\}\s*<\/div>/s, tableUi);

fs.writeFileSync('src/pages/ResortBusiness.tsx', content);
