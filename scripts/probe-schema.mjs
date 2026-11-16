// Probe 4: test neon.transaction() with array of queries + SET LOCAL
import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DIRECT_DATABASE_URL;
const directSql = neon(rawUrl);
const schema = 'ascend_int_' + Date.now();

try {
  await directSql.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await directSql.query(`CREATE TABLE IF NOT EXISTS "${schema}".test_users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), val TEXT)`);
  console.log('created schema + table:', schema);

  // Test: neon.transaction() with array [SET LOCAL, INSERT]
  try {
    const result = await directSql.transaction([
      directSql.query(`SET LOCAL search_path = "${schema}"`),
      directSql.query(`INSERT INTO test_users (val) VALUES ('txn_array_test') RETURNING val`),
    ]);
    console.log('transaction array result:', JSON.stringify(result));
    const committed = await directSql`SELECT COUNT(*) as cnt FROM "${schema}".test_users WHERE val = 'txn_array_test'`;
    console.log('transaction committed to test schema?', committed[0].cnt > 0 ? 'YES ✓' : 'NO ✗');
  } catch(e) {
    console.log('transaction array error:', e.message.slice(0, 200));
    // Check if the query might have failed for wrong reason
    if (e.message.includes('relation')) {
      console.log('→ The SET LOCAL did NOT persist across queries in the transaction');
    }
  }

  // Check if fully-qualified names work in transaction
  try {
    const result2 = await directSql.transaction([
      directSql.query(`INSERT INTO "${schema}".test_users (val) VALUES ('txn_qualified') RETURNING val`),
    ]);
    console.log('schema-qualified INSERT in transaction:', JSON.stringify(result2));
  } catch(e) { console.log('qualified insert error:', e.message.slice(0, 100)); }

} finally {
  await directSql.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
  console.log('cleaned up');
}
