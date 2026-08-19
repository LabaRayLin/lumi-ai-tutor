$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")
$idx = $appJs.IndexOf("33422:")
if ($idx -ge 0) {
    $idx2 = $appJs.IndexOf("sU8=", $idx)
    if ($idx2 -ge 0) {
        $start = [Math]::Max(0, $idx2 - 100)
        $len = [Math]::Min(300, $appJs.Length - $start)
        Write-Host $appJs.Substring($start, $len)
    }
}
