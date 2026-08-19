$baseDir = Split-Path -Parent $PSScriptRoot
$port = 8089
$process = Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"`"$baseDir\server.ps1`"`" -Port $port" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

try {
    $client = New-Object System.Net.WebClient
    
    $html = $client.DownloadString("http://127.0.0.1:$port/onboarding/intro")
    Write-Host "[CHECK 1] Intro HTML loaded: $($html.Length) bytes"

    $mock = $client.DownloadString("http://127.0.0.1:$port/mock-api.js")
    Write-Host "[CHECK 2] mock-api.js loaded: $($mock.Length) bytes (Contains /user/me: $($mock.Contains('/user/me')))"

    $img = $client.DownloadData("http://127.0.0.1:$port/assets/img_onboarding_kv.bb65f35e.webp")
    Write-Host "[CHECK 3] Onboarding image loaded: $($img.Length) bytes"

    Write-Host "`nAll verification checks passed!"
} catch {
    Write-Error "Test error: $_"
} finally {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
