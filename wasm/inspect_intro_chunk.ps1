$path = "c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\intro-5c449b16cf443fe1.js"
if (Test-Path $path) {
    $text = [System.IO.File]::ReadAllText($path)
    Write-Host "intro chunk length: $($text.Length)"
    
    # Search for all strings, URLs, routes, components
    $routes = [regex]::Matches($text, '(\/[a-zA-Z0-9_\-\/]+)') | ForEach-Object { $_.Value } | Select-Object -Unique
    Write-Host "Routes in intro chunk:"
    $routes | ForEach-Object { Write-Host " - $_" }
} else {
    Write-Host "File not found locally. Let's download it!"
}
