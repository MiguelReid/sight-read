"use client";
import Link from 'next/link';
import Image from 'next/image';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../../../lib/firebase';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
 
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useSearchParams();
  const needsVerify = search.get('verify') === 'true';
  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold">SR</div>
          <h1 className="mt-4 text-2xl font-semibold">Sign in to SightRead</h1>
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {needsVerify && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              Please verify your email first. Check your inbox for the confirmation link.
            </div>
          )}
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
          <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="/password_reset" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError(null);
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                if (!cred.user.emailVerified) {
                  setError('Please verify your email before signing in. Check your inbox for the confirmation link.');
                  // Optional: sign out to clear auth state if unverified
                  await auth.signOut();
                  return;
                }
                window.location.href = '/';
              } catch (err) {
                const msg = typeof err === 'object' && err && 'message' in err ? (err as { message: string }).message : 'Failed to sign in';
                setError(msg);
              } finally {
                setLoading(false);
              }
            }}
            className="mt-6 w-full inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Sign in"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="my-6 flex items-center">
            <div className="grow border-t border-gray-200" />
            <span className="mx-3 text-sm text-gray-500">or</span>
            <div className="grow border-t border-gray-200" />
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await signInWithPopup(auth, googleProvider);
                window.location.href = '/';
              } catch (err) {
                const code = typeof err === 'object' && err && 'code' in err ? (err as { code: string }).code : '';
                if (code === 'auth/popup-closed-by-user') {
                  // Do nothing
                  return;
                }
                const msg = typeof err === 'object' && err && 'message' in err ? (err as { message: string }).message : 'Google sign-in failed';
                setError(msg);
              }
            }}
            className="w-full px-4 py-2 flex items-center justify-center gap-2 rounded-lg bg-gray-600 text-black hover:bg-gray-400 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-slate-600 hover:shadow transition duration-150"
            aria-label="Sign in with Google"
          >
            <Image src="/google-icon.svg" alt="Google logo" width={24} height={24} />
            <span>Sign in with Google</span>
          </button>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-600">New to SightRead?</span>
            <Link href="/create_account" className="font-medium text-emerald-700 hover:text-emerald-800">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
