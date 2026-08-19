# download_assets.ps1 - Automated Asset Downloader for Santa AI Offline
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

$baseDir = $PSScriptRoot
$nextDir = Join-Path $baseDir "_next\static"
$buildId = "jENNU3H58B-tIoLQn3RGy"

function Ensure-Dir($path) {
    $dir = [System.IO.Path]::GetDirectoryName($path)
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

function Download-Asset($url, $destPath) {
    Ensure-Dir $destPath
    if (Test-Path $destPath) {
        $len = (Get-Item $destPath).Length
        if ($len -gt 0) {
            Write-Host "[EXISTS] $([System.IO.Path]::GetFileName($destPath)) ($len bytes)"
            return
        }
    }
    try {
        $client.DownloadFile($url, $destPath)
        $len = (Get-Item $destPath).Length
        Write-Host "[DOWNLOADED] $([System.IO.Path]::GetFileName($destPath)) ($len bytes)"
    } catch {
        Write-Warning "Failed to download $url : $_"
    }
}

Write-Host "=== 1. Downloading Manifests ==="
Download-Asset "https://ai.aitutorsanta.com/_next/static/$buildId/_buildManifest.js" (Join-Path $nextDir "$buildId\_buildManifest.js")
Download-Asset "https://ai.aitutorsanta.com/_next/static/$buildId/_ssgManifest.js" (Join-Path $nextDir "$buildId\_ssgManifest.js")

Write-Host "`n=== 2. Downloading CSS Stylesheets ==="
$cssList = @(
    "92dd231bb3a5bc1c.css",
    "1ba5ded7943c543d.css",
    "1bff5a024019dd7b.css"
)
foreach ($css in $cssList) {
    Download-Asset "https://ai.aitutorsanta.com/_next/static/css/$css" (Join-Path $nextDir "css\$css")
}

Write-Host "`n=== 3. Downloading Core Framework & App Chunks ==="
$coreChunks = @(
    "polyfills-42372ed130431b0a.js",
    "webpack-50c5564d99b24dc1.js",
    "framework-dc0c8ce2bb6ada39.js",
    "main-93efd2d72a01a9d0.js",
    "pages/_app-17f5f6443af84651.js",
    "pages/_error-e3f5cbcc562b16f5.js",
    "pages/index-16242327cb4ff79b.js",
    "pages/onboarding/intro-5c449b16cf443fe1.js",
    "pages/onboarding-99afabdfe24da9c1.js",
    "pages/onboarding/learning-setup-1468dc861586f18d.js",
    "pages/onboarding/diagnosis-guide-d026947761be4aec.js",
    "pages/diagnosis-report-b08d7496025498be.js",
    "pages/course-2c703c3871a0feba.js",
    "pages/course/config-6f8d3a5c485749a3.js",
    "pages/course/list-7471fdceceecdbf8.js",
    "pages/course/report-8589d6d7e3b7d12f.js",
    "pages/virtual-exam-8b9108f4a50c6cb6.js",
    "pages/virtual-exam/report-c862bc0af809a995.js",
    "pages/voca-7915234921eaca99.js",
    "pages/voca/wordbook-fd63f146e61a03c6.js",
    "pages/toeic-speaking-8c3dcbf22f595362.js",
    "pages/toeic-speaking/main-5740553b26251c0d.js",
    "pages/toeic-speaking/exam-b9f0bfd368095258.js",
    "pages/toeic-speaking/results-09e37f6ef19803b2.js",
    "pages/toeic-speaking/report-1b59f886d3c46aaa.js",
    "pages/toeic-speaking/test/shell-b75dbef9b33f741b.js",
    "pages/me-2f2225a0e4260b5b.js",
    "pages/me/account-3ae5b6bc31b76846.js",
    "pages/me/setting-ac899a3b407f0a2f.js",
    "pages/me/learning-goal-676a93d8da5473d3.js",
    "pages/me/target-score-4c47bfb7a737ddaf.js",
    "pages/login-dd9a2b864aeb412c.js",
    "pages/signup-6d1c592c47b49bb6.js",
    "pages/lumi-b189c3da47beb4dc.js"
)

foreach ($chunk in $coreChunks) {
    Download-Asset "https://ai.aitutorsanta.com/_next/static/chunks/$chunk" (Join-Path $nextDir "chunks\$chunk")
}

Write-Host "`n=== 4. Extracting and Downloading All Referenced Shared Chunks in buildManifest ==="
$manifestFile = Join-Path $nextDir "$buildId\_buildManifest.js"
if (Test-Path $manifestFile) {
    $manifestText = [System.IO.File]::ReadAllText($manifestFile)
    $allChunks = [regex]::Matches($manifestText, 'static/chunks/([a-zA-Z0-9_\-\.\/]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    Write-Host "Found $($allChunks.Count) shared chunks in manifest. Downloading..."
    foreach ($c in $allChunks) {
        $remoteUrl = "https://ai.aitutorsanta.com/_next/static/chunks/$c"
        $localDest = Join-Path $nextDir "chunks\$c"
        Download-Asset $remoteUrl $localDest
    }
}

Write-Host "`n=== 5. Downloading Brand Images & WebP Assets ==="
$assets = @(
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_favicon_black_32.ed554424.webp"; File = "assets/favicon.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/alertimage_recommend_course_change_jp.8e2f33aa.webp"; File = "assets/recommend_course_jp.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/alertimage_recommend_course_change_kr.3274bb9b.webp"; File = "assets/recommend_course_kr.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/COMP_gif_mictest_with_circle.0ba93214.webp"; File = "assets/mictest.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/gif_loading_aibutton.46fa59d7.webp"; File = "assets/loading_ai.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_avatar_lumi_Default.b973f3d6.webp"; File = "assets/avatar_lumi.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/icon_recommend_learning.79221dc5.webp"; File = "assets/icon_recommend.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/icon_test_record.a10ec839.webp"; File = "assets/icon_test_record.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/icon_word.eb244887.webp"; File = "assets/icon_word.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_bottom_card.24743b84.webp"; File = "assets/bottom_card.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_card_confetti.c5b338b8.webp"; File = "assets/confetti.webp" }
)

foreach ($item in $assets) {
    Download-Asset $item.Url (Join-Path $baseDir $item.File)
}

Write-Host "`nAll static assets download complete!"
