import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { BoxConfig, BaseplateConfig } from '../types/config.js';

// Determine which database to use based on DATABASE_URL
// Railway provides DATABASE_URL for PostgreSQL services
// If not set, fall back to SQLite for local development
const usePostgres = !!process.env.DATABASE_URL;

// SQLite setup (for local development)
let sqliteDb: Database.Database | null = null;
if (!usePostgres) {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'gridfinity.db');
  const dataDir = path.dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
}

// PostgreSQL setup (for Railway production)
let pgPool: Pool | null = null;
if (usePostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : undefined,
  });
}

// Convert SQLite-style ? parameters to PostgreSQL $1, $2, etc.
function convertQuery(query: string): string {
  if (!usePostgres) return query;
  let paramIndex = 1;
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

// Database abstraction layer
interface DbResult {
  lastInsertRowid?: number | string;
  rows?: any[];
  row?: any;
}

async function dbQuery(query: string, params: any[] = []): Promise<DbResult> {
  if (usePostgres && pgPool) {
    const pgQuery = convertQuery(query);
    const result = await pgPool.query(pgQuery, params);
    return {
      rows: result.rows,
      row: result.rows[0],
      lastInsertRowid: result.rows[0]?.id,
    };
  } else if (sqliteDb) {
    // SQLite uses ? for parameters
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = sqliteDb.prepare(query);
      const rows = stmt.all(...params) as any[];
      return { rows, row: rows[0] };
    } else {
      const stmt = sqliteDb.prepare(query);
      const result = stmt.run(...params);
      return { lastInsertRowid: result.lastInsertRowid as number };
    }
  }
  throw new Error('No database connection available');
}

async function dbExec(query: string): Promise<void> {
  if (usePostgres && pgPool) {
    await pgPool.query(query);
  } else if (sqliteDb) {
    sqliteDb.exec(query);
  } else {
    throw new Error('No database connection available');
  }
}

// Initialize schema
export async function initializeDatabase() {
  if (usePostgres && pgPool) {
    // PostgreSQL schema
    await dbExec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbExec(`
      CREATE TABLE IF NOT EXISTS saved_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        box_config TEXT,
        baseplate_config TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `);

    await dbExec(`
      CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON saved_preferences(user_id)
    `);

    await dbExec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);

    await dbExec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)
    `);
  } else if (sqliteDb) {
    // SQLite schema (synchronous execution)
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.exec(`
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

    sqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON saved_preferences(user_id)
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);

    sqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)
    `);
  }
}

// User operations
export const userDb = {
  create: async (email: string, passwordHash: string): Promise<number> => {
    if (usePostgres && pgPool) {
      // PostgreSQL supports RETURNING
      const result = await dbQuery(
        'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id',
        [email, passwordHash]
      );
      return Number(result.lastInsertRowid);
    } else if (sqliteDb) {
      // SQLite doesn't support RETURNING, use lastInsertRowid
      const result = await dbQuery(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, passwordHash]
      );
      return Number(result.lastInsertRowid);
    }
    throw new Error('No database connection available');
  },

  findByEmail: async (email: string) => {
    const result = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
    return result.row as { id: number; email: string; password_hash: string; created_at: string; updated_at: string } | undefined;
  },

  findById: async (id: number) => {
    const result = await dbQuery('SELECT id, email, created_at FROM users WHERE id = ?', [id]);
    return result.row as { id: number; email: string; created_at: string } | undefined;
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
  create: async (userId: number, name: string, boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null): Promise<number> => {
    const boxConfigJson = boxConfig ? JSON.stringify(boxConfig) : null;
    const baseplateConfigJson = baseplateConfig ? JSON.stringify(baseplateConfig) : null;
    
    if (usePostgres && pgPool) {
      const result = await dbQuery(
        `INSERT INTO saved_preferences (user_id, name, box_config, baseplate_config)
         VALUES (?, ?, ?, ?) RETURNING id`,
        [userId, name, boxConfigJson, baseplateConfigJson]
      );
      return Number(result.lastInsertRowid);
    } else if (sqliteDb) {
      const result = await dbQuery(
        `INSERT INTO saved_preferences (user_id, name, box_config, baseplate_config)
         VALUES (?, ?, ?, ?)`,
        [userId, name, boxConfigJson, baseplateConfigJson]
      );
      return Number(result.lastInsertRowid);
    }
    throw new Error('No database connection available');
  },

  update: async (id: number, userId: number, name: string, boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => {
    const boxConfigJson = boxConfig ? JSON.stringify(boxConfig) : null;
    const baseplateConfigJson = baseplateConfig ? JSON.stringify(baseplateConfig) : null;
    await dbQuery(
      `UPDATE saved_preferences
       SET name = ?, box_config = ?, baseplate_config = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name, boxConfigJson, baseplateConfigJson, id, userId]
    );
  },

  findAllByUserId: async (userId: number): Promise<SavedPreference[]> => {
    const result = await dbQuery('SELECT * FROM saved_preferences WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    const rows = result.rows || [];
    return rows.map(row => ({
      ...row,
      box_config: row.box_config ? JSON.parse(row.box_config) : null,
      baseplate_config: row.baseplate_config ? JSON.parse(row.baseplate_config) : null,
    }));
  },

  findById: async (id: number, userId: number): Promise<SavedPreference | undefined> => {
    const result = await dbQuery('SELECT * FROM saved_preferences WHERE id = ? AND user_id = ?', [id, userId]);
    if (!result.row) return undefined;
    return {
      ...result.row,
      box_config: result.row.box_config ? JSON.parse(result.row.box_config) : null,
      baseplate_config: result.row.baseplate_config ? JSON.parse(result.row.baseplate_config) : null,
    };
  },

  delete: async (id: number, userId: number) => {
    await dbQuery('DELETE FROM saved_preferences WHERE id = ? AND user_id = ?', [id, userId]);
  },
};

// Feedback operations
export interface Feedback {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const feedbackDb = {
  create: async (userId: number, title: string, content: string): Promise<number> => {
    if (usePostgres && pgPool) {
      const result = await dbQuery(
        'INSERT INTO feedback (user_id, title, content) VALUES (?, ?, ?) RETURNING id',
        [userId, title, content]
      );
      return Number(result.lastInsertRowid);
    } else if (sqliteDb) {
      const result = await dbQuery(
        'INSERT INTO feedback (user_id, title, content) VALUES (?, ?, ?)',
        [userId, title, content]
      );
      return Number(result.lastInsertRowid);
    }
    throw new Error('No database connection available');
  },

  findByUserId: async (userId: number): Promise<Feedback | undefined> => {
    const result = await dbQuery('SELECT * FROM feedback WHERE user_id = ?', [userId]);
    return result.row as Feedback | undefined;
  },

  findAll: async (): Promise<Feedback[]> => {
    const result = await dbQuery('SELECT * FROM feedback ORDER BY created_at DESC');
    return (result.rows || []) as Feedback[];
  },

  update: async (id: number, userId: number, title: string, content: string) => {
    await dbQuery(
      `UPDATE feedback
       SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, content, id, userId]
    );
  },
};

// Initialize on import
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Cleanup on process exit
if (pgPool) {
  process.on('SIGINT', async () => {
    await pgPool?.end();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pgPool?.end();
    process.exit(0);
  });
}

export default { sqliteDb, pgPool };
