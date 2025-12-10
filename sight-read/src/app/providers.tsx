"use client";
import FirebaseAuthProvider from '../../components/FirebaseAuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
