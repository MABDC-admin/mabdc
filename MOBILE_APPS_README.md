# MABDC HRMS Mobile Apps

This project includes **three separate, independent mobile applications** built with Capacitor. Each app has its own unique package ID and can be installed side-by-side on the same device without replacing each other.

## 📱 Available Apps

### 1. **HRMS Admin App**
- **Package ID**: `com.mabdc.hrms.admin`
- **App Name**: MABDC HRMS Admin
- **Purpose**: Administrative HR management for HR staff and managers
- **Features**: 
  - Full HR dashboard access
  - Employee management
  - Leave approvals
  - Payroll management
  - Reports and analytics
  - System settings

### 2. **Employee Portal App**
- **Package ID**: `com.mabdc.hrms.employee`
- **App Name**: MABDC Employee Portal
- **Purpose**: Employee self-service portal for accessing HR information
- **Features**: 
  - Employee login with biometric authentication
  - Personal information management
  - Leave requests
  - Attendance records
  - Document access
  - Password reset

### 3. **Attendance Kiosk App**
- **Package ID**: `com.mabdc.hrms.kiosk`
- **App Name**: MABDC Attendance Kiosk
- **Purpose**: Quick attendance check-in/check-out functionality
- **Features**:
  - QR code scanning
  - Face recognition (optional)
  - Quick clock-in/clock-out
  - Real-time attendance tracking
  - Optimized for kiosk/tablet use

---

## 🚀 Building the Apps

### **Prerequisites**
- Node.js & npm installed
- Android Studio installed (for Android builds)
- Xcode installed (for iOS builds - Mac only)

### **HRMS Admin Android Build**

#### Option 1: Using PowerShell Script (Recommended)
```powershell
.\build-admin-android.ps1
```

#### Option 2: Manual Steps
```bash
# 1. Build the web app
npm run build:admin

# 2. Copy admin config
Copy-Item "capacitor.config.admin.ts" "capacitor.config.ts" -Force

# 3. Sync with Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android --config capacitor.config.admin.ts

# 5. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### **Employee Portal Android Build**

#### Option 1: Using PowerShell Script (Recommended)
```powershell
.\build-employee-android.ps1
```

#### Option 2: Manual Steps
```bash
# 1. Build the web app
npm run build:employee

# 2. Copy employee config
Copy-Item "capacitor.config.employee.ts" "capacitor.config.ts" -Force

# 3. Sync with Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### **Attendance Kiosk Android Build**

#### Option 1: Using PowerShell Script (Recommended)
```powershell
.\build-kiosk-android.ps1
```

#### Option 2: Manual Steps
```bash
# 1. Build the web app
npm run build:kiosk

# 2. Copy kiosk config
Copy-Item "capacitor.config.kiosk.ts" "capacitor.config.ts" -Force

# 3. Sync with Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

---

## 🛠️ Development Commands

### HRMS Admin
```bash
# Run dev server (port 8084)
npm run dev:admin

# Build for production
npm run build:admin
```

### Employee Portal
```bash
# Run dev server (port 8082)
npm run dev:employee

# Build for production
npm run build:employee
```

### Attendance Kiosk
```bash
# Run dev server (port 8083)
npm run dev:kiosk

# Build for production
npm run build:kiosk
```

### Main HRMS Web App
```bash
# Run dev server (port 8081)
npm run dev

