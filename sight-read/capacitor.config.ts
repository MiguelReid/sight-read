import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ═══════════════════════════════════════════════════════════════════════════
  // APP IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Human-readable name shown under the app icon
  appName: 'SightRead',
  
  // Unique identifier (reverse domain notation)
  // IMPORTANT: Once published, this CANNOT be changed!
  // Format: com.yourcompany.appname
  // You should change 'yourname' to your actual domain/company name
  appId: 'com.sightread.app',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Directory where Next.js outputs the static build
  // With `output: 'export'` in next.config.ts, this is /out
  webDir: 'out',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER CONFIGURATION (Development)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Uncomment during development to load from Next.js dev server
  // This enables hot reload in the native app simulator
  // IMPORTANT: Comment out before building for production!
  // server: {
  //   url: 'http://192.168.1.XXX:3000',  // Your computer's local IP
  //   cleartext: true                      // Allow HTTP (not HTTPS)
  // },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // iOS CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  ios: {
    // Content inset behavior for iOS safe areas (notch, home indicator)
    // 'automatic' - System handles safe areas
    // 'scrolls' - Content scrolls behind safe areas
    // 'never' - Content never goes behind safe areas
    contentInset: 'automatic',
    
    // Preferred color scheme (follows system by default)
    // preferredContentMode: 'mobile',
    
    // Allow navigation to any URL (required for external links)
    // By default, only your app's URLs are allowed
    allowsLinkPreview: true,
    
    // Scheme for deep linking (e.g., sightread://open)
    // scheme: 'sightread',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ANDROID CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  android: {
    // Use AndroidX libraries (modern Android)
    // This is the default and recommended setting
    // useLegacyBridge: false,
    
    // Allow mixed content (HTTP in HTTPS context)
    // Only enable if you need to load insecure resources
    allowMixedContent: false,
    
    // Capture all navigation (prevents external browser opening)
    // captureInput: true,
    
    // Background color while WebView loads
    backgroundColor: '#eef1f5',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PLUGINS CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  plugins: {
    // Firebase Authentication configuration
    FirebaseAuthentication: {
      // Skip native auth - use web SDK for token handling
      skipNativeAuth: false,
      
      // Enable Google Sign-In provider
      providers: ['google.com'],
    },
    
    // Splash screen configuration
    SplashScreen: {
      // How long to show splash screen (ms)
      launchShowDuration: 2000,
      
      // Auto-hide after duration (set false to manually hide)
      launchAutoHide: true,
      
      // Background color of splash screen
      backgroundColor: '#eef1f5',
      
      // Splash screen image in Resources folder
      // You'll need to add this image to iOS/Android projects
      // launchSpinner: false,
      
      // Android-specific: full screen splash
      androidScaleType: 'CENTER_CROP',
      
      // Show spinner while loading
      showSpinner: false,
    },
    
    // Status bar configuration
    // StatusBar: {
    //   style: 'dark',        // 'dark' or 'light' content
    //   backgroundColor: '#eef1f5',
    // },
    
    // Keyboard configuration (useful for forms)
    // Keyboard: {
    //   resize: 'body',       // How page resizes when keyboard appears
    //   style: 'dark',        // Keyboard appearance
    // },
  },
};

export default config;
