$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\css\" -Filter "*.css"
foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    Write-Host "In $($f.Name): length $($text.Length)"
    $m = [regex]::Matches($text, 'justify-content:\s*space-between|min-height:\s*100%|min-height:\s*100vh|height:\s*100vh')
    Write-Host "Found $($m.Count) flex/height matches"
    foreach ($match in $m) {
        $idx = $match.Index
        $start = [Math]::Max(0, $idx - 40)
        $len = [Math]::Min(120, $text.Length - $start)
        Write-Host " -> " $text.Substring($start, $len)
    }
}
