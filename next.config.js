/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth'],
  // ESLint runs as a dedicated CI step (npm run lint) using flat config.
  // Disabling the duplicate pass that next build runs avoids API conflicts.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
