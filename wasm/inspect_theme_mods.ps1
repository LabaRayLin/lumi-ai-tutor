$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

$modules = @("58044:", "71502:", "83726:", "21008:")
foreach ($m in $modules) {
    $idx = $appJs.IndexOf($m)
    if ($idx -ge 0) {
        Write-Host "=== Module $m ==="
        Write-Host $appJs.Substring($idx, [Math]::Min(800, $appJs.Length - $idx))
    }
}
