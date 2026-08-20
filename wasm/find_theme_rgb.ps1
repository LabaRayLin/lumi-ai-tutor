$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

$idx = $appJs.IndexOf("--color-santa-a-dark:")
if ($idx -lt 0) { $idx = $appJs.IndexOf("--color-santa-a:") }
if ($idx -lt 0) { $idx = $appJs.IndexOf("--color-santa-toeic-brand-1:") }
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 50)
    $len = [Math]::Min(1500, $appJs.Length - $start)
    Write-Host $appJs.Substring($start, $len)
}
