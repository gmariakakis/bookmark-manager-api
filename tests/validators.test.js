import { describe, expect, it } from 'vitest';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
} from '../src/validators/bookmarkSchema.js';

describe('bookmark schemas', () => {
  it('valid create bookmark input passes', () => {
    const result = createBookmarkSchema.safeParse({
      url: 'https://example.com',
      title: 'Example',
      description: 'Valid description',
      folder_id: 1,
      tags: ['js', 'node'],
    });

    expect(result.success).toBe(true);
  });

  it('invalid URLs are rejected', () => {
    const result = createBookmarkSchema.safeParse({
      url: 'notaurl',
      title: 'Invalid URL',
      tags: [],
    });

    expect(result.success).toBe(false);
  });

  it('tag array limits are enforced', () => {
    const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);

    const tooManyResult = createBookmarkSchema.safeParse({
      url: 'https://example.com',
      title: 'Too many tags',
      tags: tooManyTags,
    });

    const emptyTagResult = createBookmarkSchema.safeParse({
      url: 'https://example.com',
      title: 'Empty tag',
      tags: [''],
    });

    expect(tooManyResult.success).toBe(false);
    expect(emptyTagResult.success).toBe(false);
  });

  it('partial update schema requires at least one field and allows partial data', () => {
    const emptyUpdate = updateBookmarkSchema.safeParse({});
    const partialUpdate = updateBookmarkSchema.safeParse({ title: 'New title' });

    expect(emptyUpdate.success).toBe(false);
    expect(partialUpdate.success).toBe(true);
  });
});
