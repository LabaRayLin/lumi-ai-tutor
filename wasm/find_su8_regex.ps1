$appJs = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\chunks\pages\_app-17f5f6443af84651.js")
$m = [regex]::Match($appJs, 't\.sU8\s*=\s*["`'']([^"`'']+)["`'']')
if ($m.Success) {
    Write-Host "Found sU8: $($m.Groups[1].Value)"
} else {
    Write-Host "sU8 regex not matched"
}
