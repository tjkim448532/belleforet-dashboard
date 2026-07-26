import fs from 'fs';

async function syncDevToolsPort() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const json = await res.json();
  const wsUrl = json.webSocketDebuggerUrl;
  const path = wsUrl.substring(wsUrl.indexOf('/devtools'));
  
  const content = `9222\n${path}`;
  const targetPath = 'C:\\Users\\RESOLVE_01\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
  
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Successfully wrote genuine DevToolsActivePort to:', targetPath);
  console.log('Content:\n' + content);
}

syncDevToolsPort().catch(console.error);
