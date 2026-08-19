$css = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\css\92dd231bb3a5bc1c.css")
$matches = [regex]::Matches($css, '#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\([^)]+\)') | ForEach-Object { $_.Value } | Group-Object | Sort-Object Count -Descending | Select-Object -First 20

Write-Host "Top colors in 92dd231bb3a5bc1c.css:"
foreach ($m in $matches) {
    Write-Host "$($m.Name): $($m.Count) times"
}
