"use client";
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
 
export default function LoginPage() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold">SR</div>
          <h1 className="mt-4 text-2xl font-semibold">Sign in to SightRead</h1>
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
          <input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="/password_reset" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          <button type="button" className="mt-6 w-full inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" aria-label="Sign in">Sign In</button>
          <div className="my-6 flex items-center">
            <div className="grow border-t border-gray-200" />
            <span className="mx-3 text-sm text-gray-500">or</span>
            <div className="grow border-t border-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full px-4 py-2 border flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:text-black dark:hover:text-slate-300 hover:shadow transition duration-150"
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
