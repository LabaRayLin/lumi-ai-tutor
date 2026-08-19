$apiKey = "YOUR_TEST_KEY" # We can check the URL patterns
Write-Host "Gemini model endpoints format check:"
$models = @("gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-pro")
foreach ($m in $models) {
    Write-Host "https://generativelanguage.googleapis.com/v1beta/models/$($m):generateContent"
}
