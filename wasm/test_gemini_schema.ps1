Write-Host "Checking Google Gemini documentation standards..."
$payload = @{
    contents = @(
        @{
            role = "user"
            parts = @(
                @{ text = "Hello" }
            )
        }
    )
} | ConvertTo-Json -Depth 5

Write-Host "Standard Gemini Payload:"
Write-Host $payload
