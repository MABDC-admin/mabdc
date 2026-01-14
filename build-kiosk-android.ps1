# Build Attendance Kiosk Android App
Write-Host "Building MABDC Attendance Kiosk Android App..." -ForegroundColor Green

# Step 1: Build the web app
Write-Host "`n[1/4] Building web app..." -ForegroundColor Cyan
npm run build:kiosk
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Copy capacitor config
Write-Host "`n[2/4] Configuring Capacitor..." -ForegroundColor Cyan
Copy-Item "capacitor.config.kiosk.ts" "capacitor.config.ts" -Force

# Step 3: Update capacitor to use kiosk build
Write-Host "`n[3/4] Syncing with Android..." -ForegroundColor Cyan
((Get-Content -path capacitor.config.ts -Raw) -replace 'webDir:.*', "webDir: 'dist-kiosk',") | Set-Content -Path capacitor.config.ts
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Sync failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Open in Android Studio
Write-Host "`n[4/4] Opening in Android Studio..." -ForegroundColor Cyan
npx cap open android

Write-Host "`n✓ Attendance Kiosk is ready to build in Android Studio!" -ForegroundColor Green
Write-Host "App ID: com.mabdc.hrms.kiosk" -ForegroundColor Yellow
Write-Host "App Name: MABDC Attendance Kiosk" -ForegroundColor Yellow
