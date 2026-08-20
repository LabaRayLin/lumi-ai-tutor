$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static" -Recurse -Filter "*.js"
foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    if ($text.Contains("--color-santa") -or $text.Contains("colorTheme") -or $text.Contains("COLOR_THEME")) {
        $idx = $text.IndexOf("--color-santa")
        if ($idx -ge 0) {
            $start = [Math]::Max(0, $idx - 50)
            $len = [Math]::Min(300, $text.Length - $start)
            Write-Host "In $($f.Name):"
            Write-Host $text.Substring($start, $len)
            break
        }
    }
}
