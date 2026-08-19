$text = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\2a6424da-7c28abc0d45d406e.js")

$matches = [regex]::Matches($text, '.{0,100}(?:Worker|\.wasm|WebAssembly).{0,100}')
Write-Host "Found $($matches.Count) matches in chunk"
foreach ($m in ($matches | Select-Object -First 10)) {
    Write-Host "---"
    Write-Host $m.Value
}
