$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")

$idx = $appJs.IndexOf("65290:")
if ($idx -ge 0) {
    $idx2 = $appJs.IndexOf("65462:", $idx)
    $chunk = $appJs.Substring($idx, $idx2 - $idx)
    $m = [regex]::Matches($chunk, 'Component')
    Write-Host "Component matches in 65290: $($m.Count)"
    foreach ($match in [regex]::Matches($chunk, '.{0,100}Component.{0,100}')) {
        Write-Host "---"
        Write-Host $match.Value
    }
}
