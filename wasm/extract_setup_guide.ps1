$setup = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\learning-setup-1468dc861586f18d.js")
$guide = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\diagnosis-guide-d026947761be4aec.js")

Write-Host "=== learning-setup routes & keys ==="
$m1 = [regex]::Matches($setup, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_.Length -gt 3 -and $_ -notmatch '^[a-zA-Z0-9_\-\/]{25,}$' } | Select-Object -Unique
$m1 | ForEach-Object { Write-Host " - $_" }

Write-Host "=== diagnosis-guide routes & keys ==="
$m2 = [regex]::Matches($guide, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_.Length -gt 3 -and $_ -notmatch '^[a-zA-Z0-9_\-\/]{25,}$' } | Select-Object -Unique
$m2 | ForEach-Object { Write-Host " - $_" }
