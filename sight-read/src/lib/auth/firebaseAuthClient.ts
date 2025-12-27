import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, signOut as fbSignOut, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import type { AuthClient, UserInfo } from './index';
import { isNativeApp } from '../platform';

const normalize = (email: string | null, verified: boolean): UserInfo | null => {
  if (!email) return null;
  return { email, emailVerified: verified };
};

// Native Google Sign-In using Capacitor Firebase Auth
async function signInGoogleNative(): Promise<UserInfo> {
  // Dynamically import to avoid issues on web
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  
  // Sign in with native Google UI
  const result = await FirebaseAuthentication.signInWithGoogle();
  
  // Get the ID token to authenticate with Firebase web SDK
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error('No ID token received from Google Sign-In');
  
  // Create Firebase credential and sign in
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  
  const user = normalize(cred.user.email, cred.user.emailVerified);
  if (!user) throw new Error('Invalid user');
  return user;
}

// Web Google Sign-In using popup
async function signInGoogleWeb(): Promise<UserInfo> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = normalize(cred.user.email, cred.user.emailVerified);
  if (!user) throw new Error('Invalid user');
  return user;
}

export const authClient: AuthClient = {
  async signInEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = normalize(cred.user.email, cred.user.emailVerified);
    if (!user) throw new Error('Invalid user');
    return user;
  },
  async registerEmail(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    const user = normalize(cred.user.email, cred.user.emailVerified);
    if (!user) throw new Error('Invalid user');
    return user;
  },
  async signInGoogle() {
    // Use native sign-in on Capacitor, web popup otherwise
    if (isNativeApp()) {
      return signInGoogleNative();
    }
    return signInGoogleWeb();
  },
  async signOut() {
    // Sign out from both Firebase and native (if applicable)
    if (isNativeApp()) {
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
      } catch {
        // Ignore if native sign-out fails
      }
    }
    await fbSignOut(auth);
  },
  getCurrentUser() {
    return normalize(auth.currentUser?.email ?? null, auth.currentUser?.emailVerified ?? false);
  },
  onAuthChange(cb) {
    return onAuthStateChanged(auth, (u) => cb(normalize(u?.email ?? null, u?.emailVerified ?? false)));
  },
  async sendEmailVerification() {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }
};
