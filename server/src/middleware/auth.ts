import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { can } from '../lib/permissions';
import type { Action } from '../lib/permissions';
import type { Role } from '../lib/constants';
import { User } from '../models';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) { super(message); }
}

export interface AuthedRequest extends Request { user: { id: string; role: Role; name: string; email: string } }

export const wrap = (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

export const signToken = (userId: string) => jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });

export const requireAuth: RequestHandler = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new ApiError(401, 'Sign in required');
  let sub: string;
  try { sub = (jwt.verify(token, config.jwtSecret) as { sub: string }).sub; }
  catch { throw new ApiError(401, 'Session expired — sign in again'); }
  // Look the user up every request so role changes / deletions take effect immediately.
  const user: any = await User.findById(sub).lean();
  if (!user) throw new ApiError(401, 'Account no longer exists');
  req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
  next();
});

export const requireAction = (action: Action): RequestHandler => (req, _res, next) => {
  if (!can((req as AuthedRequest).user?.role, action)) return next(new ApiError(403, 'You do not have permission to do that'));
  next();
};
