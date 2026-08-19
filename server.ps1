<#
.SYNOPSIS
  Santa AI Tutor Standalone Offline Server (PowerShell Edition)
  Runs on any Windows system with zero external runtime dependencies.
#>

param(
    [int]$Port = 8080
)

$baseDir = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[!] Port $Port is busy, trying 8081..."
    $Port = 8081
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://127.0.0.1:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   🎅 Santa AI Tutor Standalone Offline Web Server" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   URL            : $prefix" -ForegroundColor Green
Write-Host "   Onboarding URL : ${prefix}onboarding/intro" -ForegroundColor Green
Write-Host "   Root Directory : $baseDir"
Write-Host "   SPA Fallback   : Enabled"
Write-Host "   COOP / COEP    : Enabled (WebAssembly / SharedArrayBuffer)"
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server.`n"

$mimeTypes = @{
    ".html"        = "text/html; charset=utf-8"
    ".js"          = "text/javascript; charset=utf-8"
    ".mjs"         = "text/javascript; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".wasm"        = "application/wasm"
    ".webp"        = "image/webp"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".svg"         = "image/svg+xml"
    ".ico"         = "image/x-icon"
    ".wav"         = "audio/wav"
    ".mp3"         = "audio/mpeg"
    ".webm"        = "audio/webm"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add Security & COOP/COEP & PWA Headers
        $response.AddHeader("Cross-Origin-Opener-Policy", "same-origin")
        $response.AddHeader("Cross-Origin-Embedder-Policy", "credentialless")
        $response.AddHeader("Service-Worker-Allowed", "/")
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        $response.AddHeader("Access-Control-Allow-Headers", "*")
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.Url.LocalPath.TrimStart('/')
        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl)
        $localPath = Join-Path $baseDir ($decodedUrl.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        $syncDbPath = Join-Path $baseDir ".sync_db.json"

        # ==========================================
        # E2EE Sync Cloud API Endpoints
        # ==========================================
        if ($decodedUrl.StartsWith("api/sync/")) {
            $response.ContentType = "application/json; charset=utf-8"

            # Helper to read sync DB (Windows PowerShell 5.1 compatible)
            $syncDb = @{}
            if (Test-Path $syncDbPath) {
                try {
                    $jsonContent = [System.IO.File]::ReadAllText($syncDbPath, [System.Text.Encoding]::UTF8)
                    $parsed = $jsonContent | ConvertFrom-Json
                    if ($parsed) {
                        foreach ($prop in $parsed.PSObject.Properties) {
                            $syncDb[$prop.Name.ToLower()] = @{
                                saltHex    = $prop.Value.saltHex
                                ivHex      = $prop.Value.ivHex
                                ciphertext = $prop.Value.ciphertext
                                updatedAt  = $prop.Value.updatedAt
                            }
                        }
                    }
                } catch { $syncDb = @{} }
            }

            # Helper to save sync DB
            function Save-SyncDb {
                param($db)
                $json = $db | ConvertTo-Json -Depth 10
                [System.IO.File]::WriteAllText($syncDbPath, $json, [System.Text.Encoding]::UTF8)
            }

            if ($decodedUrl -eq "api/sync/register" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $u = $body.username.ToLower()

                if ($syncDb.ContainsKey($u)) {
                    $response.StatusCode = 400
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "帳號已存在，請直接切換至登入"}')
                } else {
                    $syncDb[$u] = @{
                        saltHex    = $body.saltHex
                        ivHex      = $body.ivHex
                        ciphertext = $body.ciphertext
                        updatedAt  = $body.timestamp
                    }
                    Save-SyncDb -db $syncDb
                    $response.StatusCode = 200
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": true}')
                }
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            if ($decodedUrl -eq "api/sync/login" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $u = $body.username.ToLower()

                if (-not $syncDb.ContainsKey($u)) {
                    $response.StatusCode = 404
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "找不到此帳號，請先註冊"}')
                } else {
                    $userEntry = $syncDb[$u]
                    $response.StatusCode = 200
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($userEntry | ConvertTo-Json))
                }
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            if ($decodedUrl -eq "api/sync/push" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $u = $body.username.ToLower()

                $syncDb[$u] = @{
                    saltHex    = $body.saltHex
                    ivHex      = $body.ivHex
                    ciphertext = $body.ciphertext
                    updatedAt  = $body.timestamp
                }
                Save-SyncDb -db $syncDb
                $response.StatusCode = 200
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": true}')
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            if ($decodedUrl.StartsWith("api/sync/pull")) {
                $u = $request.QueryString["username"]
                if ($u) { $u = $u.ToLower() }

                if ($u -and $syncDb.ContainsKey($u)) {
                    $userEntry = $syncDb[$u]
                    $response.StatusCode = 200
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($userEntry | ConvertTo-Json))
                } else {
                    $response.StatusCode = 404
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "No data found"}')
                }
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }
        }

        $targetFile = $null

        # 1. Root -> index.html or onboarding/intro.html
        if ([string]::IsNullOrWhiteSpace($decodedUrl) -or $decodedUrl -eq "onboarding/intro") {
            if (Test-Path (Join-Path $baseDir "onboarding\intro.html")) {
                $targetFile = Join-Path $baseDir "onboarding\intro.html"
            } elseif (Test-Path (Join-Path $baseDir "index.html")) {
                $targetFile = Join-Path $baseDir "index.html"
            }
        }
        # 2. Exact file exists
        elseif (Test-Path $localPath -PathType Leaf) {
            $targetFile = $localPath
        }
        # 3. Path + .html exists
        elseif (Test-Path "$localPath.html" -PathType Leaf) {
            $targetFile = "$localPath.html"
        }
        # 4. Static assets (/_next/, /assets/, /wasm/) that do not exist -> 404
        elseif ($decodedUrl.StartsWith("_next/") -or $decodedUrl.StartsWith("assets/") -or [System.IO.Path]::HasExtension($decodedUrl)) {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("Asset Not Found: $decodedUrl")
            $response.ContentType = "text/plain"
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.Close()
            continue
        }
        # 5. SPA Route Fallback
        else {
            if (Test-Path (Join-Path $baseDir "onboarding\intro.html")) {
                $targetFile = Join-Path $baseDir "onboarding\intro.html"
            } elseif (Test-Path (Join-Path $baseDir "index.html")) {
                $targetFile = Join-Path $baseDir "index.html"
            }
        }

        if ($targetFile -and (Test-Path $targetFile)) {
            $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType
            $response.StatusCode = 200

            $bytes = [System.IO.File]::ReadAllBytes($targetFile)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # Ignore client disconnects
    }
}
