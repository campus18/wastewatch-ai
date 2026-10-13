import path from 'node:path';
import dotenv from 'dotenv';

// Project-root .env (works from both src/ via tsx and dist/ after build), then fall back to cwd.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const bool = (v?: string) => v === 'true';
const root = path.resolve(__dirname, '../..');

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wastewatch',
  jwtSecret: process.env.JWT_SECRET || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || 'server/uploads'),
  clientDist: path.resolve(root, 'client/dist'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 8),
  isProd: process.env.NODE_ENV === 'production',
  ai: { visionKey: process.env.GOOGLE_VISION_API_KEY || '', demo: bool(process.env.AI_DEMO_MODE) },
  routing: { osrmBaseUrl: (process.env.OSRM_BASE_URL || '').replace(/\/+$/, '') },
  imagery: { mapboxToken: process.env.MAPBOX_ACCESS_TOKEN || '' },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || '',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || '',
    demo: bool(process.env.SEED_DEMO),
    demoPassword: process.env.SEED_DEMO_PASSWORD || '',
    centerLat: Number(process.env.SEED_CENTER_LAT || 20.5937),
    centerLng: Number(process.env.SEED_CENTER_LNG || 78.9629),
  },
};

export function assertConfig() {
  if (config.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET is missing or too short (min 16 chars). Copy .env.example to .env and set it.');
  }
}
