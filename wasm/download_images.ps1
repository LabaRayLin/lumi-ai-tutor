[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

$images = @(
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_onboarding_kv.bb65f35e.webp"; File = "assets/img_onboarding_kv.bb65f35e.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_onboarding_kv.bb65f35e.webp"; File = "assets/img_onboarding_kv.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_favicon_black_32.ed554424.webp"; File = "assets/favicon.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_favicon_black_32.ed554424.webp"; File = "assets/img_favicon_black_32.ed554424.webp" },
    @{ Url = "https://resource.aitutorsanta.com/assets/images/santa/img_avatar_lumi_Default.b973f3d6.webp"; File = "assets/img_avatar_lumi_Default.b973f3d6.webp" }
)

$baseDir = "c:\Users\user\Antigravity\santa-ai-offline"

foreach ($img in $images) {
    $dest = Join-Path $baseDir $img.File
    try {
        $client.DownloadFile($img.Url, $dest)
        Write-Host "Downloaded: $($img.File) ($((Get-Item $dest).Length) bytes)"
    } catch {
        Write-Warning "Failed: $($img.Url) : $_"
    }
}
