import { Router } from 'express';
import multer from 'multer';
import { config } from '../config';
import { ApiError, requireAction, requireAuth, wrap } from '../middleware/auth';
import { can } from '../lib/permissions';
import { isObjectId, validateFilters, validateReport } from '../lib/validators';
import { Report, Task } from '../models';
import { serializeReport, serializeTask } from '../serializers';
import { analyzeImage } from '../services/ai';
import { notify, staffIds } from '../services/notify';
import { saveImage } from '../services/storage';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 2 } });
export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.post('/', requireAction('report:create'), upload.single('photo'), wrap(async (req, res) => {
  const v = validateReport(req.body);
  const errors: Record<string, string> = v.ok ? {} : { ...v.errors };
  if (!req.file) errors.photo = 'Add a photo of the waste';
  if (!v.ok || Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);
  const photoUrl = await saveImage(req.file!.buffer, 'photo');
  const ai = await analyzeImage(req.file!.buffer); // never throws; failures are recorded in the result
  const doc = await Report.create({
    reporter: req.user.id, category: v.value.category, severity: v.value.severity, description: v.value.description,
    location: { type: 'Point', coordinates: [v.value.lng, v.value.lat] }, photoUrl, ai,
  });
  await notify(await staffIds(), 'report', `New ${v.value.severity} ${v.value.category} report submitted`, `/reports?open=${doc._id}`);
  res.status(201).json(serializeReport(doc.toObject()));
}));

reportsRouter.get('/', wrap(async (req, res) => {
  const f = validateFilters(req.query);
  if (!f.ok) throw new ApiError(400, 'Invalid filter', f.errors);
  const q: Record<string, unknown> = { ...f.value };
  if (!can(req.user.role, 'report:viewAll')) q.reporter = req.user.id;
  const rows = await Report.find(q).sort({ createdAt: -1 }).limit(300).populate('reporter', 'name').lean();
  res.json(rows.map(serializeReport));
}));

// Hotspot map feed: visible to every signed-in user, reporter identity and AI details omitted.
reportsRouter.get('/map', wrap(async (req, res) => {
  const f = validateFilters(req.query);
  if (!f.ok) throw new ApiError(400, 'Invalid filter', f.errors);
  const rows = await Report.find({ ...f.value }).sort({ createdAt: -1 }).limit(1000).lean();
  res.json(rows.map((r) => { const { reporter, ai, ...rest } = serializeReport(r); return rest; }));
}));

reportsRouter.get('/:id', wrap(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid report id');
  const r: any = await Report.findById(req.params.id).populate('reporter', 'name').lean();
  if (!r) throw new ApiError(404, 'Report not found');
  const isOwner = String(r.reporter._id) === req.user.id;
  if (!isOwner && !can(req.user.role, 'report:viewAll')) throw new ApiError(403, 'You do not have permission to view this report');
  const task: any = await Task.findOne({ report: r._id }).sort({ createdAt: -1 }).populate('assignee', 'name').lean();
  res.json({ ...serializeReport(r), task: task ? serializeTask({ ...task, report: undefined }) : null });
}));
