import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import type { AuthClient, UserInfo } from './index';

const normalize = (email: string | null, verified: boolean): UserInfo | null => {
  if (!email) return null;
  return { email, emailVerified: verified };
};

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
    const cred = await signInWithPopup(auth, googleProvider);
    const user = normalize(cred.user.email, cred.user.emailVerified);
    if (!user) throw new Error('Invalid user');
    return user;
  },
  async signOut() {
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
