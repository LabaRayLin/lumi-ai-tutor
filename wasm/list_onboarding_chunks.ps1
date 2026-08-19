$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\"
foreach ($f in $files) {
    Write-Host "$($f.Name) ($($f.Length) bytes)"
}
