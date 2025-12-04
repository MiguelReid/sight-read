'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Account</h1>
      <p style={{ color: '#6b7280', marginTop: 6 }}>Sign in with Google to save preferences.</p>

      {loading && <div style={{ marginTop: 16 }}>Checking session…</div>}

      {!loading && !session && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            style={{
              padding: '10px 14px',
              background: '#1e90ff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Continue with Google
          </button>
        </div>
      )}

      {!loading && session && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>Signed in</div>
            <div style={{ color: '#374151' }}>{session.user?.name || session.user?.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{
                padding: '10px 14px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
