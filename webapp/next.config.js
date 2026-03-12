/** @type {import('next').NextConfig} */
const nextConfig = {};

let moduleExport = nextConfig;
try {
  const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
  });
  moduleExport = withPWA(nextConfig);
} catch (_) {
  // PWA package optional; build works without it (manifest still used)
}

module.exports = moduleExport;
