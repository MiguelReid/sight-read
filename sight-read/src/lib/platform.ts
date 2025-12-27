// Detect if running inside Capacitor native app
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  
  const capacitor = (window as any).Capacitor;
  if (capacitor?.isNativePlatform?.()) {
    const platform = capacitor.getPlatform?.();
    if (platform === 'ios' || platform === 'android') return platform;
  }
  return 'web';
}
