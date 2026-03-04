import express from 'express';
import bookmarkRouter from './routes/bookmarks.js';
import folderRouter from './routes/folders.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/folders', folderRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
