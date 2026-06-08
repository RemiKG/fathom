/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // The voyage media store lives on disk (or object storage) — never bundled.
  // No output:standalone (it breaks `next start` on some Windows hosts).
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        // The MCP + streaming endpoints must not be cached by intermediaries.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
