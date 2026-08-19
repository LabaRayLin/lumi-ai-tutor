$cssFiles = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\css" -Filter "*.css"
foreach ($f in $cssFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    $matches = [regex]::Matches($text, '.{0,50}overflow[^;]+;.{0,50}')
    Write-Host "In $($f.Name): $($matches.Count) overflow rules"
    foreach ($m in ($matches | Select-Object -First 5)) {
        Write-Host "--- $($m.Value)"
    }
}
