$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")
$idx = $appJs.IndexOf("33422:")
if ($idx -ge 0) {
    $start = $idx
    $len = [Math]::Min(600, $appJs.Length - $start)
    Write-Host $appJs.Substring($start, $len)
}
