const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/V6DashboardViewer.tsx', 'utf8');

// 1. Update the interface to add venueSubtotal
code = code.replace(
  /interface Venue \{\n  venueName: string;\n  tickets: Ticket\[\];\n\}/g,
  `interface Venue {
  venueName: string;
  tickets: Ticket[];
  venueSubtotal: RevenueMetrics;
}`
);

// 2. Rewrite the mapping logic inside tbody
const oldMapLogic = `          {/* --- 4. 계층형 데이터 순회 및 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            const divisionRowSpan = division.venues.reduce((acc, v) => acc + (v.tickets ? v.tickets.length : 0), 0) + 1;

            return (
              <React.Fragment key={\`div-\${divIdx}\`}>
                {division.venues.map((venue, venueIdx) => {
                  return venue.tickets.map((ticket, ticketIdx) => {
                    const isFirstVenueAndTicket = venueIdx === 0 && ticketIdx === 0;
                    return (
                      <tr key={\`div-\${divIdx}-ven-\${venueIdx}-tkt-\${ticketIdx}\`} className="hover:bg-slate-50 transition-colors">
                        {isFirstVenueAndTicket && (
                          <td rowSpan={divisionRowSpan} className="px-4 py-3 bg-slate-50 font-bold align-top border border-slate-200 text-slate-800">
                            {division.orgDivision}
                          </td>
                        )}
                        
                        <td className="px-4 py-3 font-medium align-top border border-slate-200 text-slate-700">
                          {venue.venueName} <span className="text-xs text-slate-400 font-normal ml-1">({ticket.ticketName})</span>
                        </td>
                        
                        {/* Today */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200">{formatNum(ticket.todayActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.todayLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-slate-50/50">{formatGrowth(ticket.todayGrowth)}</td>
                        
                        {/* MTD */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-blue-800">{formatNum(ticket.mtdActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.mtdLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-blue-50/10">{formatGrowth(ticket.mtdGrowth)}</td>
                        
                        {/* YTD */}
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-indigo-800">{formatNum(ticket.ytdActual)}</td>
                        <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(ticket.ytdLy)}</td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-indigo-50/10">{formatGrowth(ticket.ytdGrowth)}</td>
                      </tr>
                    );
                  });
                })}`;

const newMapLogic = `          {/* --- 4. 계층형 데이터 순회 및 렌더링 --- */}
          {data.divisions.map((division, divIdx) => {
            const divisionRowSpan = division.venues.length + 1;

            return (
              <React.Fragment key={\`div-\${divIdx}\`}>
                {division.venues.map((venue, venueIdx) => {
                  return (
                    <tr key={\`div-\${divIdx}-ven-\${venueIdx}\`} className="hover:bg-slate-50 transition-colors">
                      {venueIdx === 0 && (
                        <td rowSpan={divisionRowSpan} className="px-4 py-3 bg-slate-50 font-bold align-top border border-slate-200 text-slate-800">
                          {division.orgDivision}
                        </td>
                      )}
                      
                      <td className="px-4 py-3 font-medium align-top border border-slate-200 text-slate-700">
                        {venue.venueName}
                      </td>
                      
                      {/* Today */}
                      <td className="px-3 py-3 text-right font-mono border border-slate-200">{formatNum(venue.venueSubtotal?.todayActual)}</td>
                      <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(venue.venueSubtotal?.todayLy)}</td>
                      <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-slate-50/50">{formatGrowth(venue.venueSubtotal?.todayGrowth)}</td>
                      
                      {/* MTD */}
                      <td className="px-3 py-3 text-right font-mono border border-slate-200 text-blue-800">{formatNum(venue.venueSubtotal?.mtdActual)}</td>
                      <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(venue.venueSubtotal?.mtdLy)}</td>
                      <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-blue-50/10">{formatGrowth(venue.venueSubtotal?.mtdGrowth)}</td>
                      
                      {/* YTD */}
                      <td className="px-3 py-3 text-right font-mono border border-slate-200 text-indigo-800">{formatNum(venue.venueSubtotal?.ytdActual)}</td>
                      <td className="px-3 py-3 text-right font-mono border border-slate-200 text-slate-500">{formatNum(venue.venueSubtotal?.ytdLy)}</td>
                      <td className="px-3 py-3 text-right font-mono border-r border-slate-300 bg-indigo-50/10">{formatGrowth(venue.venueSubtotal?.ytdGrowth)}</td>
                    </tr>
                  );
                })}`;

code = code.replace(oldMapLogic, newMapLogic);
fs.writeFileSync('src/components/dashboard/V6DashboardViewer.tsx', code);
