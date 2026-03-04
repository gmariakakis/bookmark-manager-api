import * as bookmarkModel from '../models/bookmarkModel.js';

export function getBookmarks(req, res) {
  const result = bookmarkModel.findAll(req.query);
  return res.status(200).json(result);
}

export function getBookmark(req, res) {
  const bookmark = bookmarkModel.findById(req.params.id);
  if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });
  return res.status(200).json(bookmark);
}

export function createBookmark(req, res) {
  const bookmark = bookmarkModel.create(req.body);
  return res.status(201).json(bookmark);
}

export function updateBookmark(req, res) {
  const bookmark = bookmarkModel.update(req.params.id, req.body);
  if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });
  return res.status(200).json(bookmark);
}

export function deleteBookmark(req, res) {
  const result = bookmarkModel.remove(req.params.id);
  if (!result) return res.status(404).json({ error: 'Bookmark not found' });
  return res.status(204).send();
}
