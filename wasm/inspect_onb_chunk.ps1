$onbJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding-99afabdfe24da9c1.js")
Write-Host "Onboarding chunk length: $($onbJs.Length)"
Write-Host $onbJs.Substring(0, [Math]::Min(1500, $onbJs.Length))
