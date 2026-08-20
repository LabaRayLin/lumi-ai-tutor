$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

$idx = $appJs.IndexOf("65290:")
if ($idx -ge 0) {
    $idx2 = $appJs.IndexOf("65462:", $idx)
    $len = $idx2 - $idx
    Write-Host $appJs.Substring($idx, [Math]::Min(3000, $len))
}
