"use client";
import Link from 'next/link';
import { useState } from 'react';
import { authClient } from '../../../lib/auth';
import { mapAuthError } from '../../../lib/auth/errorMessages';

export default function CreateAccountPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  return (
    <div className="min-h-[60vh] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {!registered ? (
        <>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-gray-600">Start using SightRead by creating an account.</p>
        <label htmlFor="email" className="mt-4 block text-sm font-medium text-gray-700">Email address</label>
        <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
        <label htmlFor="password" className="mt-4 block text-sm font-medium text-gray-700">Password</label>
        <input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            try {
              setLoading(true);
              setError(null);
              await authClient.registerEmail(email.trim(), password);
              setRegistered(true);
            } catch (err) {
              const code = typeof err === 'object' && err && 'code' in err ? (err as { code: string }).code : undefined;
              const friendly = mapAuthError(code);
              setError(friendly);
            } finally {
              setLoading(false);
            }
          }}
          className="mt-6 w-full inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Already have an account?</span>{' '}
          <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">Sign in</Link>
        </div>
        </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold">✔</div>
              <h2 className="mt-4 text-xl font-semibold">Thanks for registering!</h2>
              <p className="mt-2 text-sm text-gray-700">We sent a confirmation email to <span className="font-medium">{email}</span>. Please verify your email, then sign in below.</p>
            </div>
            <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Go to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
