/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    "10.97.97.41",
    "192.168.0.2",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
