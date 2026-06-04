import { getDb } from "./db";

export interface AttemptRecord {
  problem_slug: string;
  title?: string;
  difficulty?: string;
  language: string;
  status: string;
  runtime?: string;
  memory?: string;
  source: "run" | "submit";
  local_file_path?: string;
}

export function recordAttempt(record: AttemptRecord): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO attempts (problem_slug, title, difficulty, language, status, runtime, memory, source, local_file_path, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.problem_slug,
    record.title || null,
    record.difficulty || null,
    record.language,
    record.status,
    record.runtime || null,
    record.memory || null,
    record.source,
    record.local_file_path || null,
    new Date().toISOString()
  );
}

export function recordSolved(record: {
  problem_slug: string;
  title: string;
  difficulty?: string;
  language: string;
  local_solution_path?: string;
  leetcode_submission_id?: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO solved_problems (problem_slug, title, difficulty, language, solved_at, local_solution_path, leetcode_submission_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.problem_slug,
    record.title,
    record.difficulty || null,
    record.language,
    new Date().toISOString(),
    record.local_solution_path || null,
    record.leetcode_submission_id || null
  );
}
