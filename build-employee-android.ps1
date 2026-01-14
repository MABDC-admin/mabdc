# Build Employee Portal Android App
Write-Host "Building MABDC Employee Portal Android App..." -ForegroundColor Green

# Step 1: Build the web app
Write-Host "`n[1/4] Building web app..." -ForegroundColor Cyan
npm run build:employee
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Rename index file for Capacitor
if (Test-Path "dist-employee\index-employee.html") {
    Rename-Item "dist-employee\index-employee.html" "index.html" -Force
}

# Step 2: Copy capacitor config
Write-Host "`n[2/4] Configuring Capacitor..." -ForegroundColor Cyan
Copy-Item "capacitor.config.employee.ts" "capacitor.config.ts" -Force

# Step 3: Sync with Android
Write-Host "`n[3/4] Syncing with Android..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Sync failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Open in Android Studio
Write-Host "`n[4/4] Opening in Android Studio..." -ForegroundColor Cyan
npx cap open android --config capacitor.config.employee.ts

Write-Host "`nEmployee Portal is ready to build in Android Studio!" -ForegroundColor Green
Write-Host "App ID: com.mabdc.hrms.employee" -ForegroundColor Yellow
Write-Host "App Name: MABDC Employee Portal" -ForegroundColor Yellow
Write-Host "APK will be in: android-employee/app/build/outputs/apk/debug/" -ForegroundColor Yellow
