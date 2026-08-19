$lines = [System.IO.File]::ReadAllLines("c:\Users\user\Antigravity\santa-ai-offline\onboarding\intro.html")
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '[\uac00-\ud7a3]') {
        Write-Host "Line $($i+1): $($lines[$i].Trim())"
    }
}

$lines2 = [System.IO.File]::ReadAllLines("c:\Users\user\Antigravity\santa-ai-offline\ai-service.js")
for ($i = 0; $i -lt $lines2.Length; $i++) {
    if ($lines2[$i] -match '[\uac00-\ud7a3]') {
        Write-Host "ai-service Line $($i+1): $($lines2[$i].Trim())"
    }
}
