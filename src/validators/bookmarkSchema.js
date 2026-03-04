import { z } from 'zod';

const urlSchema = z.string().url();
const titleSchema = z.string().min(1).max(255);
const descriptionSchema = z.string().max(1000).optional();
const folderIdSchema = z.number().int().positive().optional();
const tagsSchema = z.array(z.string().min(1).max(50)).max(20).optional();

const bookmarkFields = {
  url: urlSchema,
  title: titleSchema,
  description: descriptionSchema,
  folder_id: folderIdSchema,
  tags: tagsSchema,
};

export const createBookmarkSchema = z.object({
  ...bookmarkFields,
  tags: tagsSchema.default([]),
});

export const updateBookmarkSchema = z
  .object(bookmarkFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const bookmarkIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  folder_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
