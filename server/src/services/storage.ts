import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { EXT, detectImageType } from '../lib/files';
import { ApiError } from '../middleware/auth';
import { Upload } from '../models';

/** Validates by magic bytes and stores in MongoDB so Render restarts don't remove uploads. */
export async function saveImage(buf: Buffer, field: string): Promise<string> {
  const mime = detectImageType(buf);
  if (!mime) throw new ApiError(400, 'Unsupported image', { [field]: 'Upload a JPEG, PNG or WebP image' });
  const name = `${crypto.randomBytes(16).toString('hex')}.${EXT[mime]}`;
  await Upload.create({ filename: name, contentType: mime, data: buf });
  return `/uploads/${name}`;
}

/** Read from durable MongoDB storage, with a local disk fallback for development/legacy files. */
export async function readImage(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!/^[a-f0-9]{32}\.(?:jpg|png|webp)$/.test(name)) return null;
  const stored: any = await Upload.findOne({ filename: name }).lean();
  if (stored) return { data: stored.data as Buffer, contentType: stored.contentType as string };

  // Keep local development and any still-present legacy files working.
  try {
    const data = await fs.readFile(path.join(config.uploadDir, name));
    const mime = detectImageType(data);
    return mime ? { data, contentType: mime } : null;
  } catch {
    return null;
  }
}
