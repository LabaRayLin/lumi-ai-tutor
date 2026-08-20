$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")
$m = [regex]::Matches($appJs, '--color-santa-[a-zA-Z0-9\-]+') | ForEach-Object { $_.Value } | Select-Object -Unique

Write-Host "Unique Santa Color Variables:"
$m | ForEach-Object { Write-Host $_ }
