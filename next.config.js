/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 kept here so local dev still works while DATABASE_URL is unset.
  // Remove it once the Neon migration is complete and local SQLite is retired.
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth', 'postgres'],
  // ESLint runs as a dedicated CI step (npm run lint) using flat config.
  // Disabling the duplicate pass that next build runs avoids API conflicts.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
