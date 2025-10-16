/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Allow external images from GitHub and YouTube
  images: {
    unoptimized: true, // keeps build simple and compatible with static exports
    domains: ["raw.githubusercontent.com", "img.youtube.com"],
  },

  // ✅ Optional: keeps URLs tidy for static builds
  trailingSlash: true,
};

export default nextConfig;
