/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In production the Express backend runs on port 3000 (same container)
    // In local dev it also runs on 3000
    const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
