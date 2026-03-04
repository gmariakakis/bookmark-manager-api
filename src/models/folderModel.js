const db = require('../db');

/**
 * Find all folders ordered by name with bookmark count.
 * @returns {Array<{id: number, name: string, description: string|null, created_at: string, bookmark_count: number}>}
 */
function findAll() {
  const stmt = db.prepare(`
    SELECT 
      f.*,
      (SELECT COUNT(*) FROM bookmarks WHERE folder_id = f.id) AS bookmark_count
    FROM folders f
    ORDER BY f.name
  `);
  return stmt.all();
}

/**
 * Find folder by ID with bookmark count.
 * @param {number} id - Folder ID
 * @returns {Object|null} Folder with bookmark_count or null if not found
 */
function findById(id) {
  const stmt = db.prepare(`
    SELECT 
      f.*,
      (SELECT COUNT(*) FROM bookmarks WHERE folder_id = f.id) AS bookmark_count
    FROM folders f
    WHERE f.id = ?
  `);
  return stmt.get(id) ?? null;
}

/**
 * Create a new folder.
 * @param {{name: string, description?: string|null}} data - Folder data
 * @returns {Object} Created folder record
 */
function create(data) {
  const stmt = db.prepare(`
    INSERT INTO folders (name, description)
    VALUES (?, ?)
  `);
  const result = stmt.run(data.name, data.description ?? null);
  return findById(result.lastInsertRowid);
}

/**
 * Update a folder by ID.
 * @param {number} id - Folder ID
 * @param {{name?: string, description?: string|null}} data - Fields to update
 * @returns {Object|null} Updated folder with bookmark_count or null if not found
 */
function update(id, data) {
  const existing = findById(id);
  if (!existing) return null;

  const stmt = db.prepare(`
    UPDATE folders
    SET 
      name = ?,
      description = ?
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
 * Remove a folder by ID. Bookmarks with this folder_id become uncategorized (ON DELETE SET NULL).
 * @param {number} id - Folder ID
 * @returns {{deleted: true}|null} { deleted: true } on success, null if folder not found
 */
function remove(id) {
  const existing = findById(id);
  if (!existing) return null;

  const updateBookmarksStmt = db.prepare(`
    UPDATE bookmarks SET folder_id = NULL WHERE folder_id = ?
  `);
  updateBookmarksStmt.run(id);

  const deleteStmt = db.prepare(`DELETE FROM folders WHERE id = ?`);
  deleteStmt.run(id);

  return { deleted: true };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