# Build for production
npm run build
```

---

## 📦 Output Locations

- **Admin APK**: `android-admin/app/build/outputs/apk/debug/app-debug.apk`
- **Employee Portal APK**: `android-employee/app/build/outputs/apk/debug/app-debug.apk`
- **Kiosk APK**: `android-kiosk/app/build/outputs/apk/debug/app-debug.apk`
- **Web Build**:
  - Admin: `dist-admin/`
  - Employee: `dist-employee/`
  - Kiosk: `dist-kiosk/`
  - Main: `dist/`

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------||
| `capacitor.config.admin.ts` | Admin App Capacitor config |
| `capacitor.config.employee.ts` | Employee Portal Capacitor config |
| `capacitor.config.kiosk.ts` | Kiosk Capacitor config |
| `vite.config.admin.ts` | Admin App Vite build config |
| `vite.config.employee.ts` | Employee Portal Vite build config |
| `vite.config.kiosk.ts` | Kiosk Vite build config |
| `index-admin.html` | Admin App HTML entry |
| `index-employee.html` | Employee Portal HTML entry |
| `index-kiosk.html` | Kiosk HTML entry |
| `src/main-admin.tsx` | Admin App React entry |
| `src/main-employee.tsx` | Employee Portal React entry |
| `src/main-kiosk.tsx` | Kiosk React entry |

---

## 📱 Installing APKs on Android Devices

1. Build all three apps using their respective build scripts
2. Transfer the APK files to your Android device
3. Enable "Install from Unknown Sources" in Settings
4. Open each APK file and install
5. All three apps will appear in your app drawer as separate applications
6. Each app can be installed, updated, and uninstalled independently

**Important**: Each app has a unique package ID, so they will NOT overwrite each other when installed.

---

## 🔐 Security Features

Both apps maintain full security:
- ✅ Biometric authentication support
- ✅ Password reset functionality
- ✅ Form validation
- ✅ Secure Supabase backend integration
- ✅ HTTPS communication
- ✅ Camera permissions for QR scanning and face recognition
- ✅ Push notification support for real-time updates

---

## 📲 Push Notifications Setup

### Firebase Configuration (Required for Android Push Notifications)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing
   - Add Android app with package ID:
     - Employee Portal: `com.mabdc.hrms.employee`
     - Kiosk: `com.mabdc.hrms.kiosk`

2. **Download google-services.json**
   - Download the `google-services.json` file from Firebase
   - Place it in: `android/app/google-services.json`
   - This file is required for FCM (Firebase Cloud Messaging)

3. **Configure Supabase**
   - Get your FCM Server Key from Firebase Console
   - Configure it in your Supabase Edge Functions for sending notifications

### Testing Push Notifications

1. Install the app on a physical device
2. Grant notification permissions when prompted
3. Check Logcat for FCM token registration
4. Send test notification from Firebase Console

**Note**: Push notifications require:
- Physical Android device (not emulator)
- Google Play Services installed
- Internet connection
- `google-services.json` properly configured

---

## 📷 Camera Permissions

Both apps now include camera permissions for:
- **QR Code Scanning**: Quick attendance check-in
- **Face Recognition**: Biometric authentication
- **Document Upload**: Photo capture for document submission

### Testing Camera Features

1. Install app on device with camera
2. Grant camera permission when prompted
3. Navigate to attendance scanner or face enrollment
4. Camera should activate automatically

**Permissions Included**:
- `android.permission.CAMERA`
- `android.hardware.camera` (optional)
- `android.hardware.camera.autofocus` (optional)

---

## 🎨 Customization

To change app icons or splash screens:
1. Replace images in `android/app/src/main/res/mipmap-*/` directories
2. Update `android/app/src/main/res/values/strings.xml` for app names
3. Rebuild the app

---

## 📝 Notes

- Each app uses the same Supabase backend
- All authentication and data APIs are shared
- Apps are optimized for mobile use with responsive designs
- PWA features included for web installation option

---

## 🐛 Troubleshooting

### "Package appears to be invalid"
- Run `./gradlew clean` in the `android/` directory
- Rebuild using `./gradlew assembleDebug`

### Gradle sync failed
- Check that Android Studio SDK is properly installed
- Update Gradle if prompted
- Ensure Java/JDK is correctly configured

### App crashes on launch
- Check Android Studio Logcat for errors
- Verify Supabase credentials in `.env` file
- Ensure internet connection for backend communication

---

## 📄 License

MIT License - MABDC HRMS © 2024
