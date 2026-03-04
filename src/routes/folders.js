import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  folderIdSchema,
  createFolderSchema,
  updateFolderSchema,
} from '../validators/folderSchema.js';
import {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
} from '../controllers/folderController.js';

const router = Router();

router.get('/', getFolders);
router.get('/:id', validate(folderIdSchema, 'params'), getFolder);
router.post('/', validate(createFolderSchema), createFolder);
router.put('/:id', validate(folderIdSchema, 'params'), validate(updateFolderSchema), updateFolder);
router.delete('/:id', validate(folderIdSchema, 'params'), deleteFolder);

export default router;
