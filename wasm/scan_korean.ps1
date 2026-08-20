$files = @(
    "c:\Users\user\Antigravity\santa-ai-offline\onboarding\intro.html",
    "c:\Users\user\Antigravity\santa-ai-offline\mock-api.js",
    "c:\Users\user\Antigravity\santa-ai-offline\settings-modal.js",
    "c:\Users\user\Antigravity\santa-ai-offline\ai-service.js"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $text = [System.IO.File]::ReadAllText($f)
        $m = [regex]::Matches($text, '[\uac00-\ud7a3]+')
        Write-Host "In $(Split-Path $f -Leaf): $($m.Count) Korean words found"
        $m | Select-Object -First 10 | ForEach-Object { Write-Host " - $($_.Value)" }
    }
}
