import type { NextConfig } from "next";
import path from "path";

// Explicitly set the root for output file tracing to silence the Next.js
// warning about multiple lockfiles. This tells Next to treat THIS project
// directory as the workspace root (important if a stray package-lock.json
// exists in a parent folder like the user profile directory).
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  
  // Allow dev server access from local network (phone testing)
  allowedDevOrigins: ['http://192.168.1.110:3000'],
  
  // Static export for Capacitor native apps
  // This generates a static /out folder instead of requiring a Node server
  output: 'export',
  
  // Disable image optimization (not supported in static export)
  // If you need images, use standard <img> tags or a CDN
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
