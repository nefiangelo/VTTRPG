import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

let db: Database.Database | null = null

/**
 * Returns the singleton SQLite connection, creating it on first call.
 * The database file lives in Electron's userData directory and persists
 * across app restarts.
 */
export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'vttrpg.db')
  db = new Database(dbPath)

  // WAL mode gives better read concurrency; foreign keys enforced globally
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  return db
}

function runMigrations(db: Database.Database): void {
  // ── Users ──────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email      TEXT    UNIQUE COLLATE NOCASE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // ── RPG Systems ────────────────────────────────────────────────────────────
  // Stores the structural schema of a rule system (attribute slots, dice set,
  // sheet template). NOT the content catalog — that lives in system_content.
  db.exec(`
    CREATE TABLE IF NOT EXISTS rpg_systems (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      slug        TEXT    NOT NULL UNIQUE,
      version     TEXT,
      genre       TEXT,
      description TEXT,
      structure   TEXT    NOT NULL DEFAULT '{}',
      created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_downloaded INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // ── Homebrews ──────────────────────────────────────────────────────────────
  // Metadata for a homebrew pack. Actual content entries are rows in
  // system_content with homebrew_id pointing here.
  db.exec(`
    CREATE TABLE IF NOT EXISTS homebrews (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      rpg_system_id   INTEGER NOT NULL REFERENCES rpg_systems(id) ON DELETE CASCADE,
      created_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT    NOT NULL,
      description     TEXT,
      is_public       INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // ── System Content ─────────────────────────────────────────────────────────
  // The content catalog: Classes, Races, Subclasses, Spells, Feats, Items, etc.
  // homebrew_id = NULL  → official core content bundled with the system
  // homebrew_id = X     → added by homebrew pack X
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_content (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      rpg_system_id   INTEGER NOT NULL REFERENCES rpg_systems(id) ON DELETE CASCADE,
      homebrew_id     INTEGER          REFERENCES homebrews(id)   ON DELETE CASCADE,
      type            TEXT    NOT NULL,
      name            TEXT    NOT NULL,
      data            TEXT    NOT NULL DEFAULT '{}',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_system_content_system  ON system_content(rpg_system_id);
    CREATE INDEX IF NOT EXISTS idx_system_content_homebrew ON system_content(homebrew_id);
    CREATE INDEX IF NOT EXISTS idx_system_content_type    ON system_content(rpg_system_id, type);
  `)

  // ── Campaigns ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT    NOT NULL,
      description     TEXT,
      status          TEXT    NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','paused','finished')),
      rpg_system_id   INTEGER NOT NULL REFERENCES rpg_systems(id) ON DELETE RESTRICT,
      owner_id        INTEGER NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
      is_downloaded   INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // ── Campaign Members ───────────────────────────────────────────────────────
  // Role is per-membership: a user can be GM in one campaign, player in another.
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_members (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
      role          TEXT    NOT NULL DEFAULT 'player'
                            CHECK (role IN ('gm','player','observer')),
      joined_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (campaign_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_members_user     ON campaign_members(user_id);
  `)

  // ── Campaign Homebrews ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_homebrews (
      campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      homebrew_id   INTEGER NOT NULL REFERENCES homebrews(id) ON DELETE CASCADE,
      PRIMARY KEY (campaign_id, homebrew_id)
    );
  `)

  // ── Characters / Sheets ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid                  TEXT    UNIQUE,
      campaign_id           INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id               INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
      rpg_system_id         INTEGER REFERENCES rpg_systems(id) ON DELETE RESTRICT,
      system_slug           TEXT,
      name                  TEXT    NOT NULL,
      avatar_url            TEXT,
      role                  TEXT    NOT NULL DEFAULT 'pc'
                                    CHECK (role IN ('pc','npc','enemy')),
      sheet_data            TEXT    NOT NULL DEFAULT '{}',
      origin_character_uuid TEXT,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_characters_user     ON characters(user_id);
    CREATE INDEX IF NOT EXISTS idx_characters_uuid     ON characters(uuid);
  `)

  // ── Sessions ───────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      title         TEXT,
      status        TEXT    NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled','active','completed')),
      started_at    TEXT,
      ended_at      TEXT,
      notes         TEXT,
      access_code   TEXT,
      server_url    TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id);
  `)

  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN access_code TEXT;`)
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN server_url TEXT;`)
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN updated_at TEXT;`)
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN is_downloaded INTEGER DEFAULT 0;`)
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE rpg_systems ADD COLUMN is_downloaded INTEGER DEFAULT 0;`)
  } catch {
    // Column already exists
  }

  // ── Session Messages ───────────────────────────────────────────────────────
  // One row per chat message. user_id = NULL for system/server events.
  // type 'roll' stores content as JSON: { expression, result, rolls[] }
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_messages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      user_id       INTEGER          REFERENCES users(id)    ON DELETE SET NULL,
      type          TEXT    NOT NULL DEFAULT 'ooc'
                            CHECK (type IN ('ic','ooc','roll','system')),
      content       TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);
  `)

  // ── Campaign Nodes (Pastas, Arquivos, Fichas, Notas, Imagens, etc.) ────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_nodes (
      id            TEXT    PRIMARY KEY,
      campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      parent_id     TEXT    REFERENCES campaign_nodes(id) ON DELETE CASCADE,
      type          TEXT    NOT NULL
                            CHECK (type IN ('folder', 'character', 'note', 'image', 'audio', 'map')),
      name          TEXT    NOT NULL,
      description   TEXT,
      visibility    TEXT    NOT NULL DEFAULT 'gm_only'
                            CHECK (visibility IN ('gm_only', 'all', 'custom')),
      permission    TEXT    NOT NULL DEFAULT 'view'
                            CHECK (permission IN ('view', 'edit')),
      shared_with   TEXT    NOT NULL DEFAULT '[]',
      data          TEXT    NOT NULL DEFAULT '{}',
      order_index   INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign ON campaign_nodes(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_nodes_parent   ON campaign_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_nodes_type     ON campaign_nodes(campaign_id, type);
  `)

  // ── Session Participants (Histórico persistente de participantes) ─────────
  try {
    const pCols = db.prepare("PRAGMA table_info(session_participants)").all() as Array<{ name: string }>
    if (pCols.length > 0 && !pCols.some((c) => c.name === 'campaign_id')) {
      // Se a tabela session_participants era do esquema legado (sem campaign_id), recria com o esquema atual
      db.exec(`DROP TABLE IF EXISTS session_participants;`)
    }
  } catch (e) {
    console.error('Erro ao verificar colunas de session_participants:', e)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS session_participants (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
      username      TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'player'
                            CHECK (role IN ('gm','player','observer')),
      first_joined  TEXT    NOT NULL DEFAULT (datetime('now')),
      last_joined   TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (session_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_session_participants_session  ON session_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_participants_campaign ON session_participants(campaign_id);
  `)

  // ── Migrations for Global Identifiers & Character Vault ───────────────────
  try {
    db.exec(`ALTER TABLE users ADD COLUMN uuid TEXT;`)
  } catch {}
  try {
    db.exec(`ALTER TABLE rpg_systems ADD COLUMN uuid TEXT;`)
  } catch {}
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN uuid TEXT;`)
  } catch {}

  try {
    const charCols = db.prepare("PRAGMA table_info(characters)").all() as Array<{ name: string; notnull: number }>
    const campaignIdCol = charCols.find((c) => c.name === 'campaign_id')
    const needsMigration = campaignIdCol && campaignIdCol.notnull === 1

    if (needsMigration) {
      db.exec(`
        CREATE TABLE characters_v2 (
          id                    INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid                  TEXT    UNIQUE,
          campaign_id           INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
          user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rpg_system_id         INTEGER REFERENCES rpg_systems(id) ON DELETE RESTRICT,
          system_slug           TEXT,
          name                  TEXT    NOT NULL,
          avatar_url            TEXT,
          role                  TEXT    NOT NULL DEFAULT 'pc' CHECK (role IN ('pc','npc','enemy')),
          sheet_data            TEXT    NOT NULL DEFAULT '{}',
          origin_character_uuid TEXT,
          created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO characters_v2 (id, campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at)
        SELECT id, campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at FROM characters;

        DROP TABLE characters;
        ALTER TABLE characters_v2 RENAME TO characters;
        CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_characters_user     ON characters(user_id);
        CREATE INDEX IF NOT EXISTS idx_characters_uuid     ON characters(uuid);
      `)
    } else {
      try { db.exec(`ALTER TABLE characters ADD COLUMN uuid TEXT;`) } catch {}
      try { db.exec(`ALTER TABLE characters ADD COLUMN rpg_system_id INTEGER REFERENCES rpg_systems(id) ON DELETE RESTRICT;`) } catch {}
      try { db.exec(`ALTER TABLE characters ADD COLUMN system_slug TEXT;`) } catch {}
      try { db.exec(`ALTER TABLE characters ADD COLUMN origin_character_uuid TEXT;`) } catch {}
      try { db.exec(`CREATE INDEX IF NOT EXISTS idx_characters_uuid ON characters(uuid);`) } catch {}
    }
  } catch (e) {
    console.error('Erro na migração de characters:', e)
  }

  // Backfill UUIDs for any entities missing a global identifier
  try {
    const charsMissing = db.prepare("SELECT id FROM characters WHERE uuid IS NULL").all() as Array<{ id: number }>
    for (const c of charsMissing) {
      db.prepare("UPDATE characters SET uuid = ? WHERE id = ?").run(randomUUID(), c.id)
    }

    const usersMissing = db.prepare("SELECT id FROM users WHERE uuid IS NULL").all() as Array<{ id: number }>
    for (const u of usersMissing) {
      db.prepare("UPDATE users SET uuid = ? WHERE id = ?").run(randomUUID(), u.id)
    }

    const systemsMissing = db.prepare("SELECT id FROM rpg_systems WHERE uuid IS NULL").all() as Array<{ id: number }>
    for (const s of systemsMissing) {
      db.prepare("UPDATE rpg_systems SET uuid = ? WHERE id = ?").run(randomUUID(), s.id)
    }

    const campaignsMissing = db.prepare("SELECT id FROM campaigns WHERE uuid IS NULL").all() as Array<{ id: number }>
    for (const cp of campaignsMissing) {
      db.prepare("UPDATE campaigns SET uuid = ? WHERE id = ?").run(randomUUID(), cp.id)
    }

    // Backfill rpg_system_id and system_slug for existing campaign characters
    db.exec(`
      UPDATE characters 
      SET rpg_system_id = (SELECT rpg_system_id FROM campaigns WHERE campaigns.id = characters.campaign_id)
      WHERE rpg_system_id IS NULL AND campaign_id IS NOT NULL;

      UPDATE characters
      SET system_slug = (SELECT slug FROM rpg_systems WHERE rpg_systems.id = characters.rpg_system_id)
      WHERE system_slug IS NULL AND rpg_system_id IS NOT NULL;
    `)
  } catch (e) {
    console.error('Erro ao preencher dados de migração de UUID/sistemas:', e)
  }
}

export function closeDb(): void {
  db?.close()
  db = null
}
