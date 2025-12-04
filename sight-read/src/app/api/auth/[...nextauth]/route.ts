import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    }),
  ],
  secret: requireEnv('NEXTAUTH_SECRET'),
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
