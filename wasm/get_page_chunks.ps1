$manifest = [System.IO.File]::ReadAllText("c:\Users\user\Antigravity\santa-ai-offline\_next\static\jENNU3H58B-tIoLQn3RGy\_buildManifest.js")

$pages = @("/onboarding", "/onboarding/learning-setup", "/onboarding/diagnosis-guide", "/course", "/virtual-exam", "/voca", "/toeic-speaking/exam", "/toeic-speaking/results", "/lumi", "/me")

foreach ($p in $pages) {
    $idx = $manifest.IndexOf('"' + $p + '":')
    if ($idx -ge 0) {
        $idx2 = $manifest.IndexOf(']', $idx)
        Write-Host $manifest.Substring($idx, $idx2 - $idx + 1)
    }
}
