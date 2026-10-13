import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { assertConfig, config } from '../config';
import { validateRegister } from '../lib/validators';
import { Report, Task, User } from '../models';

const DAY = 86400000;

async function main() {
  assertConfig();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  const { adminEmail, adminPassword, demo, demoPassword, centerLat, centerLng } = config.seed;

  if (process.argv.includes('--reset')) {
    await Promise.all([Report.deleteMany({ isSample: true }), Task.deleteMany({ isSample: true }), User.deleteMany({ isSample: true })]);
    console.log('Removed previous sample data.');
  }

  if (adminEmail || adminPassword) {
    const v = validateRegister({ name: 'Administrator', email: adminEmail, password: adminPassword });
    if (!v.ok) throw new Error(`SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD invalid: ${JSON.stringify(v.errors)}`);
    if (await User.exists({ email: v.value.email })) console.log(`Admin ${v.value.email} already exists — left unchanged.`);
    else { await User.create({ name: 'Administrator', email: v.value.email, passwordHash: await bcrypt.hash(v.value.password, 10), role: 'admin' }); console.log(`Created admin ${v.value.email}`); }
  } else console.log('No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD set — skipping admin creation.');

  if (demo) {
    if (demoPassword.length < 8) throw new Error('SEED_DEMO=true requires SEED_DEMO_PASSWORD (min 8 chars).');
    if (await Report.exists({ isSample: true })) { console.log('Sample data already present (use --reset to recreate).'); return; }
    const hash = await bcrypt.hash(demoPassword, 10);
    const mk = (name: string, role: string) => User.create({ name, email: `${role}@demo.test`, passwordHash: hash, role, isSample: true });
    const [supervisor, collector, citizen]: any[] = await Promise.all([mk('Sample Supervisor', 'supervisor'), mk('Sample Collector', 'collector'), mk('Sample Citizen', 'citizen')]);

    // [dLat, dLng, category, severity, status, daysAgo]  — SAMPLE DATA, not real observations.
    const rows: [number, number, string, string, string, number][] = [
      [0.0000, 0.0000, 'plastic', 'high', 'reported', 1],
      [0.0004, 0.0003, 'mixed', 'critical', 'reported', 2],
      [0.0100, 0.0080, 'construction', 'medium', 'assigned', 3],
      [-0.0090, 0.0120, 'organic', 'low', 'in_progress', 5],
      [0.0150, -0.0100, 'hazardous', 'critical', 'reported', 0],
      [-0.0150, -0.0050, 'electronic', 'medium', 'resolved', 6],
      [0.0050, -0.0140, 'plastic', 'low', 'resolved', 4],
      [-0.0040, 0.0020, 'mixed', 'high', 'reported', 1],
    ];
    const docs: any[] = [];
    for (const [dLat, dLng, category, severity, status, ago] of rows) {
      docs.push(await Report.create({
        reporter: citizen._id, category, severity, status, isSample: true, description: 'Sample report (demo data)',
        location: { type: 'Point', coordinates: [centerLng + dLng, centerLat + dLat] },
        createdAt: new Date(Date.now() - ago * DAY), resolvedAt: status === 'resolved' ? new Date(Date.now() - Math.max(0, ago - 1) * DAY) : null,
      }));
    }
    await Task.create({ report: docs[2]._id, assignee: collector._id, createdBy: supervisor._id, deadline: new Date(Date.now() + 2 * DAY), status: 'assigned', isSample: true, notes: 'Sample task' });
    await Task.create({ report: docs[3]._id, assignee: collector._id, createdBy: supervisor._id, deadline: new Date(Date.now() - 1 * DAY), status: 'in_progress', isSample: true, notes: 'Sample task (overdue)' });
    console.log('Created SAMPLE users: supervisor@demo.test, collector@demo.test, citizen@demo.test (password = SEED_DEMO_PASSWORD) and 8 sample reports.');
  }
}
main().then(() => mongoose.disconnect()).catch((e) => { console.error(e.message); process.exit(1); });
