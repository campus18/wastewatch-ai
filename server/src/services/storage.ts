import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { EXT, detectImageType } from '../lib/files';
import { ApiError } from '../middleware/auth';

/** Validates by magic bytes, stores under an unguessable name, returns the public URL path. */
export async function saveImage(buf: Buffer, field: string): Promise<string> {
  const mime = detectImageType(buf);
  if (!mime) throw new ApiError(400, 'Unsupported image', { [field]: 'Upload a JPEG, PNG or WebP image' });
  await fs.mkdir(config.uploadDir, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${EXT[mime]}`;
  await fs.writeFile(path.join(config.uploadDir, name), buf);
  return `/uploads/${name}`;
}
