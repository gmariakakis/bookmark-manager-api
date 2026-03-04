import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  searchSchema,
  bookmarkIdSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
} from '../validators/bookmarkSchema.js';
import {
  getBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../controllers/bookmarkController.js';

const router = Router();

router.get('/', validate(searchSchema, 'query'), getBookmarks);
router.get('/:id', validate(bookmarkIdSchema, 'params'), getBookmark);
router.post('/', validate(createBookmarkSchema), createBookmark);
router.put('/:id', validate(bookmarkIdSchema, 'params'), validate(updateBookmarkSchema), updateBookmark);
router.delete('/:id', validate(bookmarkIdSchema, 'params'), deleteBookmark);

export default router;
