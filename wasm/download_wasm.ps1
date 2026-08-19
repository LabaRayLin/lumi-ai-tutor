[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

$urls = @(
    "https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.wasm",
    "https://cdn.jsdelivr.net/npm/@dotlottie/wasm@latest/dist/dotlottie-player.wasm"
)

$dest1 = "c:\Users\user\Antigravity\santa-ai-offline\wasm\dotlottie-player.wasm"
$dest2 = "c:\Users\user\Antigravity\santa-ai-offline\wasm\DotLottiePlayer.wasm"
$dest3 = "c:\Users\user\Antigravity\santa-ai-offline\dotlottie-player.wasm"
$dest4 = "c:\Users\user\Antigravity\santa-ai-offline\DotLottiePlayer.wasm"

foreach ($url in $urls) {
    try {
        $client.DownloadFile($url, $dest1)
        Copy-Item $dest1 $dest2
        Copy-Item $dest1 $dest3
        Copy-Item $dest1 $dest4
        Write-Host "Successfully downloaded DotLottie wasm from $url ($( (Get-Item $dest1).Length ) bytes)"
        break
    } catch {
        Write-Warning "Failed $url : $_"
    }
}
