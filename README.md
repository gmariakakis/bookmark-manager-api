# Bookmark Manager API

REST API for storing, organizing, and searching bookmarks with folders and tags.

## Features

- CRUD for bookmarks
- CRUD for folders
- Tag support (many-to-many with bookmarks)
- Search bookmarks by text, tags, and folder
- Pagination on bookmark listing/search
- Input validation with Zod
- SQLite persistence with automatic schema migrations on startup
- Test suite with Vitest + Supertest

## Tech Stack

- Node.js
- Express
- SQLite (`better-sqlite3`)
- Zod
- Vitest

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
git clone <your-repo-url>
cd bookmark-manager-api
npm install
cp .env.example .env
```

## Running the API

```bash
npm run dev
```

```bash
npm start
```

Default base URL:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Testing

```bash
npm test
```

```bash
npm run test:coverage
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_URL` | No | `./data/bookmarks.db` | SQLite database file path |

## API Reference

Base path for API routes: `/api`

### Endpoint Table

| Resource | Method | Path | Description |
|---|---|---|---|
| Bookmarks | `GET` | `/api/bookmarks` | List/search bookmarks with pagination |
| Bookmarks | `POST` | `/api/bookmarks` | Create bookmark |
| Bookmarks | `GET` | `/api/bookmarks/:id` | Get bookmark by id |
| Bookmarks | `PUT` | `/api/bookmarks/:id` | Update bookmark |
| Bookmarks | `DELETE` | `/api/bookmarks/:id` | Delete bookmark |
| Folders | `GET` | `/api/folders` | List folders |
| Folders | `POST` | `/api/folders` | Create folder |
| Folders | `GET` | `/api/folders/:id` | Get folder by id |
| Folders | `PUT` | `/api/folders/:id` | Update folder |
| Folders | `DELETE` | `/api/folders/:id` | Delete folder |

### Bookmark Model (Response Shape)

```json
{
  "id": 1,
  "url": "https://example.com",
  "title": "Example",
  "description": "Example site",
  "created_at": "2026-03-04 14:00:00",
  "updated_at": "2026-03-04 14:00:00",
  "folder": {
    "id": 1,
    "name": "Work",
    "description": "Work links"
  },
  "tags": ["docs", "reference"]
}
```

### Folder Model (Response Shape)

```json
{
  "id": 1,
  "name": "Work",
  "description": "Work links",
  "created_at": "2026-03-04 13:50:00",
  "bookmark_count": 3
}
```

## Query Parameters (`GET /api/bookmarks`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | none | Text search across `title`, `url`, `description` |
| `tags` | string | none | Comma-separated tags. Bookmark must include all requested tags (AND match) |
| `folder_id` | number | none | Filter bookmarks by folder id |
| `page` | number | `1` | 1-based page number |
| `limit` | number | `20` | Items per page (`1-100`) |

Example:

```bash
curl "http://localhost:3000/api/bookmarks?q=api&tags=docs,nodejs&folder_id=1&page=1&limit=10"
```

## Request and Response Examples (curl)

### 1) Create Folder (`POST /api/folders`)

```bash
curl -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work",
    "description": "Bookmarks for work"
  }'
```

Example response (`201`):

```json
{
  "id": 1,
  "name": "Work",
  "description": "Bookmarks for work",
  "created_at": "2026-03-04 13:50:00",
  "bookmark_count": 0
}
```

### 2) List Folders (`GET /api/folders`)

```bash
curl http://localhost:3000/api/folders
```

Example response (`200`):

```json
[
  {
    "id": 1,
    "name": "Work",
    "description": "Bookmarks for work",
    "created_at": "2026-03-04 13:50:00",
    "bookmark_count": 1
  }
]
```

### 3) Get Folder by ID (`GET /api/folders/:id`)

```bash
curl http://localhost:3000/api/folders/1
```

Example response (`200`):

```json
{
  "id": 1,
  "name": "Work",
  "description": "Bookmarks for work",
  "created_at": "2026-03-04 13:50:00",
  "bookmark_count": 1
}
```

### 4) Update Folder (`PUT /api/folders/:id`)

```bash
curl -X PUT http://localhost:3000/api/folders/1 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated folder description"
  }'
```

Example response (`200`):

```json
{
  "id": 1,
  "name": "Work",
  "description": "Updated folder description",
  "created_at": "2026-03-04 13:50:00",
  "bookmark_count": 1
}
```

### 5) Delete Folder (`DELETE /api/folders/:id`)

```bash
curl -X DELETE http://localhost:3000/api/folders/1 -i
```

Example response: `204 No Content`

### 6) Create Bookmark with Tags (`POST /api/bookmarks`)

```bash
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://expressjs.com",
    "title": "Express",
    "description": "Express documentation",
    "folder_id": 1,
    "tags": ["nodejs", "backend", "docs"]
  }'
