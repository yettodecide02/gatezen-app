export default ({ config }) => ({
  ...config,
  expo: {
    name: "CGate",
    slug: "cgate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "gatezenapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yettodecide.gatezenapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
      permissions: ["android.permission.CAMERA"],
      package: "com.yettodecide.gatezenapp",
      googleServicesFile: "./google-services.json",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
        },
      ],
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow $(PRODUCT_NAME) to access your camera for barcode scanning.",
        },
      ],
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#6366F1",
          sounds: [],
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
          },
          ios: {
            deploymentTarget: "15.1",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "e56eade6-43e3-4685-9a58-f6b20f009650",
      },
      // Inject environment variables here so they're baked into the build
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        "https://lycnyrqtrlytydbjdput.supabase.co",
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Y255cnF0cmx5dHlkYmpkcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODg1NTcsImV4cCI6MjA3MTg2NDU1N30.pv7awgJ7FUDGxTTAQUkuRsJeg9lakKPh89lzTd9G5Do",
      backendUrl:
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        "https://gatezen-starter-rh69.vercel.app/",
      googleSignupPassword:
        process.env.EXPO_PUBLIC_GOOGLE_SIGNUP_PASSWORD || "1234567890",
    },
  },
});
