try {
    $manifest = Invoke-RestMethod -Uri "http://127.0.0.1:8080/manifest.json" -Method Get
    Write-Host "✅ manifest.json loaded successfully: Name=$($manifest.name), display=$($manifest.display)"
} catch {
    Write-Host "❌ Failed to load manifest.json: $_"
}

try {
    $sw = Invoke-WebRequest -Uri "http://127.0.0.1:8080/sw.js" -Method Get
    Write-Host "✅ sw.js loaded successfully: Status=$($sw.StatusCode), Size=$($sw.RawContentLength)"
} catch {
    Write-Host "❌ Failed to load sw.js: $_"
}
