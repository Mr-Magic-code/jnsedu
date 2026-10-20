import { createApp } from './app.factory.js';

async function bootstrap() {
  const app = await createApp();

  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);

  console.log(`NestJS backend listening on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start NestJS backend:', error);
  process.exit(1);
});
