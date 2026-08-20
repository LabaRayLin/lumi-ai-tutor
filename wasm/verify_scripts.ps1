$baseDir = "c:\Users\user\Antigravity\santa-ai-offline"
$html = [System.IO.File]::ReadAllText("$baseDir\onboarding\intro.html")

$scripts = [regex]::Matches($html, '<script[^>]+src="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

Write-Host "Verifying $($scripts.Count) scripts in intro.html:"
foreach ($s in $scripts) {
    $clean = $s.Split('?')[0].TrimStart('/')
    $localFile = Join-Path $baseDir ($clean.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    if (Test-Path $localFile) {
        $len = (Get-Item $localFile).Length
        Write-Host "[OK] $s ($len bytes)"
    } else {
        Write-Warning "[MISSING] $s -> $localFile"
    }
}
