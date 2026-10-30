import 'dotenv/config';
import { createApp } from './app.js';
import { connectMongo, createMemoryDb } from './store.js';

const production = process.env.NODE_ENV === 'production';
const demoMode = process.env.DEMO_MODE === 'true';
if (production && demoMode) throw new Error('DEMO_MODE is forbidden in production.');
const publicBaseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
if (production && !/^https:\/\//i.test(publicBaseUrl)) throw new Error('Set PUBLIC_BASE_URL to the public HTTPS origin before starting in production.');
const bounded = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
};

let store;
if (demoMode) {
  store = { db: createMemoryDb(), close: async () => {} };
  console.warn('DEMO_MODE enabled: using a non-persistent in-memory database with no admin accounts. The read-only PUBLIQ menu remains available.');
} else {
  try {
    store = await connectMongo({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || 'qr_restaurant_menu' });
  } catch (error) {
    console.error(`MongoDB connection failed (${error?.name || 'Error'}). Check MONGODB_URI, network access, and database permissions.`);
    process.exit(1);
  }
}

const app = createApp({
  db: store.db,
  config: {
    production,
    sessionTtlHours: bounded(process.env.SESSION_TTL_HOURS, 12, 1, 168),
    invitationTtlHours: bounded(process.env.INVITATION_TTL_HOURS, 48, 1, 168),
    uploadMaxMb: bounded(process.env.UPLOAD_MAX_MB, 5, 1, 10),
    publicBaseUrl,
  },
});
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`PUBLIQ Super Club admin listening on 0.0.0.0:${port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
