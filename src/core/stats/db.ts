import Database from "better-sqlite3";
import path from "path";
import { getWorkspacePath } from "../config/config";
import fs from "fs-extra";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const workspacePath = getWorkspacePath();
  fs.ensureDirSync(workspacePath);
  const dbPath = path.join(workspacePath, "lcx.sqlite");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_slug TEXT NOT NULL,
      title TEXT,
      difficulty TEXT,
      language TEXT,
      status TEXT NOT NULL,
      runtime TEXT,
      memory TEXT,
      source TEXT NOT NULL,
      local_file_path TEXT,
      attempted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS solved_problems (
      problem_slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT,
      language TEXT,
      solved_at TEXT NOT NULL,
      local_solution_path TEXT,
      leetcode_submission_id TEXT
    );

    CREATE TABLE IF NOT EXISTS problem_cache (
      problem_slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT,
      paid_only INTEGER DEFAULT 0,
      tags TEXT,
      frontend_id TEXT,
      cached_at TEXT NOT NULL
    );
  `);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
