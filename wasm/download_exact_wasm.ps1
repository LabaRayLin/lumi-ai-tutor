[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

$url = "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.47.0/dist/dotlottie-player.wasm"
$dest1 = "c:\Users\user\Antigravity\santa-ai-offline\wasm\dotlottie-player.wasm"
$dest2 = "c:\Users\user\Antigravity\santa-ai-offline\wasm\DotLottiePlayer.wasm"
$dest3 = "c:\Users\user\Antigravity\santa-ai-offline\dotlottie-player.wasm"
$dest4 = "c:\Users\user\Antigravity\santa-ai-offline\DotLottiePlayer.wasm"
$dest5 = "c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\dotlottie-player.wasm"

try {
    $client.DownloadFile($url, $dest1)
    Copy-Item $dest1 $dest2 -Force
    Copy-Item $dest1 $dest3 -Force
    Copy-Item $dest1 $dest4 -Force
    Copy-Item $dest1 $dest5 -Force
    Write-Host "Successfully downloaded @lottiefiles/dotlottie-web@0.47.0 wasm ($( (Get-Item $dest1).Length ) bytes)"
} catch {
    Write-Warning "Download error: $_"
}
