$files = Get-ChildItem "c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks" -Recurse -Filter "*.js"
$workerMatches = @()
$wasmMatches = @()

foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    if ($text -match 'new\s+Worker\(' -or $text -match 'Worker\(') {
        $workerMatches += $f.Name
    }
    if ($text -match '\.wasm') {
        $wasmMatches += $f.Name
    }
}

Write-Host "Worker references found in: $($workerMatches.Count) files"
$workerMatches | Select-Object -Unique | ForEach-Object { Write-Host "Worker: $_" }
Write-Host "`nWASM references found in: $($wasmMatches.Count) files"
$wasmMatches | Select-Object -Unique | ForEach-Object { Write-Host "WASM: $_" }
