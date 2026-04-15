import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

const providers = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

providers.push(
  Credentials({
    id: "operator",
    name: "Operator access",
    credentials: {
      passphrase: { label: "Passphrase", type: "password" },
    },
    authorize: async (credentials) => {
      const passphrase = credentials?.passphrase;
      const expected = process.env.AUTH_OPERATOR_PASSPHRASE;
      if (!expected || typeof passphrase !== "string") {
        return null;
      }
      const encoder = new TextEncoder();
      const a = encoder.encode(passphrase);
      const b = encoder.encode(expected);
      if (a.length !== b.length) {
        return null;
      }
      let ok = 0;
      for (let i = 0; i < a.length; i += 1) {
        ok |= a[i] ^ b[i];
      }
      if (ok !== 0) {
        return null;
      }
      return {
        id: "operator",
        name: "Security Operator",
        email: "operator@raghupati.security",
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
