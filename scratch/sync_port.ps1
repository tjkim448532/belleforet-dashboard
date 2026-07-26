$json = Invoke-RestMethod -Uri "http://127.0.0.1:9222/json/version"
$ws = $json.webSocketDebuggerUrl
$path = $ws.Substring($ws.IndexOf('/devtools'))
$lines = @("9222", $path)
Set-Content -Path "C:\Users\RESOLVE_01\AppData\Local\Google\Chrome\User Data\DevToolsActivePort" -Value $lines
Write-Host "SUCCESS! Wrote DevToolsActivePort:"
Get-Content "C:\Users\RESOLVE_01\AppData\Local\Google\Chrome\User Data\DevToolsActivePort"
