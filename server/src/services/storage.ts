import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { EXT, detectImageType } from '../lib/files';
import { ApiError } from '../middleware/auth';
import { Upload } from '../models';

function decodeStoredImageData(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);

  if (typeof value === 'string') {
    let encoded = value.trim();
    try {
      const parsed: unknown = JSON.parse(encoded);
      if (typeof parsed === 'string') encoded = parsed;
      else if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'Buffer' && 'data' in parsed && Array.isArray(parsed.data)) {
        return Buffer.from(parsed.data);
      }
    } catch {
      // The value may already be plain base64 or raw UTF-8 data.
    }

    const dataUrl = encoded.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/i);
    if (dataUrl) encoded = dataUrl[1];
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) && encoded.length % 4 === 0) {
      const decoded = Buffer.from(encoded, 'base64');
      if (detectImageType(decoded)) return decoded;
    }

    const raw = Buffer.from(encoded, 'utf8');
    return detectImageType(raw) ? raw : null;
  }

  if (value && typeof value === 'object') {
    const binary = value as { _bsontype?: string; value?: (includeContent?: boolean) => Uint8Array; type?: string; data?: unknown };
    if (binary._bsontype === 'Binary' && typeof binary.value === 'function') {
      const decoded = Buffer.from(binary.value(true));
      return detectImageType(decoded) ? decoded : null;
    }
    if (binary.type === 'Buffer' && Array.isArray(binary.data)) {
      const decoded = Buffer.from(binary.data as number[]);
      return detectImageType(decoded) ? decoded : null;
    }
  }

  return null;
}

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
  if (stored) {
    const data = decodeStoredImageData(stored.data);
    const contentType = data && detectImageType(data);
    if (data && contentType) return { data, contentType };
  }

  // Keep local development and any still-present legacy files working.
  try {
    const data = await fs.readFile(path.join(config.uploadDir, name));
    const mime = detectImageType(data);
    return mime ? { data, contentType: mime } : null;
  } catch {
    return null;
  }
}
