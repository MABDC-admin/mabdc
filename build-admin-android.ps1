# Build MABDC HRMS Admin Android App
Write-Host "Building MABDC HRMS Admin Android App..." -ForegroundColor Green
Write-Host "" 

# Step 1: Build the web app
Write-Host "`n[1/5] Building web app..." -ForegroundColor Cyan
npm run build:admin
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Rename index file for Capacitor
if (Test-Path "dist-admin\index-admin.html") {
    Rename-Item "dist-admin\index-admin.html" "index.html" -Force
}

# Step 2: Copy capacitor config
Write-Host "`n[2/5] Copying Capacitor configuration..." -ForegroundColor Cyan
Copy-Item "capacitor.config.admin.ts" "capacitor.config.ts" -Force

# Step 3: Sync with Android
Write-Host "`n[3/5] Syncing with Android platform..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Sync failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Open in Android Studio
Write-Host "`n[4/5] Opening Android Studio..." -ForegroundColor Cyan
Start-Process "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe" -ArgumentList "$PWD\android-admin"

# Step 5: Display information
Write-Host "`n[5/5] Build Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "App Information:" -ForegroundColor Yellow
Write-Host "  Name: MABDC HRMS Admin" -ForegroundColor White
Write-Host "  Package ID: com.mabdc.hrms.admin" -ForegroundColor White
Write-Host "  Build Directory: dist-admin/" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps in Android Studio:" -ForegroundColor Yellow
Write-Host "  1. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "  2. Build > Build Bundle(s) / APK(s) > Build APK(s)" -ForegroundColor White
Write-Host "  3. APK will be in: android-admin/app/build/outputs/apk/debug/" -ForegroundColor White
Write-Host ""
Write-Host "HRMS Admin app is ready to build!" -ForegroundColor Green
