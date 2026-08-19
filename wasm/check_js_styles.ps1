$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\" -Recurse -Filter "*.js"
foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    if ($text.Contains("minHeight:\"100vh\"") -or $text.Contains("minHeight: '100vh'") -or $text.Contains("justifyContent:\"space-between\"")) {
        Write-Host "Found in $($f.Name)"
    }
}
