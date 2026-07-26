import { spawn } from 'child_process';
import fs from 'fs';

async function launchChromeAndSyncGUID() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const remoteProfile = 'C:\\Users\\RESOLVE_01\\chrome-remote-profile';
  const defaultUserData = 'C:\\Users\\RESOLVE_01\\AppData\\Local\\Google\\Chrome\\User Data';
  const targetUrl = 'https://belleforet-dashboard.vercel.app';

  console.log('Launching Chrome with remote profile on port 9222...');
  
  const child = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${remoteProfile}`,
    targetUrl
  ], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  // Wait 2.5 seconds
  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const json = await res.json();
    console.log('Chrome DevTools Active Version JSON:', json);

    const wsUrl = json.webSocketDebuggerUrl;
    const path = wsUrl.substring(wsUrl.indexOf('/devtools'));
    const content = `9222\n${path}`;

    // Write to both locations
    fs.mkdirSync(defaultUserData, { recursive: true });
    fs.writeFileSync(`${defaultUserData}\\DevToolsActivePort`, content, 'utf8');
    fs.writeFileSync(`${remoteProfile}\\DevToolsActivePort`, content, 'utf8');

    console.log('SUCCESS! DevToolsActivePort synced with exact GUID:', path);
  } catch (err) {
    console.error('Failed to query DevTools port:', err.message);
  }
}

launchChromeAndSyncGUID();
