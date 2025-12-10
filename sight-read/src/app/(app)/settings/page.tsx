"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User } from "firebase/auth";
import { auth } from "../../../lib/firebase";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="mx-auto mt-10 max-w-lg p-6 md:mt-16 md:max-w-xl md:p-8">
      <h1 className="m-0 text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-gray-500">Manage your account and app preferences.</p>

      {loading && <div className="mt-4">Checking session…</div>}

      {!loading && !user && (
        <div className="mt-4">
          <p className="mb-3">You’re not signed in.</p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to login
          </Link>
        </div>
      )}

      {!loading && user && (
        <div className="mt-4">
          <div className="mb-3">
            <div className="font-semibold">Signed in as</div>
            <div className="text-gray-700">{user.displayName || user.email}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await firebaseSignOut(auth);
                window.location.href = "/";
              }}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
