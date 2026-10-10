import {fileURLToPath} from 'node:url';
/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : {output: 'standalone'}),
  outputFileTracingRoot: fileURLToPath(new URL('..', import.meta.url)),
  outputFileTracingExcludes: {'/*': ['./ai/data/**/*', '../ai/data/**/*']},
  // Keep validation builds separate from a concurrently running development server.
  distDir: process.env.RYVIX_NEXT_DIST_DIR || '.next',
  allowedDevOrigins: [
    "10.97.97.41",
    "192.168.0.2",
    "172.31.80.1",    // WSL internal gateway / local VM adapter
    "172.31.0.0/16",  // full WSL subnet range
    "192.168.0.0/16", // local LAN subnet range
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
