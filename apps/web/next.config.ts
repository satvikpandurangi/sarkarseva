import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
