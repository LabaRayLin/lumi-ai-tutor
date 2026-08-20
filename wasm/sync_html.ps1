$introPath = "c:\Users\user\Antigravity\santa-ai-offline\onboarding\intro.html"
$indexPath = "c:\Users\user\Antigravity\santa-ai-offline\index.html"
Copy-Item -Path $introPath -Destination $indexPath -Force
Write-Host "Copied intro.html to index.html successfully."
