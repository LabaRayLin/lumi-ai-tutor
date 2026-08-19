$text = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\2a6424da-7c28abc0d45d406e.js")
$idx = $text.IndexOf("RendererLoader")
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 1500)
    $len = [Math]::Min(1500, $text.Length - $start)
    Write-Host $text.Substring($start, $len)
}
