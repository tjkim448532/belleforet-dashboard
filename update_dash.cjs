const fs = require('fs');
let code = fs.readFileSync('src/pages/MatrixWeeklyDashboard.tsx', 'utf8');

// Remove useRevenueData import
code = code.replace(/import \{ useRevenueData \} from '\.\.\/hooks\/useRevenueData';\n/, '');

// Remove useRevenueData hook call
code = code.replace(/const \{ data, loading, error \} = useRevenueData\(startDate, targetEndDate\);\n/, '');

// Change the rendering part to just output V6DashboardViewer (since it handles its own loading/error)
// We will replace the entire {error && ...} and {loading ? ...} blocks
code = code.replace(/\{error && \([\s\S]*?\}\)/, '');
code = code.replace(/\{loading \? \([\s\S]*?\) : \([\s\S]*?<V6DashboardViewer \/>[\s\S]*?\)\}/, '<V6DashboardViewer />');

fs.writeFileSync('src/pages/MatrixWeeklyDashboard.tsx', code);
