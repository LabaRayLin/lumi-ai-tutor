$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")
$idx = $appJs.IndexOf("function nM(")
if ($idx -lt 0) { $idx = $appJs.IndexOf("nM=") }
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 50)
    $len = [Math]::Min(1200, $appJs.Length - $start)
    Write-Host $appJs.Substring($start, $len)
}
