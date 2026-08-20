$text = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\2a6424da-7c28abc0d45d406e.js")
$matches = [regex]::Matches($text, 'https://(?:unpkg\.com|cdn\.jsdelivr\.net)/[^`"''\s]+')
foreach ($m in $matches) {
    Write-Host $m.Value
}
