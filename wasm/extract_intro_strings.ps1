$text = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\intro-5c449b16cf443fe1.js")
Write-Host "=== All text strings in intro-5c449b16cf443fe1.js ==="
$m = [regex]::Matches($text, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_.Length -gt 3 -and $_ -notmatch '^[a-zA-Z0-9_\-\/]{20,}$' } | Select-Object -Unique
$m | ForEach-Object { Write-Host " - $_" }
