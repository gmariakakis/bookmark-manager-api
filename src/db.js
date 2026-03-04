const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bookmarks.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

module.exports = db;
