import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache.js";

const runtimeCaching = [
  {
    urlPattern: /^https?:\/\/.*\/api\/.*/i,
    handler: "NetworkOnly",
  },
  {
    urlPattern: /^https?:\/\/.*\.supabase\.co\/.*/i,
    handler: "NetworkOnly",
  },
  ...defaultRuntimeCaching,
];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev mode
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateEtags: false,
};

export default withPWA(nextConfig);
