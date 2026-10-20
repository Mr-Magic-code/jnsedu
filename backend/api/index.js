import { createApp } from '../dist/app.factory.js';

let serverPromise;

function getServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const app = await createApp();
      await app.init();
      return app.getHttpAdapter().getInstance();
    })().catch((error) => {
      serverPromise = undefined;
      throw error;
    });
  }

  return serverPromise;
}

export default async function handler(req, res) {
  const server = await getServer();
  return server(req, res);
}
