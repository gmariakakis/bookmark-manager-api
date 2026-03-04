import db from '../db/index.js';

function mapFolderRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    bookmark_count: Number(row.bookmark_count ?? 0),
  };
}

export function findAll() {
  const rows = db
    .prepare(`
      SELECT
        f.*,
        COUNT(b.id) AS bookmark_count
      FROM folders f
      LEFT JOIN bookmarks b ON b.folder_id = f.id
      GROUP BY f.id
      ORDER BY f.name ASC
    `)
    .all();
  return rows.map(mapFolderRow);
}

export function findById(id) {
  const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  return row ? mapFolderRow(row) : null;
}

export function create(data) {
  const result = db
    .prepare('INSERT INTO folders (name, description) VALUES (@name, @description)')
    .run({ name: data.name, description: data.description ?? null });
  return findById(result.lastInsertRowid);
}

export function update(id, data) {
  const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(id);
  if (!existing) return null;

  const setClauses = [];
  const params = { id };

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    setClauses.push('name = @name');
    params.name = data.name;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'description')) {
    setClauses.push('description = @description');
    params.description = data.description ?? null;
  }

  if (setClauses.length > 0) {
    db.prepare(`UPDATE folders SET ${setClauses.join(', ')} WHERE id = @id`).run(params);
  }

  return findById(id);
}

export function remove(id) {
  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  return result.changes > 0 ? { deleted: true } : null;
}

export default { findAll, findById, create, update, remove };
