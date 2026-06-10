import Database from '@tauri-apps/plugin-sql';
import type { Task, TaskUpdate } from '../types';

// @ts-expect-error Tauri injects this global in the webview
const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!isTauri) throw new Error('Not running inside Tauri');
  if (!_db) {
    _db = await Database.load('sqlite:cortex.db');
    await initSchema(_db);
    await migrateSchema(_db);
  }
  return _db;
}

async function initSchema(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      scheduled_date TEXT,
      timebox_start TEXT,
      timebox_end TEXT,
      eisenhower_quadrant TEXT,
      due_date TEXT,
      estimated_minutes INTEGER,
      priority TEXT,
      label TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

async function migrateSchema(db: Database): Promise<void> {
  const newCols: [string, string][] = [
    ['due_date', 'TEXT'],
    ['estimated_minutes', 'INTEGER'],
    ['priority', 'TEXT'],
    ['label', 'TEXT'],
    ['notes', 'TEXT'],
  ];
  for (const [col, type] of newCols) {
    try {
      await db.execute(`ALTER TABLE tasks ADD COLUMN ${col} ${type}`);
    } catch {
      // Column already exists
    }
  }
}

type RawRow = Record<string, unknown>;

function rowToTask(row: RawRow): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    is_completed: Boolean(row.is_completed),
    scheduled_date: (row.scheduled_date as string) ?? null,
    timebox_start: (row.timebox_start as string) ?? null,
    timebox_end: (row.timebox_end as string) ?? null,
    eisenhower_quadrant: (row.eisenhower_quadrant as Task['eisenhower_quadrant']) ?? null,
    due_date: (row.due_date as string) ?? null,
    estimated_minutes: row.estimated_minutes != null ? Number(row.estimated_minutes) : null,
    priority: (row.priority as Task['priority']) ?? null,
    label: (row.label as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function dbGetAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>('SELECT * FROM tasks ORDER BY created_at ASC');
  return rows.map(rowToTask);
}

export async function dbCreateTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO tasks (id, title, is_completed, scheduled_date, timebox_start, timebox_end,
      eisenhower_quadrant, due_date, estimated_minutes, priority, label, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      task.id, task.title, task.is_completed ? 1 : 0,
      task.scheduled_date, task.timebox_start, task.timebox_end,
      task.eisenhower_quadrant, task.due_date, task.estimated_minutes,
      task.priority, task.label, task.notes,
      task.created_at, task.updated_at,
    ]
  );
}

const ALLOWED_UPDATE_FIELDS = [
  'title', 'is_completed', 'scheduled_date', 'timebox_start', 'timebox_end',
  'eisenhower_quadrant', 'due_date', 'estimated_minutes', 'priority', 'label', 'notes', 'updated_at',
] as const;

export async function dbUpdateTask(id: string, updates: TaskUpdate): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const merged = { ...updates, updated_at: now };
  const entries = Object.entries(merged).filter(([k]) =>
    ALLOWED_UPDATE_FIELDS.includes(k as (typeof ALLOWED_UPDATE_FIELDS)[number])
  );
  if (entries.length === 0) return;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 2}`).join(', ');
  const values: unknown[] = [
    id,
    ...entries.map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)),
  ];
  await db.execute(`UPDATE tasks SET ${setClauses} WHERE id = $1`, values);
}

export async function dbDeleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
}
