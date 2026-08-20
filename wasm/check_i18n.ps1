$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

# Find translation related keys or locize / i18n
$matches = [regex]::Matches($appJs, '.{0,100}page_onboarding_get_started.{0,100}')
Write-Host "Translation matches: $($matches.Count)"
foreach ($m in ($matches | Select-Object -First 5)) {
    Write-Host "---"
    Write-Host $m.Value
}

# Check if there are i18n JSON files or locize calls
$locizeMatches = [regex]::Matches($appJs, 'https://[^`"''\s]*locize[^`"''\s]*')
Write-Host "`nLocize URLs: $($locizeMatches.Count)"
foreach ($m in $locizeMatches) {
    Write-Host $m.Value
}
