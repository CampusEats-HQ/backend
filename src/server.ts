import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`CampusEats API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Server shut down gracefully');
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
