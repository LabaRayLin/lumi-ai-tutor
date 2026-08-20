$manifest = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\jENNU3H58B-tIoLQn3RGy\_buildManifest.js")
$idx = $manifest.IndexOf('"/onboarding/intro":')
if ($idx -ge 0) {
    Write-Host $manifest.Substring($idx, 400)
}
