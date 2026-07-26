Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222","--remote-allow-origins=*","--user-data-dir=C:\Users\RESOLVE_01\chrome-remote-profile","https://belleforet-dashboard.vercel.app"
Start-Sleep -Seconds 3

$json = Invoke-RestMethod -Uri "http://127.0.0.1:9222/json/version"
$ws = $json.webSocketDebuggerUrl
$path = $ws.Substring($ws.IndexOf('/devtools'))
$lines = @("9222", $path)

New-Item -ItemType Directory -Path "C:\Users\RESOLVE_01\AppData\Local\Google\Chrome\User Data" -Force | Out-Null
Set-Content -Path "C:\Users\RESOLVE_01\AppData\Local\Google\Chrome\User Data\DevToolsActivePort" -Value $lines
Write-Host "PERFECT SUCCESS! DevToolsActivePort synced:"
Get-Content "C:\Users\RESOLVE_01\AppData\Local\Google\Chrome\User Data\DevToolsActivePort"
