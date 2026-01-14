import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mabdc.hrms.employee',
  appName: 'MABDC Employee Portal',
  webDir: 'dist-employee',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
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
