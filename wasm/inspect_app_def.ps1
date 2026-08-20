$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

# Find window.__NEXT_P push for "/_app"
$idx = $appJs.IndexOf('"/_app"')
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 200)
    $len = [Math]::Min(800, $appJs.Length - $start)
    Write-Host $appJs.Substring($start, $len)
}
