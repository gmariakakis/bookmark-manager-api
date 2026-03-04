import * as folderModel from '../models/folderModel.js';

export function getFolders(req, res) {
  return res.status(200).json(folderModel.findAll());
}

export function getFolder(req, res) {
  const folder = folderModel.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  return res.status(200).json(folder);
}

export function createFolder(req, res) {
  const folder = folderModel.create(req.body);
  return res.status(201).json(folder);
}

export function updateFolder(req, res) {
  const folder = folderModel.update(req.params.id, req.body);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  return res.status(200).json(folder);
}

export function deleteFolder(req, res) {
  const result = folderModel.remove(req.params.id);
  if (!result) return res.status(404).json({ error: 'Folder not found' });
  return res.status(204).send();
}
