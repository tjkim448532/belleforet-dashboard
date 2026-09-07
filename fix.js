const fs = require('fs');
const file = 'src/components/dashboard/V6DashboardViewer.tsx';
let content = fs.readFileSync(file, 'utf8');

const colorConfig = \
const DIV_COLORS = [
  { row: "hover:bg-slate-50 transition-colors", divCell: "bg-slate-50", partCell: "bg-slate-50/50", partSubRow: "bg-slate-50", divSubRow: "bg-slate-100" },
  { row: "bg-blue-50/30 hover:bg-blue-50/80 transition-colors", divCell: "bg-blue-50", partCell: "bg-blue-50/50", partSubRow: "bg-blue-50/80", divSubRow: "bg-blue-100/80" },
  { row: "bg-emerald-50/30 hover:bg-emerald-50/80 transition-colors", divCell: "bg-emerald-50", partCell: "bg-emerald-50/50", partSubRow: "bg-emerald-50/80", divSubRow: "bg-emerald-100/80" },
  { row: "bg-amber-50/30 hover:bg-amber-50/80 transition-colors", divCell: "bg-amber-50", partCell: "bg-amber-50/50", partSubRow: "bg-amber-50/80", divSubRow: "bg-amber-100/80" },
  { row: "bg-purple-50/30 hover:bg-purple-50/80 transition-colors", divCell: "bg-purple-50", partCell: "bg-purple-50/50", partSubRow: "bg-purple-50/80", divSubRow: "bg-purple-100/80" },
];
\;

content = content.replace('export default function V6DashboardViewer', colorConfig + 'export default function V6DashboardViewer');

content = content.replace('{data.divisions.map((division, divIdx) => {', \{data.divisions.map((division, divIdx) => {
            const theme = DIV_COLORS[divIdx % DIV_COLORS.length];\);

content = content.replace(/<tr key=\\{[^{}]+\\} className="hover:bg-slate-50 transition-colors">/g, 
  '<tr key={\div-\-part-\-ven-\\} className={theme.row}>');

content = content.replace(/className="px-4 py-3 bg-slate-50 font-extrabold/g, 
  'className={\px-4 py-3 \ font-extrabold');

content = content.replace(/className="px-4 py-3 bg-slate-50\\/50 font-bold/g, 
  'className={\px-4 py-3 \ font-bold');

content = content.replace(/<tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">/g, 
  '<tr className={\\ text-slate-800 font-bold border-b border-slate-300\}>');

content = content.replace(/<tr className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">/g, 
  '<tr className={\\ text-slate-900 font-bold border-b-2 border-slate-300\}>');

// Fix the trailing quote logic since we replaced only part of className
content = content.replace(/tracking-wider">/g, 'tracking-wider\}>');
content = content.replace(/tracking-wide">/g, 'tracking-wide\}>');

fs.writeFileSync(file, content, 'utf8');