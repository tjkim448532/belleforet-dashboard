const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/V6DashboardViewer.tsx', 'utf8');

content = content.replace(
  /const formatGrowth = \(num: number \| undefined \| null\) => \{/g, 
  `const formatGrowth = (num: number | undefined | null, actual?: number, ly?: number) => {\n  if (ly === 0 && actual && actual > 0) return <span className="text-red-500 font-bold">▲ 100.0%</span>;`
);

content = content.replace(/formatGrowth\(metrics\.todayGrowth\)/g, 'formatGrowth(metrics.todayGrowth, metrics.todayActual, metrics.todayLy)');
content = content.replace(/formatGrowth\(metrics\.mtdGrowth\)/g, 'formatGrowth(metrics.mtdGrowth, metrics.mtdActual, metrics.mtdLy)');
content = content.replace(/formatGrowth\(metrics\.ytdGrowth\)/g, 'formatGrowth(metrics.ytdGrowth, metrics.ytdActual, metrics.ytdLy)');

content = content.replace(/formatGrowth\(part\.partSubtotal\?\.todayGrowth \|\| part\.part_subtotal\?\.todayGrowth\)/g, 'formatGrowth(part.partSubtotal?.todayGrowth || part.part_subtotal?.todayGrowth, part.partSubtotal?.todayActual || part.part_subtotal?.todayActual, part.partSubtotal?.todayLy || part.part_subtotal?.todayLy)');
content = content.replace(/formatGrowth\(part\.partSubtotal\?\.mtdGrowth \|\| part\.part_subtotal\?\.mtdGrowth\)/g, 'formatGrowth(part.partSubtotal?.mtdGrowth || part.part_subtotal?.mtdGrowth, part.partSubtotal?.mtdActual || part.part_subtotal?.mtdActual, part.partSubtotal?.mtdLy || part.part_subtotal?.mtdLy)');
content = content.replace(/formatGrowth\(part\.partSubtotal\?\.ytdGrowth \|\| part\.part_subtotal\?\.ytdGrowth\)/g, 'formatGrowth(part.partSubtotal?.ytdGrowth || part.part_subtotal?.ytdGrowth, part.partSubtotal?.ytdActual || part.part_subtotal?.ytdActual, part.partSubtotal?.ytdLy || part.part_subtotal?.ytdLy)');

content = content.replace(/formatGrowth\(division\.divisionSubtotal\?\.todayGrowth\)/g, 'formatGrowth(division.divisionSubtotal?.todayGrowth, division.divisionSubtotal?.todayActual, division.divisionSubtotal?.todayLy)');
content = content.replace(/formatGrowth\(division\.divisionSubtotal\?\.mtdGrowth\)/g, 'formatGrowth(division.divisionSubtotal?.mtdGrowth, division.divisionSubtotal?.mtdActual, division.divisionSubtotal?.mtdLy)');
content = content.replace(/formatGrowth\(division\.divisionSubtotal\?\.ytdGrowth\)/g, 'formatGrowth(division.divisionSubtotal?.ytdGrowth, division.divisionSubtotal?.ytdActual, division.divisionSubtotal?.ytdLy)');

content = content.replace(/formatGrowth\(data\.grandTotal\?\.todayGrowth\)/g, 'formatGrowth(data.grandTotal?.todayGrowth, data.grandTotal?.todayActual, data.grandTotal?.todayLy)');
content = content.replace(/formatGrowth\(data\.grandTotal\?\.mtdGrowth\)/g, 'formatGrowth(data.grandTotal?.mtdGrowth, data.grandTotal?.mtdActual, data.grandTotal?.mtdLy)');
content = content.replace(/formatGrowth\(data\.grandTotal\?\.ytdGrowth\)/g, 'formatGrowth(data.grandTotal?.ytdGrowth, data.grandTotal?.ytdActual, data.grandTotal?.ytdLy)');

fs.writeFileSync('src/components/dashboard/V6DashboardViewer.tsx', content);
