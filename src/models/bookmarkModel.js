import db from '../db/index.js';

const selectBookmarkColumns = `
  SELECT
    b.id,
    b.url,
    b.title,
    b.description,
    b.folder_id,
    b.created_at,
    b.updated_at,
    CASE
      WHEN f.id IS NULL THEN NULL
      ELSE json_object(
        'id', f.id,
        'name', f.name,
        'description', f.description,
        'created_at', f.created_at
      )
    END AS folder,
    COALESCE((
      SELECT json_group_array(t.name)
      FROM tags t
      INNER JOIN bookmark_tags bt ON bt.tag_id = t.id
      WHERE bt.bookmark_id = b.id
    ), '[]') AS tags
  FROM bookmarks b
  LEFT JOIN folders f ON f.id = b.folder_id
`;

const findByIdStmt = db.prepare(`${selectBookmarkColumns} WHERE b.id = ?`);
const bookmarkExistsStmt = db.prepare('SELECT 1 FROM bookmarks WHERE id = ?');
const deleteBookmarkStmt = db.prepare('DELETE FROM bookmarks WHERE id = ?');
const insertBookmarkStmt = db.prepare(`
  INSERT INTO bookmarks (url, title, description, folder_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);
const deleteBookmarkTagsStmt = db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?');
const insertBookmarkTagStmt = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
const touchBookmarkStmt = db.prepare('UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');

function normalizeTagNames(tags) {
  if (!tags) {
    return [];
  }

  const rawNames = Array.isArray(tags) ? tags : String(tags).split(',');
  const uniqueNames = new Set();

  for (const name of rawNames) {
    const normalized = String(name).trim();
    if (normalized) {
      uniqueNames.add(normalized);
    }
  }

  return [...uniqueNames];
}

function mapBookmarkRow(row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    folder_id: row.folder_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    folder: row.folder ? JSON.parse(row.folder) : null,
    tags: row.tags ? JSON.parse(row.tags) : [],
  };
}

function buildWhereClause(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.q) {
    const likeValue = `%${filters.q}%`;
    conditions.push(`
      (
        b.title LIKE ?
        OR b.url LIKE ?
        OR COALESCE(b.description, '') LIKE ?
        OR EXISTS (
          SELECT 1
          FROM bookmark_tags bt_q
          INNER JOIN tags t_q ON t_q.id = bt_q.tag_id
          WHERE bt_q.bookmark_id = b.id
            AND t_q.name LIKE ?
        )
      )
    `);
    params.push(likeValue, likeValue, likeValue, likeValue);
  }

  if (filters.folder_id !== undefined) {
    conditions.push('b.folder_id = ?');
    params.push(filters.folder_id);
  }

  const tagNames = normalizeTagNames(filters.tags);
  if (tagNames.length > 0) {
    const placeholders = tagNames.map(() => '?').join(', ');
    conditions.push(`
      b.id IN (
        SELECT bt_filter.bookmark_id
        FROM bookmark_tags bt_filter
        INNER JOIN tags t_filter ON t_filter.id = bt_filter.tag_id
        WHERE t_filter.name IN (${placeholders})
        GROUP BY bt_filter.bookmark_id
        HAVING COUNT(DISTINCT t_filter.name) = ?
      )
    `);
    params.push(...tagNames, tagNames.length);
  }

  if (conditions.length === 0) {
    return { whereClause: '', params };
  }

  return { whereClause: `WHERE ${conditions.join(' AND ')}`, params };
}

export function getOrCreateTags(tagNames, database = db) {
  const normalizedNames = normalizeTagNames(tagNames);
  if (normalizedNames.length === 0) {
    return [];
  }

  const insertTagStmt = database.prepare(`
    INSERT INTO tags (name)
    VALUES (?)
    ON CONFLICT(name) DO UPDATE SET name = excluded.name
  `);
  const selectTagIdByNameStmt = database.prepare('SELECT id FROM tags WHERE name = ?');

  const ids = [];

  for (const tagName of normalizedNames) {
    insertTagStmt.run(tagName);
    const tag = selectTagIdByNameStmt.get(tagName);
    if (!tag) {
      throw new Error(`Failed to upsert tag: ${tagName}`);
    }
    ids.push(tag.id);
  }

  return ids;
}

export function findAll(filters = {}) {
  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const { whereClause, params } = buildWhereClause(filters);

  const totalStmt = db.prepare(`
    SELECT COUNT(*) AS total
    FROM bookmarks b
    ${whereClause}
  `);
  const total = totalStmt.get(...params).total;

  const dataStmt = db.prepare(`
    ${selectBookmarkColumns}
    ${whereClause}
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT ? OFFSET ?
  `);
  const rows = dataStmt.all(...params, limit, offset).map(mapBookmarkRow);

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function findById(id) {
  const row = findByIdStmt.get(id);
  if (!row) {
    return null;
  }
  return mapBookmarkRow(row);
}

const createTransaction = db.transaction((data) => {
  const result = insertBookmarkStmt.run(
    data.url,
    data.title,
    data.description ?? null,
    data.folder_id ?? null
  );

  const bookmarkId = Number(result.lastInsertRowid);
  const tagIds = getOrCreateTags(data.tags ?? [], db);

  for (const tagId of tagIds) {
    insertBookmarkTagStmt.run(bookmarkId, tagId);
  }

  return bookmarkId;
});

export function create(data) {
  const bookmarkId = createTransaction(data);
  return findById(bookmarkId);
}

const updateTransaction = db.transaction((id, data) => {
  const existing = bookmarkExistsStmt.get(id);
  if (!existing) {
    return null;
  }

  const updateValues = [];
  const setClauses = [];

  if (Object.hasOwn(data, 'url')) {
    setClauses.push('url = ?');
    updateValues.push(data.url);
  }
  if (Object.hasOwn(data, 'title')) {
    setClauses.push('title = ?');
    updateValues.push(data.title);
  }
  if (Object.hasOwn(data, 'description')) {
    setClauses.push('description = ?');
    updateValues.push(data.description ?? null);
  }
  if (Object.hasOwn(data, 'folder_id')) {
    setClauses.push('folder_id = ?');
    updateValues.push(data.folder_id ?? null);
  }

  if (setClauses.length > 0) {
    const updateStmt = db.prepare(`
      UPDATE bookmarks
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(...updateValues, id);
  } else {
    touchBookmarkStmt.run(id);
  }

  if (Object.hasOwn(data, 'tags')) {
    deleteBookmarkTagsStmt.run(id);
    const tagIds = getOrCreateTags(data.tags ?? [], db);
    for (const tagId of tagIds) {
      insertBookmarkTagStmt.run(id, tagId);
    }
  }

  return id;
});

export function update(id, data) {
  const updatedId = updateTransaction(id, data);
  if (!updatedId) {
    return null;
  }
  return findById(updatedId);
}

export function remove(id) {
  const result = deleteBookmarkStmt.run(id);
  if (result.changes === 0) {
    return null;
  }
  return { deleted: true };
}

export default {
  findAll,
  findById,
  create,
  update,
  remove,
  getOrCreateTags,
};
