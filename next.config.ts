import type { NextConfig } from "next";

// Static export so the site can be hosted on GitHub Pages.
// Set NEXT_PUBLIC_BASE_PATH (e.g. "/akua-fields-showcase") when deploying to a
// project page; leave it empty for user/org pages or local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
