$testUser = "test_learner_" + (Get-Random -Minimum 1000 -Maximum 9999)
$testSalt = "0123456789abcdef0123456789abcdef"
$testIv = "abcdef0123456789abcdef01"
$testCipher = "deadbeefcafebabe12345678"

Write-Host "=== Testing E2EE Sync Backend Endpoints ===" -ForegroundColor Cyan

# 1. Test registration
try {
    $regBody = @{
        username   = $testUser
        saltHex    = $testSalt
        ivHex      = $testIv
        ciphertext = $testCipher
        timestamp  = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    } | ConvertTo-Json

    $regRes = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/sync/register" -Method Post -Body $regBody -ContentType "application/json"
    Write-Host "[1] Register Result: $($regRes.success)" -ForegroundColor Green
} catch {
    Write-Host "[1] Register Failed: $_" -ForegroundColor Red
}

# 2. Test login
try {
    $loginBody = @{ username = $testUser } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/sync/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "[2] Login Result: saltHex=$($loginRes.saltHex), ivHex=$($loginRes.ivHex)" -ForegroundColor Green
} catch {
    Write-Host "[2] Login Failed: $_" -ForegroundColor Red
}

# 3. Test push updated data
try {
    $newCipher = "99998888777766665555"
    $pushBody = @{
        username   = $testUser
        saltHex    = $testSalt
        ivHex      = $testIv
        ciphertext = $newCipher
        timestamp  = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    } | ConvertTo-Json

    $pushRes = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/sync/push" -Method Post -Body $pushBody -ContentType "application/json"
    Write-Host "[3] Push Result: $($pushRes.success)" -ForegroundColor Green
} catch {
    Write-Host "[3] Push Failed: $_" -ForegroundColor Red
}

# 4. Test pull data
try {
    $pullRes = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/sync/pull?username=$testUser" -Method Get
    Write-Host "[4] Pull Result: ciphertext=$($pullRes.ciphertext) (Matches: $($pullRes.ciphertext -eq $newCipher))" -ForegroundColor Green
} catch {
    Write-Host "[4] Pull Failed: $_" -ForegroundColor Red
}

# 5. Check e2ee-sync.js static file
try {
    $jsRes = Invoke-WebRequest -Uri "http://127.0.0.1:8080/e2ee-sync.js" -Method Get
    Write-Host "[5] e2ee-sync.js Loaded: Status=$($jsRes.StatusCode), Size=$($jsRes.RawContentLength) bytes" -ForegroundColor Green
} catch {
    Write-Host "[5] e2ee-sync.js Load Failed: $_" -ForegroundColor Red
}
