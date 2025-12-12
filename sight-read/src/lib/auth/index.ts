export type UserInfo = {
  email: string; // unique identifier for now
  emailVerified: boolean;
};

export type AuthClient = {
  signInEmail(email: string, password: string): Promise<UserInfo>;
  registerEmail(email: string, password: string): Promise<UserInfo>;
  signInGoogle(): Promise<UserInfo>;
  signOut(): Promise<void>;
  getCurrentUser(): UserInfo | null;
  onAuthChange(cb: (u: UserInfo | null) => void): () => void;
  sendEmailVerification(): Promise<void>;
};

export { authClient } from './firebaseAuthClient';
