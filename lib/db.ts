import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'ascend.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      resume_text TEXT NOT NULL,
      target_role TEXT NOT NULL,
      job_description TEXT,
      readiness_score REAL NOT NULL DEFAULT 0,
      result_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_records (
      id TEXT NOT NULL,
      analysis_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      category TEXT NOT NULL,
      has_skill INTEGER NOT NULL DEFAULT 0,
      importance TEXT NOT NULL,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id)
    );

    CREATE TABLE IF NOT EXISTS roadmap_phases (
      id TEXT NOT NULL,
      analysis_id TEXT NOT NULL,
      week_start INTEGER NOT NULL,
      week_end INTEGER NOT NULL,
      focus_area TEXT NOT NULL,
      topics_json TEXT NOT NULL,
      resources_json TEXT NOT NULL,
      project_json TEXT NOT NULL,
      milestone TEXT NOT NULL,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id)
    );

    CREATE TABLE IF NOT EXISTS community (
      id TEXT PRIMARY KEY,
      target_role TEXT NOT NULL,
      readiness_score REAL NOT NULL,
      top_gap TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1
    );
  `);
}

export const db = {
  getDb,

  saveAnalysis(
    id: string,
    resumeText: string,
    targetRole: string,
    jobDescription: string | null,
    readinessScore: number,
    resultJson: string
  ): void {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO analyses
        (id, created_at, resume_text, target_role, job_description, readiness_score, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, new Date().toISOString(), resumeText, targetRole, jobDescription, readinessScore, resultJson);
  },

  getAnalysis(id: string): { id: string; result_json: string; target_role: string; resume_text: string } | undefined {
    const database = getDb();
    const stmt = database.prepare('SELECT id, result_json, target_role, resume_text FROM analyses WHERE id = ?');
    return stmt.get(id) as { id: string; result_json: string; target_role: string; resume_text: string } | undefined;
  },

  saveSkillRecords(records: Array<{
    id: string; analysisId: string; skillName: string;
    category: string; hasSkill: boolean; importance: string;
  }>): void {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT INTO skill_records (id, analysis_id, skill_name, category, has_skill, importance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = database.transaction((rows: typeof records) => {
      for (const row of rows) {
        stmt.run(row.id, row.analysisId, row.skillName, row.category, row.hasSkill ? 1 : 0, row.importance);
      }
    });
    insertMany(records);
  },

  saveCommunityEntry(id: string, targetRole: string, readinessScore: number, topGap: string): void {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO community (id, target_role, readiness_score, top_gap, created_at, is_public)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    stmt.run(id, targetRole, readinessScore, topGap, new Date().toISOString());
  },

  getCommunityEntries(limit = 20): Array<{
    id: string; target_role: string; readiness_score: number;
    top_gap: string; created_at: string;
  }> {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT id, target_role, readiness_score, top_gap, created_at
      FROM community
      WHERE is_public = 1
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<{
      id: string; target_role: string; readiness_score: number;
      top_gap: string; created_at: string;
    }>;
  },

  getTrendingSkills(): Array<{ skill: string; count: number }> {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT top_gap as skill, COUNT(*) as count
      FROM community
      WHERE is_public = 1
      GROUP BY top_gap
      ORDER BY count DESC
      LIMIT 8
    `);
    return stmt.all() as Array<{ skill: string; count: number }>;
  },

  getPopularRoles(): Array<{ role: string; count: number }> {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT target_role as role, COUNT(*) as count
      FROM community
      WHERE is_public = 1
      GROUP BY target_role
      ORDER BY count DESC
      LIMIT 10
    `);
    return stmt.all() as Array<{ role: string; count: number }>;
  },
};
