const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/V6DashboardViewer.tsx', 'utf8');

// Fix the interface
code = code.replace(/tickets: Ticket\[\];/g, "tickets?: Ticket[];\n  ticketGroup?: string;\n  revenue?: number;");

// Fix the reduce
code = code.replace(/division\.venues\.reduce\(\(acc, v\) => acc \+ \(v\.tickets\.length \|\| 1\), 0\) \+ 1;/g, "division.venues.reduce((acc, v) => acc + (v.tickets?.length || 1), 0) + 1;");

// Replace the venue map body
const oldMap = `                  const venueRowSpan = venue.tickets.length || 1;
                  
                  return venue.tickets.map((ticket, ticketIdx) => (`;

const newMap = `                  const tickets = venue.tickets && venue.tickets.length > 0
                    ? venue.tickets
                    : [{ ticketName: venue.ticketGroup || '-', revenue: venue.revenue || 0 }];
                  const venueRowSpan = tickets.length;
                  
                  return tickets.map((ticket, ticketIdx) => (`;

code = code.replace(oldMap, newMap);

fs.writeFileSync('src/components/dashboard/V6DashboardViewer.tsx', code);
