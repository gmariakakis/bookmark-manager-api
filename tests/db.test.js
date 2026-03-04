import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { migrations } from '../src/db/migrations.js';

let db;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(migrations);
});

afterAll(() => {
  db.close();
});

describe('migrations', () => {
  it('creates folders table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").get();
    expect(row).toBeDefined();
  });

  it('creates bookmarks table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'").get();
    expect(row).toBeDefined();
  });

  it('creates tags table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").get();
    expect(row).toBeDefined();
  });

  it('creates bookmark_tags table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark_tags'").get();
    expect(row).toBeDefined();
  });

  it('enforces foreign key constraints', () => {
    expect(() => {
      db.prepare('INSERT INTO bookmarks (url, title, folder_id) VALUES (?, ?, ?)').run('https://example.com', 'Test', 9999);
    }).toThrow();
  });

  it('enforces folders name uniqueness', () => {
    db.prepare('INSERT INTO folders (name) VALUES (?)').run('unique-folder');
    expect(() => {
      db.prepare('INSERT INTO folders (name) VALUES (?)').run('unique-folder');
    }).toThrow();
  });

  it('cascades deletes from bookmarks to bookmark_tags', () => {
    const folder = db.prepare('INSERT INTO folders (name) VALUES (?)').run('test-folder');
    const bookmark = db.prepare('INSERT INTO bookmarks (url, title) VALUES (?, ?)').run('https://test.com', 'Test');
    const tag = db.prepare('INSERT INTO tags (name) VALUES (?)').run('test-tag');
    db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(bookmark.lastInsertRowid, tag.lastInsertRowid);

    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(bookmark.lastInsertRowid);

    const bt = db.prepare('SELECT * FROM bookmark_tags WHERE bookmark_id = ?').get(bookmark.lastInsertRowid);
    expect(bt).toBeUndefined();
  });
});
