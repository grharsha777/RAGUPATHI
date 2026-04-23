import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-table"],
  },
  // Load .env.local from the monorepo root (one directory up)
  env: {},
};

// Tell Next.js to also look for .env.local in the parent directory
// This is handled automatically when we set the working directory,
// but we explicitly configure it for clarity
export default nextConfig;
