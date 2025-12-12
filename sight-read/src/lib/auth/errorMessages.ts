export function mapAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-api-key':
      return 'Configuration error: invalid API key. Please check environment setup.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Popup closed before completing sign-in.';
    case 'auth/user-not-found':
      return 'No account found for that email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account exists with a different sign-in method for this email.';
    case 'auth/operation-not-allowed':
      return 'Sign-in method not enabled. Please contact support.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
