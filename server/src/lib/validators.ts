import { CATEGORIES, REPORT_STATUSES, SEVERITIES, TASK_STATUSES } from './constants';
import type { Category, Severity } from './constants';
import { isValidLatLng } from './geo';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
type Errors = Record<string, string>;

const isStr = (v: unknown): v is string => typeof v === 'string';
export const isObjectId = (v: unknown): v is string => isStr(v) && /^[a-f\d]{24}$/i.test(v);
const done = <T>(errors: Errors, value: T): Result<T> => (Object.keys(errors).length ? { ok: false, errors } : { ok: true, value });
const num = (v: unknown): number => (isStr(v) && v.trim() === '' ? NaN : typeof v === 'number' ? v : Number(v));
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => isStr(v) && (list as readonly string[]).includes(v);
const optText = (v: unknown, max: number, field: string, errors: Errors): string => {
  if (v === undefined || v === null || v === '') return '';
  if (!isStr(v)) { errors[field] = `${field} must be text`; return ''; }
  const t = v.trim();
  if (t.length > max) errors[field] = `${field} must be at most ${max} characters`;
  return t;
};

export function validateRegister(b: any): Result<{ name: string; email: string; password: string }> {
  const errors: Errors = {};
  const name = isStr(b?.name) ? b.name.trim() : '';
  const email = isStr(b?.email) ? b.email.trim().toLowerCase() : '';
  const password = isStr(b?.password) ? b.password : '';
  if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2–80 characters';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8 || password.length > 128) errors.password = 'Password must be 8–128 characters';
  return done(errors, { name, email, password });
}

export function validateLogin(b: any): Result<{ email: string; password: string }> {
  const errors: Errors = {};
  const email = isStr(b?.email) ? b.email.trim().toLowerCase() : '';
  const password = isStr(b?.password) ? b.password : '';
  if (!email) errors.email = 'Email is required';
  if (!password) errors.password = 'Password is required';
  return done(errors, { email, password });
}

export function validateReport(b: any): Result<{ lat: number; lng: number; category: Category; severity: Severity; description: string }> {
  const errors: Errors = {};
  const lat = num(b?.lat);
  const lng = num(b?.lng);
  if (!isValidLatLng({ lat, lng })) errors.location = 'Choose a location on the map (valid latitude/longitude)';
  if (!oneOf(CATEGORIES, b?.category)) errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;
  if (!oneOf(SEVERITIES, b?.severity)) errors.severity = `Severity must be one of: ${SEVERITIES.join(', ')}`;
  const description = optText(b?.description, 1000, 'description', errors);
  return done(errors, { lat, lng, category: b?.category, severity: b?.severity, description });
}

export function validateTaskCreate(b: any, now = new Date()): Result<{ reportId: string; assigneeId: string; deadline: Date; notes: string }> {
  const errors: Errors = {};
  if (!isObjectId(b?.reportId)) errors.reportId = 'A valid report is required';
  if (!isObjectId(b?.assigneeId)) errors.assigneeId = 'Choose a collector';
  const deadline = new Date(b?.deadline);
  if (!isStr(b?.deadline) || Number.isNaN(deadline.getTime())) errors.deadline = 'Enter a valid deadline';
  else if (deadline.getTime() <= now.getTime()) errors.deadline = 'Deadline must be in the future';
  const notes = optText(b?.notes, 500, 'notes', errors);
  return done(errors, { reportId: b?.reportId, assigneeId: b?.assigneeId, deadline, notes });
}

export function validateTaskUpdate(b: any, now = new Date()): Result<{ assigneeId?: string; deadline?: Date; notes?: string }> {
  const errors: Errors = {};
  const value: { assigneeId?: string; deadline?: Date; notes?: string } = {};
  if (b?.assigneeId !== undefined) { if (isObjectId(b.assigneeId)) value.assigneeId = b.assigneeId; else errors.assigneeId = 'Choose a valid collector'; }
  if (b?.deadline !== undefined) {
    const d = new Date(b.deadline);
    if (!isStr(b.deadline) || Number.isNaN(d.getTime())) errors.deadline = 'Enter a valid deadline';
    else if (d.getTime() <= now.getTime()) errors.deadline = 'Deadline must be in the future';
    else value.deadline = d;
  }
  if (b?.notes !== undefined) value.notes = optText(b.notes, 500, 'notes', errors);
  if (!Object.keys(errors).length && !Object.keys(value).length) errors.form = 'Nothing to update';
  return done(errors, value);
}

export function validateVerification(b: any): Result<{ decision: 'approve' | 'reject'; comment: string }> {
  const errors: Errors = {};
  if (b?.decision !== 'approve' && b?.decision !== 'reject') errors.decision = 'Decision must be approve or reject';
  const comment = optText(b?.comment, 500, 'comment', errors);
  if (b?.decision === 'reject' && !comment) errors.comment = 'Explain why the cleanup was rejected';
  return done(errors, { decision: b?.decision, comment });
}

export function validateRoutePlan(b: any): Result<{ taskIds: string[]; start?: { lat: number; lng: number } }> {
  const errors: Errors = {};
  const ids: unknown = b?.taskIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 25 || !ids.every(isObjectId)) errors.taskIds = 'Select 1–25 tasks';
  else if (new Set(ids).size !== ids.length) errors.taskIds = 'Duplicate tasks selected';
  let start: { lat: number; lng: number } | undefined;
  if (b?.start !== undefined && b?.start !== null) {
    const s = { lat: num(b.start.lat), lng: num(b.start.lng) };
    if (isValidLatLng(s)) start = s; else errors.start = 'Start location is invalid';
  }
  return done(errors, { taskIds: ids as string[], start });
}

/** Parses optional enum filters from a query string; invalid values are reported, not ignored. */
export function validateFilters(q: any): Result<{ status?: string; category?: string; severity?: string }> {
  const errors: Errors = {};
  const value: { status?: string; category?: string; severity?: string } = {};
  const pick = (key: 'status' | 'category' | 'severity', list: readonly string[]) => {
    const v = q?.[key];
    if (v === undefined || v === '') return;
    if (oneOf(list, v)) value[key] = v; else errors[key] = `Invalid ${key}`;
  };
  pick('status', [...REPORT_STATUSES, ...TASK_STATUSES]);
  pick('category', CATEGORIES);
  pick('severity', SEVERITIES);
  return done(errors, value);
}
