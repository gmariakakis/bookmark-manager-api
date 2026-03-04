import Database from 'better-sqlite3';
import { migrations } from '../src/db/migrations.js';

export const testDb = new Database(':memory:');
testDb.exec(migrations);

export function resetDb() {
  testDb.exec('PRAGMA foreign_keys = OFF;');
  testDb.exec('DELETE FROM bookmark_tags;');
  testDb.exec('DELETE FROM bookmarks;');
  testDb.exec('DELETE FROM tags;');
  testDb.exec('DELETE FROM folders;');
  testDb.exec("DELETE FROM sqlite_sequence WHERE name IN ('bookmarks', 'folders', 'tags');");
  testDb.exec('PRAGMA foreign_keys = ON;');
}
