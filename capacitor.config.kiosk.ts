import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mabdc.hrms.kiosk',
  appName: 'MABDC Attendance Kiosk',
  webDir: 'dist-kiosk',
  android: {
    path: 'android-kiosk',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      quality: 90,
      allowEditing: false,
      resultType: 'uri'
    }
  }
};

export default config;
