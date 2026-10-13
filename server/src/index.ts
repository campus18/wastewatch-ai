import mongoose from 'mongoose';
import { createApp } from './app';
import { assertConfig, config } from './config';

async function main() {
  assertConfig();
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch (e: any) {
    console.error(`Could not connect to MongoDB at ${config.mongoUri}: ${e.message}\nStart MongoDB (e.g. "docker compose up -d") or fix MONGODB_URI.`);
    process.exit(1);
  }
  createApp().listen(config.port, () => console.log(`WasteWatch AI API listening on http://localhost:${config.port}`));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
