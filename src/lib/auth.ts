import NextAuth, { type NextAuthConfig, type Session, type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SiweMessage } from 'siwe';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: 'siwe',
      name: 'Sign-In with Ethereum',
      credentials: {
        message: { label: 'Message', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            console.error('SIWE: Missing credentials');
            return null;
          }

          // Parse SIWE message from JSON string
          const messageParams = JSON.parse(credentials.message as string);
          const siweMessage = new SiweMessage(messageParams);

          // Verify signature locally
          const result = await siweMessage.verify({
            signature: credentials.signature as string,
          });

          if (!result.success) {
            console.error('SIWE: Signature verification failed');
            return null;
          }

          // Return user object with address information
          return {
            id: siweMessage.address,
            name: `${siweMessage.address.slice(0, 6)}...${siweMessage.address.slice(-4)}`,
            email: null,
            image: null,
          } as User;
        } catch (error) {
          console.error('SIWE authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.address = (user as any).address;
        token.chainId = (user as any).chainId;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).address = token.address;
        (session.user as any).chainId = token.chainId;
      }
      return session;
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
