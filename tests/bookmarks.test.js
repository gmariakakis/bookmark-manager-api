import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { resetDb, testDb } from './setup.js';

vi.mock('../src/db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../src/app.js');

function createFolder(name = 'Dev') {
  return request(app)
    .post('/api/folders')
    .send({ name, description: `${name} folder` });
}

describe('Bookmarks API', () => {
  beforeEach(() => {
    resetDb();
  });

  it('GET /api/bookmarks returns empty array', async () => {
    const res = await request(app).get('/api/bookmarks');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('POST /api/bookmarks creates bookmark with tags', async () => {
    const payload = {
      url: 'https://nodejs.org',
      title: 'Node.js',
      description: 'Runtime docs',
      tags: ['js', 'node'],
    };

    const res = await request(app).post('/api/bookmarks').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.url).toBe(payload.url);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.tags.sort()).toEqual(['js', 'node']);
  });

  it('GET /api/bookmarks/:id returns bookmark with tags', async () => {
    const created = await request(app).post('/api/bookmarks').send({
      url: 'https://vitest.dev',
      title: 'Vitest',
      tags: ['test', 'js'],
    });

    const res = await request(app).get(`/api/bookmarks/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.tags.sort()).toEqual(['js', 'test']);
  });

  it('PUT /api/bookmarks/:id updates bookmark fields', async () => {
    const created = await request(app).post('/api/bookmarks').send({
      url: 'https://expressjs.com',
      title: 'Express',
      tags: ['backend'],
    });

    const updatePayload = {
      title: 'Express Framework',
      description: 'Fast, unopinionated web framework',
      tags: ['node', 'api'],
    };

    const res = await request(app)
      .put(`/api/bookmarks/${created.body.id}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(updatePayload.title);
    expect(res.body.description).toBe(updatePayload.description);
    expect(res.body.tags.sort()).toEqual(['api', 'node']);
  });

  it('DELETE /api/bookmarks/:id removes bookmark', async () => {
    const created = await request(app).post('/api/bookmarks').send({
      url: 'https://sqlite.org',
      title: 'SQLite',
      tags: [],
    });

    const del = await request(app).delete(`/api/bookmarks/${created.body.id}`);
    const getDeleted = await request(app).get(`/api/bookmarks/${created.body.id}`);

    expect(del.status).toBe(204);
    expect(getDeleted.status).toBe(404);
  });

  it('GET /api/bookmarks?q=search filters by title', async () => {
    await request(app).post('/api/bookmarks').send({
      url: 'https://react.dev',
      title: 'React',
      tags: ['frontend'],
    });
    await request(app).post('/api/bookmarks').send({
      url: 'https://fastify.dev',
      title: 'Fastify',
      tags: ['backend'],
    });

    const res = await request(app).get('/api/bookmarks?q=React');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('React');
  });

  it('GET /api/bookmarks?tags=js,node filters by tags', async () => {
    await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/a',
      title: 'Only JS',
      tags: ['js'],
    });
    await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/b',
      title: 'JS and Node',
      tags: ['js', 'node'],
    });

    const res = await request(app).get('/api/bookmarks?tags=js,node');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('JS and Node');
  });

  it('GET /api/bookmarks?folder_id= filters by folder', async () => {
    const folder = await createFolder('Backend');
    const anotherFolder = await createFolder('Frontend');

    await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/in-folder',
      title: 'In Backend',
      folder_id: folder.body.id,
      tags: [],
    });

    await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/other-folder',
      title: 'In Frontend',
      folder_id: anotherFolder.body.id,
      tags: [],
    });

    const res = await request(app).get(`/api/bookmarks?folder_id=${folder.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('In Backend');
    expect(res.body.data[0].folder.id).toBe(folder.body.id);
  });

  it('POST /api/bookmarks with invalid URL returns 400', async () => {
    const res = await request(app).post('/api/bookmarks').send({
      url: 'not-a-url',
      title: 'Bad URL',
      tags: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/bookmarks missing title returns 400', async () => {
    const res = await request(app).post('/api/bookmarks').send({
      url: 'https://example.com',
      tags: ['misc'],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/bookmarks/:id for non-existent id returns 404', async () => {
    const res = await request(app).get('/api/bookmarks/9999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
