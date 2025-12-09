"use client";

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
	const { data: session, status } = useSession();
	const loading = status === 'loading';

	return (
		<div className="mx-auto mt-10 max-w-md rounded-lg border border-gray-200 p-6 md:mt-16 md:max-w-lg md:p-8">
			<h1 className="m-0 text-2xl font-semibold">Account</h1>
			<p className="mt-2 text-gray-500">Sign in with Google to save preferences.</p>

			{loading && <div className="mt-4">Checking session…</div>}

			{!loading && !session && (
				<div className="mt-5">
					<button
						onClick={() => signIn('google', { callbackUrl: '/' })}
						className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Continue with Google
					</button>
				</div>
			)}

			{!loading && session && (
				<div className="mt-4">
					<div className="mb-3">
						<div className="font-semibold">Signed in</div>
						<div className="text-gray-700">{session.user?.name || session.user?.email}</div>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => signOut({ callbackUrl: '/' })}
							className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						>
							Sign out
						</button>
						<Link href="/" className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
							Go to app
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
