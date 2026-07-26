import http from 'http';
import fs from 'fs';

function syncViaIPv4() {
  const req = http.request({
    host: '127.0.0.1',
    port: 9222,
    path: '/json/version',
    method: 'GET',
    family: 4
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const wsUrl = json.webSocketDebuggerUrl;
        const path = wsUrl.substring(wsUrl.indexOf('/devtools'));
        const content = `9222\n${path}`;
        const targetFile = 'C:\\Users\\RESOLVE_01\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';

        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('SUCCESS IPv4! Written to:', targetFile);
        console.log('Content:\n' + content);
      } catch (e) {
        console.error('Parse error:', e);
      }
    });
  });

  req.on('error', (err) => {
    console.error('IPv4 Get Error:', err.message);
  });

  req.end();
}

syncViaIPv4();
