import { Router } from 'express';
import { ROLES } from '../lib/constants';
import { computeAnalytics } from '../lib/analytics';
import { isValidLatLng } from '../lib/geo';
import { isObjectId, validateRoutePlan } from '../lib/validators';
import { ApiError, requireAction, requireAuth, wrap } from '../middleware/auth';
import { Notification, Report, Task, User } from '../models';
import { fetchSatellite, imageryCapability } from '../services/imagery';
import { planRoute } from '../services/routing';

// ---- notifications ----
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get('/', wrap(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user.id, read: false }),
  ]);
  res.json({ unread, items: items.map((n: any) => ({ id: String(n._id), type: n.type, message: n.message, link: n.link, read: n.read, createdAt: n.createdAt })) });
}));
notificationsRouter.post('/read-all', wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
}));
notificationsRouter.post('/:id/read', wrap(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid notification id');
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { read: true });
  res.json({ ok: true });
}));

// ---- analytics (computed from stored records only) ----
export const analyticsRouter = Router();
analyticsRouter.get('/', requireAuth, requireAction('analytics:view'), wrap(async (req, res) => {
  const days = [7, 14, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 14;
  const [reports, tasks] = await Promise.all([
    Report.find({}, 'status category severity createdAt resolvedAt location').lean(),
    Task.find({}, 'status deadline').lean(),
  ]);
  const data = computeAnalytics({
    reports: reports.map((r: any) => ({ id: String(r._id), status: r.status, category: r.category, severity: r.severity, createdAt: r.createdAt, resolvedAt: r.resolvedAt, location: { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } })),
    tasks: tasks as any, days,
  });
  res.json({ days, generatedAt: new Date().toISOString(), ...data });
}));

// ---- route planning ----
export const routingRouter = Router();
routingRouter.post('/plan', requireAuth, requireAction('route:plan'), wrap(async (req, res) => {
  const v = validateRoutePlan(req.body);
  if (!v.ok) throw new ApiError(400, 'Please fix the highlighted fields', v.errors);
  const tasks: any[] = await Task.find({ _id: { $in: v.value.taskIds } }).populate('report').lean();
  if (tasks.length !== v.value.taskIds.length) throw new ApiError(404, 'One or more tasks were not found');
  if (req.user.role === 'collector' && tasks.some((t) => String(t.assignee) !== req.user.id)) throw new ApiError(403, 'You can only plan routes for your own tasks');
  if (tasks.some((t) => t.status === 'completed')) throw new ApiError(400, 'Please fix the highlighted fields', { taskIds: 'Completed tasks cannot be routed' });
  const stops = tasks.map((t) => ({ id: String(t._id), lat: t.report.location.coordinates[1], lng: t.report.location.coordinates[0] }));
  const plan = await planRoute(v.value.start ?? null, stops);
  const byId = new Map(tasks.map((t) => [String(t._id), t]));
  res.json({
    ...plan,
    start: v.value.start ?? null,
    stops: plan.order.map((id, i) => {
      const t = byId.get(id)!;
      return { taskId: id, position: i + 1, lat: t.report.location.coordinates[1], lng: t.report.location.coordinates[0], category: t.report.category, severity: t.report.severity, deadline: t.deadline };
    }),
  });
}));

// ---- satellite imagery (proxied so the provider token stays server-side) ----
export const imageryRouter = Router();
imageryRouter.get('/', requireAuth, wrap(async (req, res) => {
  if (!imageryCapability().configured) return res.status(503).json({ available: false, error: 'Satellite imagery is not configured on this server.' });
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  const zoom = Math.min(19, Math.max(1, Math.round(Number(req.query.zoom ?? 17)) || 17));
  if (!isValidLatLng({ lat, lng })) throw new ApiError(400, 'Valid lat and lng are required');
  try {
    const img = await fetchSatellite(lat, lng, zoom);
    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(img.data);
  } catch (e: any) {
    throw new ApiError(502, `Imagery provider error: ${e.message}`);
  }
}));

// ---- users ----
export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get('/', requireAction('users:list'), wrap(async (req, res) => {
  const q: Record<string, unknown> = {};
  if (typeof req.query.role === 'string') { if (!(ROLES as readonly string[]).includes(req.query.role)) throw new ApiError(400, 'Invalid role'); q.role = req.query.role; }
  const rows = await User.find(q, 'name email role isSample').sort({ name: 1 }).limit(500).lean();
  res.json(rows.map((u: any) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, isSample: !!u.isSample })));
}));
usersRouter.patch('/:id/role', requireAction('users:manage'), wrap(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid user id');
  const role = req.body?.role;
  if (typeof role !== 'string' || !(ROLES as readonly string[]).includes(role)) throw new ApiError(400, 'Please fix the highlighted fields', { role: 'Invalid role' });
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own role');
  const u: any = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
  if (!u) throw new ApiError(404, 'User not found');
  await Notification.create({ user: u._id, type: 'role', message: `Your role is now ${role}`, link: '/' });
  res.json({ id: String(u._id), name: u.name, email: u.email, role: u.role });
}));
