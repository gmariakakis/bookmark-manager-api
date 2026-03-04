const db = require('../db');

/**
 * Find all folders ordered by name, with bookmark_count via subquery.
 * @returns {Array<{id: number, name: string, description: string|null, bookmark_count: number}>}
 */
function findAll() {
  const stmt = db.prepare(`
    SELECT
      folders.id,
      folders.name,
      folders.description,
      (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.folder_id = folders.id) AS bookmark_count
    FROM folders
    ORDER BY folders.name ASC
  `);
  return stmt.all();
}

/**
 * Find folder by id with bookmark_count.
 * @param {number} id - Folder id
 * @returns {{id: number, name: string, description: string|null, bookmark_count: number}|null}
 */
function findById(id) {
  const stmt = db.prepare(`
    SELECT
      folders.id,
      folders.name,
      folders.description,
      (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.folder_id = folders.id) AS bookmark_count
    FROM folders
    WHERE folders.id = ?
  `);
  return stmt.get(id) ?? null;
}

/**
 * Create a new folder.
 * @param {{name: string, description?: string|null}} data
 * @returns {{id: number, name: string, description: string|null}}
 */
function create(data) {
  const stmt = db.prepare(`
    INSERT INTO folders (name, description)
    VALUES (?, ?)
  `);
  const result = stmt.run(data.name, data.description ?? null);
  return findById(Number(result.lastInsertRowid));
}

/**
 * Update folder name and/or description.
 * @param {number} id - Folder id
 * @param {{name?: string, description?: string|null}} data
 * @returns {{id: number, name: string, description: string|null, bookmark_count: number}|null}
 */
function update(id, data) {
  const existing = findById(id);
  if (!existing) return null;

  const stmt = db.prepare(`
    UPDATE folders
    SET name = ?, description = ?
    WHERE id = ?
  `);
  stmt.run(
    data.name ?? existing.name,
    data.description !== undefined ? data.description : existing.description,
    id
  );
  return findById(id);
}

/**
 * Delete folder. Bookmarks with this folder_id become uncategorized (ON DELETE SET NULL).
 * @param {number} id - Folder id
 * @returns {{deleted: true}|null}
 */
function remove(id) {
  const existing = findById(id);
  if (!existing) return null;

  const stmt = db.prepare('DELETE FROM folders WHERE id = ?');
  stmt.run(id);
  return { deleted: true };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
