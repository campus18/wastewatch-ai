import { Notification, User } from '../models';

export async function notify(userIds: unknown[], type: string, message: string, link = '') {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (!ids.length) return;
  await Notification.insertMany(ids.map((user) => ({ user, type, message, link })));
}

export async function staffIds() {
  const staff = await User.find({ role: { $in: ['supervisor', 'admin'] } }, '_id').lean();
  return staff.map((u: any) => u._id);
}
