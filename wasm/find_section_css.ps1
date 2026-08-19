$css = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\css\92dd231bb3a5bc1c.css")

$m = [regex]::Matches($css, '(section|main|#__next|body|html)[^{]*\{[^}]*\}')
foreach ($match in $m) {
    Write-Host $match.Value
}
