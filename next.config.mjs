/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Disable Next.js image optimization so <img> uses direct URLs
  images: {
    unoptimized: true,
  },

  // ✅ Optional: ensures consistent URL structure (helps static exports)
  trailingSlash: true,
};

export default nextConfig;
