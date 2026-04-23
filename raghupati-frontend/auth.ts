import NextAuth from "next-auth";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      // Capture GitHub OAuth access token for API calls
      if (account?.provider === "github" && account.access_token) {
        token.githubAccessToken = account.access_token;
        token.authProvider = "github";
      }
      if (account?.provider === "google") {
        token.authProvider = "google";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      // Pass provider info and GitHub token to session
      if (token.authProvider) {
        (session as any).authProvider = token.authProvider;
      }
      if (token.githubAccessToken) {
        (session as any).githubAccessToken = token.githubAccessToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin redirects
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
