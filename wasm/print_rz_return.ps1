$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

$idx = $appJs.IndexOf("function rz(e)")
if ($idx -ge 0) {
    $start = $idx + 1800
    $len = [Math]::Min(2000, $appJs.Length - $start)
    Write-Host $appJs.Substring($start, $len)
}
