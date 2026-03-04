import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateFolderSchema = createFolderSchema.partial();
