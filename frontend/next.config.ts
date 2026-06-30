import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow API calls to VPS
  serverExternalPackages: [],
  async rewrites() {
    return [
      {
        // Proxy WS endpoint through Vercel so the browser doesn't block
        // mixed-content WebSocket (HTTPS page → ws:// is blocked).
        // Vercel terminates TLS and proxies plain WS to the VPS backend.
        source: '/api/chat',
        destination: 'http://95.217.7.149:8080/api/chat',
      },
    ];
  },
};

export default nextConfig;
