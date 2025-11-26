import type { NextConfig } from "next";
import path from "path";

// Explicitly set the root for output file tracing to silence the Next.js
// warning about multiple lockfiles. This tells Next to treat THIS project
// directory as the workspace root (important if a stray package-lock.json
// exists in a parent folder like the user profile directory).
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
