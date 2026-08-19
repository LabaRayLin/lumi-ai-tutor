$text = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\onboarding\intro-5c449b16cf443fe1.js")
$idx = $text.IndexOf("sU8")
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 300)
    $len = [Math]::Min(600, $text.Length - $start)
    Write-Host $text.Substring($start, $len)
}
