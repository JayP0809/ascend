# Database Backup and Recovery

Ascend stores data in Neon PostgreSQL (free tier). This document describes how to create a recoverable backup and restore from it. No sensitive data is committed to this file or the repository.

---

## Recovery options

### Option A — Neon branch (point-in-time snapshot, preferred)

Neon's free tier supports up to 10 branches. A branch is a copy-on-write snapshot of the database at the time it is created. Creating one before a migration or destructive operation gives you a one-click restore path in the Neon console.

**Requires:** A Neon API key (generate at console.neon.tech → Account → API Keys).

Add `NEON_API_KEY` and `NEON_PROJECT_ID` to your `.env.local`:
```
NEON_API_KEY=<your key>
NEON_PROJECT_ID=<project id from Neon console URL>
```

Create a branch before any migration:
```bash
curl -s -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"branch": {"name": "pre-migration-backup"}}' | jq '.branch.id'
```

Restore by going to console.neon.tech → your project → Branches → select the backup branch → Restore.

To delete a branch once it is no longer needed (free tier has a 10-branch limit):
```bash
curl -s -X DELETE "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/<branch-id>" \
  -H "Authorization: Bearer $NEON_API_KEY"
```

### Option B — Node.js data export (no extra credentials)

Exports all rows from every table to a JSON file. Does not capture sequences, indexes, or in-flight transactions; sufficient for the current schema (append-only user data).

```bash
node --env-file=.env.local scripts/export-backup.mjs > backup-$(date +%Y%m%d).json
```

The export script below reads every application table and writes valid JSON to stdout. Redirect it to a file outside the repository (never commit backup files — they contain user email addresses and resume content).

**`scripts/export-backup.mjs`** (create if absent):
```js
import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!rawUrl) { console.error('DATABASE_URL required'); process.exit(1); }
const u = new URL(rawUrl);
u.hostname = u.hostname.replace('-pooler', '');
u.searchParams.delete('channel_binding');
const sql = neon(u.toString());

const [users, analyses, buckets, quota, migs] = await Promise.all([
  sql`SELECT * FROM users ORDER BY created_at`,
  sql`SELECT * FROM analyses ORDER BY created_at`,
  sql`SELECT * FROM usage_buckets ORDER BY user_id, bucket_key`,
  sql`SELECT * FROM global_quota_buckets ORDER BY bucket_key`,
  sql`SELECT * FROM "__drizzle_migrations" ORDER BY created_at`,
]);

const backup = {
  timestamp: new Date().toISOString(),
  schema_version: migs.at(-1)?.hash ?? 'unknown',
  counts: { users: users.length, analyses: analyses.length,
    usage_buckets: buckets.length, global_quota_buckets: quota.length },
  data: { users, analyses, usage_buckets: buckets,
    global_quota_buckets: quota, __drizzle_migrations: migs },
};

process.stdout.write(JSON.stringify(backup, null, 2) + '\n');
process.stderr.write(`Exported: ${users.length} users, ${analyses.length} analyses\n`);
```

---

## Restore from JSON export

There is no automated restore script. To restore from a JSON export after a failed migration:

1. Create a fresh Neon branch or reset the affected tables.
2. For each table in the backup JSON, construct `INSERT ... ON CONFLICT DO NOTHING` statements from the exported rows.
3. Apply them in dependency order: `users` → `analyses` → `usage_buckets`.

For small datasets (portfolio scale), this is a manual but tractable operation.

---

## Important

- **Never commit backup files** — they contain user PII (email addresses) and resume text.
- Add `*.json.backup`, `backup-*.json` to `.gitignore` if you create regular exports.
- Neon branches are the preferred recovery path for migrations; keep at most 2–3 at a time to stay within the free-tier limit of 10.
- The migration runner (`scripts/migrate.mjs`) is idempotent — re-running it on a partially applied migration is safe.
