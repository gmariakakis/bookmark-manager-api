# Bookmark Manager API

A RESTful API for managing bookmarks, built with Node.js, Express, and SQLite.

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **Database**: SQLite via better-sqlite3
- **Validation**: Zod
- **Testing**: Vitest + Supertest

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | `./data/bookmarks.db` | SQLite database path |

## Project Structure

```
src/
  routes/        # Express route definitions
  controllers/   # Request handlers
  models/        # Database access layer
  middleware/    # Express middleware
  validators/    # Zod schemas
  db/            # Database connection and setup
  app.js         # Express app setup
  server.js      # Entry point
tests/           # Test files
```
