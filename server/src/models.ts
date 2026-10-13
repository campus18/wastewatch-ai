import mongoose, { Schema } from 'mongoose';
import type { Model } from 'mongoose';
import { CATEGORIES, REPORT_STATUSES, ROLES, SEVERITIES, TASK_STATUSES } from './lib/constants';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ROLES, default: 'citizen' },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: CATEGORIES, required: true },
  severity: { type: String, enum: SEVERITIES, required: true },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: REPORT_STATUSES, default: 'reported', index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  photoUrl: { type: String, default: '' },
  ai: { type: Schema.Types.Mixed, default: null },
  resolvedAt: { type: Date, default: null },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });
reportSchema.index({ location: '2dsphere' });

const taskSchema = new Schema({
  report: { type: Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
  assignee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: TASK_STATUSES, default: 'assigned', index: true },
  notes: { type: String, default: '', maxlength: 500 },
  beforePhotoUrl: { type: String, default: '' },
  afterPhotoUrl: { type: String, default: '' },
  cleanupNotes: { type: String, default: '', maxlength: 500 },
  submittedAt: { type: Date, default: null },
  verification: {
    decision: { type: String, enum: ['approve', 'reject'] },
    comment: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: Date,
  },
  completedAt: { type: Date, default: null },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true, maxlength: 300 },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export const User: Model<any> = mongoose.model('User', userSchema);
export const Report: Model<any> = mongoose.model('Report', reportSchema);
export const Task: Model<any> = mongoose.model('Task', taskSchema);
export const Notification: Model<any> = mongoose.model('Notification', notificationSchema);
