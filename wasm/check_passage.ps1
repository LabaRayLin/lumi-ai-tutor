$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\ai-service.js")
$m = [regex]::Match($appJs, 'passage:\s*"([^"]+)"')
if ($m.Success) {
    Write-Host "Matched passage in ai-service.js:"
    Write-Host $m.Groups[1].Value
}
