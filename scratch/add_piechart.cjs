const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/Home.tsx');
let content = fs.readFileSync(file, 'utf-8');

if (!content.includes('import { PieChart')) {
  content = content.replace(
    `import { CalendarDays, Building2, Coins, AlertCircle } from 'lucide-react';`,
    `import { CalendarDays, Building2, Coins, AlertCircle } from 'lucide-react';\nimport { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';`
  );
}

const pieChartJSX = `            {/* 3D Pie Chart (HQ Distribution) */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 min-h-[350px]">
              <h2 className="text-base font-bold text-slate-800 mb-8 flex items-center gap-2">
                🥧 실시간 본부별 매출 비중
              </h2>
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dynamicHqToday.sort((a, b) => b.actual - a.actual)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="actual"
                      nameKey="hq"
                      stroke="none"
                      style={{ filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.15))' }}
                    >
                      {dynamicHqToday.map((entry, index) => (
                        <Cell key={\`cell-\${index}\`} fill={['#14b8a6', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fun Fact / Character Area */}`;

if (!content.includes('🥧 실시간 본부별 매출 비중')) {
  content = content.replace(`{/* Fun Fact / Character Area */}`, pieChartJSX);
}

fs.writeFileSync(file, content);
console.log('PieChart successfully patched in Home.tsx');
