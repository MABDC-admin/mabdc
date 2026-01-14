import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mabdc.hrms.admin',
  appName: 'MABDC HRMS Admin',
  webDir: 'dist-admin',
  android: {
    path: 'android-admin',
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
