import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { BoxConfig, BaseplateConfig } from '../types/config.js';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'gridfinity.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db: Database.Database = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Saved preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      box_config TEXT,
      baseplate_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON saved_preferences(user_id)
  `);
}

// User operations
export const userDb = {
  create: (email: string, passwordHash: string) => {
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const result = stmt.run(email, passwordHash);
    return result.lastInsertRowid as number;
  },

  findByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as { id: number; email: string; password_hash: string; created_at: string; updated_at: string } | undefined;
  },

  findById: (id: number) => {
    const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
    return stmt.get(id) as { id: number; email: string; created_at: string } | undefined;
  },
};

// Preferences operations
export interface SavedPreference {
  id: number;
  user_id: number;
  name: string;
  box_config: BoxConfig | null;
  baseplate_config: BaseplateConfig | null;
  created_at: string;
  updated_at: string;
}

export const preferencesDb = {
  create: (userId: number, name: string, boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => {
    const stmt = db.prepare(`
      INSERT INTO saved_preferences (user_id, name, box_config, baseplate_config)
      VALUES (?, ?, ?, ?)
    `);
    const boxConfigJson = boxConfig ? JSON.stringify(boxConfig) : null;
    const baseplateConfigJson = baseplateConfig ? JSON.stringify(baseplateConfig) : null;
    const result = stmt.run(userId, name, boxConfigJson, baseplateConfigJson);
    return result.lastInsertRowid as number;
  },

  update: (id: number, userId: number, name: string, boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => {
    const stmt = db.prepare(`
      UPDATE saved_preferences
      SET name = ?, box_config = ?, baseplate_config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    const boxConfigJson = boxConfig ? JSON.stringify(boxConfig) : null;
    const baseplateConfigJson = baseplateConfig ? JSON.stringify(baseplateConfig) : null;
    stmt.run(name, boxConfigJson, baseplateConfigJson, id, userId);
  },

  findAllByUserId: (userId: number): SavedPreference[] => {
    const stmt = db.prepare('SELECT * FROM saved_preferences WHERE user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      box_config: row.box_config ? JSON.parse(row.box_config) : null,
      baseplate_config: row.baseplate_config ? JSON.parse(row.baseplate_config) : null,
    }));
  },

  findById: (id: number, userId: number): SavedPreference | undefined => {
    const stmt = db.prepare('SELECT * FROM saved_preferences WHERE id = ? AND user_id = ?');
    const row = stmt.get(id, userId) as any;
    if (!row) return undefined;
    return {
      ...row,
      box_config: row.box_config ? JSON.parse(row.box_config) : null,
      baseplate_config: row.baseplate_config ? JSON.parse(row.baseplate_config) : null,
    };
  },

  delete: (id: number, userId: number) => {
    const stmt = db.prepare('DELETE FROM saved_preferences WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
  },
};

// Initialize on import
initializeDatabase();

export default db;
