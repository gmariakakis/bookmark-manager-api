import db from '../db/index.js';

function normalizeTagNames(tagNames) {
  if (!Array.isArray(tagNames)) {
    return [];
  }

  return [...new Set(tagNames.map((tag) => String(tag).trim()).filter(Boolean))];
}

function parseTagFilter(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return normalizeTagNames(tags);
  }

  return normalizeTagNames(String(tags).split(','));
}

function mapBookmarkRow(row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    folder: row.folder_id
      ? {
          id: row.folder_id,
          name: row.folder_name,
          description: row.folder_description,
        }
      : null,
    tags: JSON.parse(row.tags ?? '[]'),
  };
}

export function getOrCreateTags(tagNames, database = db) {
  const normalizedTagNames = normalizeTagNames(tagNames);

  if (normalizedTagNames.length === 0) {
    return [];
  }

  const insertTagStmt = database.prepare(
    'INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING'
  );
  const getTagByNameStmt = database.prepare('SELECT id FROM tags WHERE name = ?');

  const tagIds = [];

  for (const tagName of normalizedTagNames) {
    insertTagStmt.run(tagName);
    const tag = getTagByNameStmt.get(tagName);

    if (!tag) {
      throw new Error(`Failed to resolve tag id for tag: ${tagName}`);
    }

    tagIds.push(tag.id);
  }

  return tagIds;
}

export function findAll(filters = {}) {
  const {
    q,
    folder_id,
    page: rawPage = 1,
    limit: rawLimit = 20,
  } = filters;

  const tags = parseTagFilter(filters.tags);
  const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
  const limit = Number(rawLimit) > 0 ? Number(rawLimit) : 20;
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const params = {};

  if (q) {
    whereClauses.push('(b.title LIKE @q OR b.url LIKE @q OR b.description LIKE @q)');
    params.q = `%${q}%`;
  }

  if (folder_id !== undefined) {
    whereClauses.push('b.folder_id = @folder_id');
    params.folder_id = folder_id;
  }

  let filterTagJoin = '';
  let tagWhereClause = '';
  let tagHavingClause = '';

  if (tags.length > 0) {
    const tagPlaceholders = tags.map((_, index) => `@tag_${index}`).join(', ');

    tags.forEach((tag, index) => {
      params[`tag_${index}`] = tag;
    });

    params.tagCount = tags.length;

    filterTagJoin = `
      JOIN bookmark_tags fbt ON fbt.bookmark_id = b.id
      JOIN tags ft ON ft.id = fbt.tag_id
    `;
    tagWhereClause = `ft.name IN (${tagPlaceholders})`;
    tagHavingClause = 'HAVING COUNT(DISTINCT ft.name) = @tagCount';
  }

  const combinedWhere = [
    ...whereClauses,
    ...(tagWhereClause ? [tagWhereClause] : []),
  ];

  const whereSQL = combinedWhere.length > 0 ? `WHERE ${combinedWhere.join(' AND ')}` : '';

  const countSQL = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT b.id
      FROM bookmarks b
      ${filterTagJoin}
      ${whereSQL}
      GROUP BY b.id
      ${tagHavingClause}
    ) filtered
  `;

  const total = db.prepare(countSQL).get(params).total;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const listSQL = `
    SELECT
      b.id,
      b.url,
      b.title,
      b.description,
      b.created_at,
      b.updated_at,
      f.id AS folder_id,
      f.name AS folder_name,
      f.description AS folder_description,
      COALESCE((
        SELECT json_group_array(t2.name)
        FROM bookmark_tags bt2
        JOIN tags t2 ON t2.id = bt2.tag_id
        WHERE bt2.bookmark_id = b.id
      ), '[]') AS tags
    FROM bookmarks b
    LEFT JOIN folders f ON f.id = b.folder_id
    WHERE b.id IN (
      SELECT filtered.id
      FROM (
        SELECT b.id
        FROM bookmarks b
        ${filterTagJoin}
        ${whereSQL}
        GROUP BY b.id
        ${tagHavingClause}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT @limit OFFSET @offset
      ) filtered
    )
    ORDER BY b.created_at DESC, b.id DESC
  `;

  const rows = db.prepare(listSQL).all({
    ...params,
    limit,
    offset,
  });

  return {
    data: rows.map(mapBookmarkRow),
    total,
    page,
    limit,
    totalPages,
  };
}

export function findById(id) {
  const sql = `
    SELECT
      b.id,
      b.url,
      b.title,
      b.description,
      b.created_at,
      b.updated_at,
      f.id AS folder_id,
      f.name AS folder_name,
      f.description AS folder_description,
      COALESCE((
        SELECT json_group_array(t.name)
        FROM bookmark_tags bt
        JOIN tags t ON t.id = bt.tag_id
        WHERE bt.bookmark_id = b.id
      ), '[]') AS tags
    FROM bookmarks b
    LEFT JOIN folders f ON f.id = b.folder_id
    WHERE b.id = ?
  `;

  const row = db.prepare(sql).get(id);

  if (!row) {
    return null;
  }

  return mapBookmarkRow(row);
}

export function create(data) {
  const insertBookmarkStmt = db.prepare(`
    INSERT INTO bookmarks (url, title, description, folder_id, created_at, updated_at)
    VALUES (@url, @title, @description, @folder_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertBookmarkTagStmt = db.prepare(
    'INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)'
  );

  const tx = db.transaction((input) => {
    const result = insertBookmarkStmt.run({
      url: input.url,
      title: input.title,
      description: input.description ?? null,
      folder_id: input.folder_id ?? null,
    });

    const bookmarkId = result.lastInsertRowid;
    const tagIds = getOrCreateTags(input.tags ?? [], db);

    for (const tagId of tagIds) {
      insertBookmarkTagStmt.run(bookmarkId, tagId);
    }

    return bookmarkId;
  });

  const bookmarkId = tx(data);
  return findById(bookmarkId);
}

export function update(id, data) {
  const existing = db.prepare('SELECT id FROM bookmarks WHERE id = ?').get(id);

  if (!existing) {
    return null;
  }

  const replaceBookmarkTagsStmt = db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?');
  const insertBookmarkTagStmt = db.prepare(
    'INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)'
  );

  const tx = db.transaction((bookmarkId, input) => {
    const updateClauses = [];
    const params = { id: bookmarkId };

    if (Object.prototype.hasOwnProperty.call(input, 'url')) {
      updateClauses.push('url = @url');
      params.url = input.url;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'title')) {
      updateClauses.push('title = @title');
      params.title = input.title;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'description')) {
      updateClauses.push('description = @description');
      params.description = input.description ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'folder_id')) {
      updateClauses.push('folder_id = @folder_id');
      params.folder_id = input.folder_id ?? null;
    }

    if (updateClauses.length > 0 || Object.prototype.hasOwnProperty.call(input, 'tags')) {
      updateClauses.push('updated_at = CURRENT_TIMESTAMP');
      const updateSQL = `UPDATE bookmarks SET ${updateClauses.join(', ')} WHERE id = @id`;
      db.prepare(updateSQL).run(params);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'tags')) {
      replaceBookmarkTagsStmt.run(bookmarkId);
      const tagIds = getOrCreateTags(input.tags ?? [], db);

      for (const tagId of tagIds) {
        insertBookmarkTagStmt.run(bookmarkId, tagId);
      }
    }
  });

  tx(id, data);
  return findById(id);
}

export function remove(id) {
  const result = db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);

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
