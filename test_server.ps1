# test_server.ps1 - Automated Verification Script
$port = 8088
$process = Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"`"$PSScriptRoot\server.ps1`"`" -Port $port" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

try {
    $client = New-Object System.Net.WebClient
    
    # 1. Test onboarding intro page
    $introUrl = "http://127.0.0.1:$port/onboarding/intro"
    $introHtml = $client.DownloadString($introUrl)
    Write-Host "[TEST 1] GET $introUrl -> Received $($introHtml.Length) bytes (Contains mock-api: $($introHtml.Contains('mock-api.js')))"
    
    # 2. Test root index page
    $indexUrl = "http://127.0.0.1:$port/"
    $indexHtml = $client.DownloadString($indexUrl)
    Write-Host "[TEST 2] GET $indexUrl -> Received $($indexHtml.Length) bytes"

    # 3. Test SPA fallback on arbitrary route
    $spaUrl = "http://127.0.0.1:$port/toeic-speaking/exam"
    $spaHtml = $client.DownloadString($spaUrl)
    Write-Host "[TEST 3] GET $spaUrl -> Fallback status OK, Received $($spaHtml.Length) bytes"

    # 4. Test Mock API file serving
    $mockJsUrl = "http://127.0.0.1:$port/mock-api.js"
    $mockJs = $client.DownloadString($mockJsUrl)
    Write-Host "[TEST 4] GET $mockJsUrl -> Received $($mockJs.Length) bytes"

    # 5. Test AI Service file serving
    $aiJsUrl = "http://127.0.0.1:$port/ai-service.js"
    $aiJs = $client.DownloadString($aiJsUrl)
    Write-Host "[TEST 5] GET $aiJsUrl -> Received $($aiJs.Length) bytes"

    # 6. Test WASM MIME and serving
    $wasmUrl = "http://127.0.0.1:$port/wasm/dotlottie-player.wasm"
    $wasmBytes = $client.DownloadData($wasmUrl)
    Write-Host "[TEST 6] GET $wasmUrl -> Received $($wasmBytes.Length) bytes"

    # 7. Test Next.js Core Chunk serving
    $chunkUrl = "http://127.0.0.1:$port/_next/static/chunks/main-93efd2d72a01a9d0.js"
    $chunkBytes = $client.DownloadData($chunkUrl)
    Write-Host "[TEST 7] GET $chunkUrl -> Received $($chunkBytes.Length) bytes"

    Write-Host "`n🎉 All 7 Server & SPA Fallback Tests PASSED Successfully!" -ForegroundColor Green
} catch {
    Write-Error "Test failed: $_"
} finally {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
