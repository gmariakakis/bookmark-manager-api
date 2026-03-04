import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close((err) => {
    if (err) {
      console.error('Failed to close server cleanly', err);
      process.exit(1);
    }
    process.exit(0);
  });
});
