export default function PasswordResetPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">Enter your email to receive a reset link.</p>
        <label htmlFor="email" className="mt-4 block text-sm font-medium text-gray-700">Email address</label>
        <input id="email" type="email" placeholder="you@example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600" />
        <button type="button" className="mt-6 w-full inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Send reset email</button>
      </div>
    </div>
  );
}
