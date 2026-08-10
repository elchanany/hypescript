/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows isolated local QA/builds without colliding with an editor server
  // that is already using the default .next directory.
  distDir: process.env.HYPESCRIPT_NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
