const fs = require('fs');
let code = fs.readFileSync('src/lib/dataTransformers.ts', 'utf8');

// Add trevPOR to the interface
code = code.replace(/trevPAR: number;/g, 'trevPAR: number;\n    trevPOR: number;');

// Parse trevPOR from backend
code = code.replace(/const backendTrevPAR = parseNum\(c.summary\?\.trevPAR \|\| 0\);/g, 
  'const backendTrevPAR = parseNum(c.summary?.trevPAR || 0);\n  const backendTrevPOR = parseNum(c.summary?.trevPOR || 0);');

// Add trevPOR to the returned object
code = code.replace(/trevPAR: backendTrevPAR,/g, 'trevPAR: backendTrevPAR,\n    trevPOR: backendTrevPOR,');

fs.writeFileSync('src/lib/dataTransformers.ts', code);
