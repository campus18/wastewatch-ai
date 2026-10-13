import { Router } from 'express';
import { ApiError, requireAction, requireAuth, wrap } from '../middleware/auth';
import { can } from '../lib/permissions';
import { isObjectId, validateFilters, validateTaskCreate, validateTaskUpdate, validateVerification } from '../lib/validators';
import { Report, Task, User } from '../models';
import { serializeTask } from '../serializers';
import { notify, staffIds } from '../services/notify';
import { saveImage } from '../services/storage';
import { upload } from './reports';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const loadTask = async (id: unknown) => {
  const t = await Task.findById(id).populate('report').populate('assignee', 'name').lean();
  return t ? serializeTask(t) : null;
};
const idParam = (req: any) => { if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid task id'); return req.params.id as string; };
const assertCollector = async (id: string) => {
  const u: any = await User.findById(id).lean();
  if (!u || u.role !== 'collector') throw new ApiError(400, 'Please fix the highlighted fields', { assigneeId: 'Selected user is not a collector' });
  return u;
};

tasksRouter.post('/', requireAction('task:assign'), wrap(async (req, res) => {
  const v = validateTaskCreate(req.body);
  if (!v.ok) throw new ApiError(400, 'Please fix the highlighted fields', v.errors);
  const report: any = await Report.findOneAndUpdate({ _id: v.value.reportId, status: 'reported' }, { status: 'assigned' });
  if (!report) {
    if (!(await Report.exists({ _id: v.value.reportId }))) throw new ApiError(404, 'Report not found');
    throw new ApiError(409, 'This report already has an active cleanup task');
  }
  try { await assertCollector(v.value.assigneeId); }
  catch (e) { await Report.updateOne({ _id: report._id }, { status: 'reported' }); throw e; }
  const task: any = await Task.create({ report: report._id, assignee: v.value.assigneeId, createdBy: req.user.id, deadline: v.value.deadline, notes: v.value.notes });
  await notify([v.value.assigneeId], 'assignment', `You were assigned a ${report.severity} ${report.category} cleanup`, `/tasks?open=${task._id}`);
  await notify([report.reporter], 'report-update', 'Your report has been assigned to a collector', `/reports?open=${report._id}`);
  res.status(201).json(await loadTask(task._id));
}));

tasksRouter.get('/', wrap(async (req, res) => {
  if (req.user.role === 'citizen') throw new ApiError(403, 'You do not have permission to view tasks');
  const f = validateFilters(req.query);
  if (!f.ok) throw new ApiError(400, 'Invalid filter', f.errors);
  const q: Record<string, unknown> = {};
  if (f.value.status) q.status = f.value.status;
  if (!can(req.user.role, 'task:viewAll')) q.assignee = req.user.id;
  const rows = await Task.find(q).sort({ deadline: 1 }).limit(300).populate('report').populate('assignee', 'name').lean();
  res.json(rows.map((t) => serializeTask(t)));
}));

tasksRouter.patch('/:id', requireAction('task:assign'), wrap(async (req, res) => {
  const id = idParam(req);
  const v = validateTaskUpdate(req.body);
  if (!v.ok) throw new ApiError(400, 'Please fix the highlighted fields', v.errors);
  if (v.value.assigneeId) await assertCollector(v.value.assigneeId);
  const update: Record<string, unknown> = {};
  if (v.value.assigneeId) update.assignee = v.value.assigneeId;
  if (v.value.deadline) update.deadline = v.value.deadline;
  if (v.value.notes !== undefined) update.notes = v.value.notes;
  const t: any = await Task.findOneAndUpdate({ _id: id, status: { $ne: 'completed' } }, update, { new: false });
  if (!t) throw new ApiError(404, 'Task not found or already completed');
  const targets = v.value.assigneeId && v.value.assigneeId !== String(t.assignee) ? [v.value.assigneeId] : [t.assignee];
  if (v.value.assigneeId || v.value.deadline) await notify(targets, 'assignment', 'A cleanup task assigned to you was updated', `/tasks?open=${id}`);
  res.json(await loadTask(id));
}));

tasksRouter.post('/:id/start', requireAction('task:work'), wrap(async (req, res) => {
  const id = idParam(req);
  const t: any = await Task.findOneAndUpdate({ _id: id, assignee: req.user.id, status: 'assigned' }, { status: 'in_progress' });
  if (!t) throw new ApiError(409, 'Only your own assigned tasks can be started');
  const report: any = await Report.findByIdAndUpdate(t.report, { status: 'in_progress' });
  if (report) await notify([report.reporter], 'report-update', 'Cleanup of your report has started', `/reports?open=${report._id}`);
  res.json(await loadTask(id));
}));

tasksRouter.post('/:id/cleanup', requireAction('task:work'), upload.fields([{ name: 'before', maxCount: 1 }, { name: 'after', maxCount: 1 }]), wrap(async (req, res) => {
  const id = idParam(req);
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const errors: Record<string, string> = {};
  if (!files.before?.[0]) errors.before = 'Add a "before" photo';
  if (!files.after?.[0]) errors.after = 'Add an "after" photo';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
  if (notes.length > 500) errors.notes = 'Notes must be at most 500 characters';
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);
  const current: any = await Task.findOne({ _id: id, assignee: req.user.id, status: { $in: ['assigned', 'in_progress'] } }).lean();
  if (!current) throw new ApiError(409, 'Only your own open tasks can be submitted for verification');
  const beforePhotoUrl = await saveImage(files.before[0].buffer, 'before');
  const afterPhotoUrl = await saveImage(files.after[0].buffer, 'after');
  const t: any = await Task.findOneAndUpdate(
    { _id: id, assignee: req.user.id, status: { $in: ['assigned', 'in_progress'] } },
    { status: 'pending_verification', beforePhotoUrl, afterPhotoUrl, cleanupNotes: notes, submittedAt: new Date(), $unset: { verification: 1 } },
  );
  if (!t) throw new ApiError(409, 'This task changed while you were uploading — reload and try again');
  await Report.updateOne({ _id: t.report }, { status: 'pending_verification' });
  await notify(await staffIds(), 'verification', `${req.user.name} submitted a cleanup for verification`, `/tasks?open=${id}`);
  res.json(await loadTask(id));
}));

tasksRouter.post('/:id/verify', requireAction('verification:decide'), wrap(async (req, res) => {
  const id = idParam(req);
  const v = validateVerification(req.body);
  if (!v.ok) throw new ApiError(400, 'Please fix the highlighted fields', v.errors);
  const approve = v.value.decision === 'approve';
  const now = new Date();
  const t: any = await Task.findOneAndUpdate(
    { _id: id, status: 'pending_verification' },
    { status: approve ? 'completed' : 'in_progress', completedAt: approve ? now : null, verification: { decision: v.value.decision, comment: v.value.comment, by: req.user.id, at: now } },
  );
  if (!t) throw new ApiError(409, 'Only tasks awaiting verification can be approved or rejected');
  const report: any = await Report.findByIdAndUpdate(t.report, approve ? { status: 'resolved', resolvedAt: now } : { status: 'in_progress' });
  await notify([t.assignee], 'verification', approve ? 'Your cleanup was approved' : `Your cleanup was rejected: ${v.value.comment}`.slice(0, 300), `/tasks?open=${id}`);
  if (approve && report) await notify([report.reporter], 'report-update', 'Your report has been resolved', `/reports?open=${report._id}`);
  res.json(await loadTask(id));
}));
