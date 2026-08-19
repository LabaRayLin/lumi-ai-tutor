$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks" -Recurse -Filter "*.js"
$ids = @("90636", "46593", "38792")

foreach ($id in $ids) {
    $found = @()
    foreach ($f in $files) {
        $text = [System.IO.File]::ReadAllText($f.FullName)
        if ($text.Contains($id + ":") -or $text.Contains("[$id]") -or $text.Contains("[$id,")) {
            $found += $f.Name
        }
    }
    Write-Host "Chunk $id found in: $($found -join ', ')"
}
