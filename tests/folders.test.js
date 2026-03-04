import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { resetDb, testDb } from './setup.js';

vi.mock('../src/db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../src/app.js');

describe('Folders API', () => {
  beforeEach(() => {
    resetDb();
  });

  it('POST /api/folders creates folder', async () => {
    const res = await request(app).post('/api/folders').send({
      name: 'Work',
      description: 'Work-related links',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.name).toBe('Work');
  });

  it('GET /api/folders includes bookmark_count', async () => {
    const folder = await request(app).post('/api/folders').send({
      name: 'Learning',
      description: 'Courses and docs',
    });

    await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/learn',
      title: 'Learn Node',
      folder_id: folder.body.id,
      tags: ['node'],
    });

    const res = await request(app).get('/api/folders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Learning');
    expect(res.body[0].bookmark_count).toBe(1);
  });

  it('PUT /api/folders/:id updates folder', async () => {
    const created = await request(app).post('/api/folders').send({
      name: 'Temp',
      description: 'Temporary',
    });

    const res = await request(app).put(`/api/folders/${created.body.id}`).send({
      name: 'Permanent',
      description: 'Updated',
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Permanent');
    expect(res.body.description).toBe('Updated');
  });

  it('DELETE /api/folders/:id sets bookmarks folder to null', async () => {
    const folder = await request(app).post('/api/folders').send({
      name: 'DeleteMe',
      description: 'Will be deleted',
    });

    const bookmark = await request(app).post('/api/bookmarks').send({
      url: 'https://example.com/orphan',
      title: 'Orphan me',
      folder_id: folder.body.id,
      tags: ['test'],
    });

    const delRes = await request(app).delete(`/api/folders/${folder.body.id}`);
    const bookmarkRes = await request(app).get(`/api/bookmarks/${bookmark.body.id}`);

    expect(delRes.status).toBe(204);
    expect(bookmarkRes.status).toBe(200);
    expect(bookmarkRes.body.folder).toBeNull();
  });

  it('POST /api/folders duplicate name returns 409', async () => {
    await request(app).post('/api/folders').send({ name: 'Unique', description: 'one' });

    const duplicate = await request(app).post('/api/folders').send({
      name: 'Unique',
      description: 'two',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });
});