```

Example response (`201`):

```json
{
  "id": 1,
  "url": "https://expressjs.com",
  "title": "Express",
  "description": "Express documentation",
  "created_at": "2026-03-04 14:00:00",
  "updated_at": "2026-03-04 14:00:00",
  "folder": {
    "id": 1,
    "name": "Work",
    "description": "Bookmarks for work"
  },
  "tags": ["nodejs", "backend", "docs"]
}
```

### 7) List/Search Bookmarks (`GET /api/bookmarks`)

```bash
curl "http://localhost:3000/api/bookmarks?page=1&limit=20"
```

Example response (`200`):

```json
{
  "data": [
    {
      "id": 1,
      "url": "https://expressjs.com",
      "title": "Express",
      "description": "Express documentation",
      "created_at": "2026-03-04 14:00:00",
      "updated_at": "2026-03-04 14:00:00",
      "folder": {
        "id": 1,
        "name": "Work",
        "description": "Bookmarks for work"
      },
      "tags": ["nodejs", "backend", "docs"]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### 8) Search Bookmarks by Tags (`GET /api/bookmarks?tags=...`)

```bash
curl "http://localhost:3000/api/bookmarks?tags=nodejs,docs"
```

Example response (`200`):

```json
{
  "data": [
    {
      "id": 1,
      "url": "https://expressjs.com",
      "title": "Express",
      "description": "Express documentation",
      "created_at": "2026-03-04 14:00:00",
      "updated_at": "2026-03-04 14:00:00",
      "folder": {
        "id": 1,
        "name": "Work",
        "description": "Bookmarks for work"
      },
      "tags": ["nodejs", "backend", "docs"]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### 9) Organize Bookmark into Folder (`PUT /api/bookmarks/:id`)

```bash
curl -X PUT http://localhost:3000/api/bookmarks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "folder_id": 1
  }'
```

Example response (`200`):

```json
{
  "id": 1,
  "url": "https://expressjs.com",
  "title": "Express",
  "description": "Express documentation",
  "created_at": "2026-03-04 14:00:00",
  "updated_at": "2026-03-04 14:10:00",
  "folder": {
    "id": 1,
    "name": "Work",
    "description": "Bookmarks for work"
  },
  "tags": ["nodejs", "backend", "docs"]
}
```

### 10) Get Bookmark by ID (`GET /api/bookmarks/:id`)

```bash
curl http://localhost:3000/api/bookmarks/1
```

Example response (`200`):

```json
{
  "id": 1,
  "url": "https://expressjs.com",
  "title": "Express",
  "description": "Express documentation",
  "created_at": "2026-03-04 14:00:00",
  "updated_at": "2026-03-04 14:10:00",
  "folder": {
    "id": 1,
    "name": "Work",
    "description": "Bookmarks for work"
  },
  "tags": ["nodejs", "backend", "docs"]
}
```

### 11) Update Bookmark (`PUT /api/bookmarks/:id`)

```bash
curl -X PUT http://localhost:3000/api/bookmarks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Express.js",
    "tags": ["nodejs", "framework", "docs"]
  }'
```

Example response (`200`):

```json
{
  "id": 1,
  "url": "https://expressjs.com",
  "title": "Express.js",
  "description": "Express documentation",
  "created_at": "2026-03-04 14:00:00",
  "updated_at": "2026-03-04 14:15:00",
  "folder": {
    "id": 1,
    "name": "Work",
    "description": "Bookmarks for work"
  },
  "tags": ["nodejs", "framework", "docs"]
}
```

### 12) Delete Bookmark (`DELETE /api/bookmarks/:id`)

```bash
curl -X DELETE http://localhost:3000/api/bookmarks/1 -i
```

Example response: `204 No Content`

## Error Response Format

All errors return JSON in this shape:

```json
{
  "error": {
    "message": "Human readable message",
    "code": "MACHINE_READABLE_CODE"
  }
}
```

Validation errors include `details`:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "url": ["Invalid url"]
      }
    }
  }
}
```

Common codes:

- `VALIDATION_ERROR` (`400`)
- `NOT_FOUND` (`404`)
- `CONFLICT` (`409`)
- `INTERNAL_SERVER_ERROR` (`500`)

## Database Schema (ASCII)

```text
+-------------------+
|      folders      |
+-------------------+
| id (PK)           |
| name (UNIQUE)     |
| description       |
| created_at        |
+-------------------+
          ^
          | bookmarks.folder_id (FK, ON DELETE SET NULL)
          |
+-------------------+          +-------------------+
|     bookmarks     |          |       tags        |
+-------------------+          +-------------------+
| id (PK)           |          | id (PK)           |
| url               |          | name (UNIQUE)     |
| title             |          +-------------------+
| description       |                    ^
| folder_id (FK)    |                    |
| created_at        |                    |
| updated_at        |                    |
+-------------------+                    |
          ^                              |
          |                              |
          +---------+  bookmark_tags  +--+
                    |                 |
            +-----------------------------+
            |        bookmark_tags        |
            +-----------------------------+
            | bookmark_id (PK, FK)        |
            | tag_id (PK, FK)             |
            +-----------------------------+
```

## Notes

- `tags` in bookmark search is comma-separated (`tags=a,b`) and performs an AND filter.
- `PUT /api/bookmarks/:id` supports partial updates and can also replace tags.
- `PUT /api/folders/:id` supports partial updates.
