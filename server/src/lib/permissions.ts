import type { Role } from './constants';

export type Action =
  | 'report:create' | 'report:viewAll'
  | 'task:assign' | 'task:viewAll' | 'task:work'
  | 'verification:decide' | 'analytics:view' | 'route:plan'
  | 'users:list' | 'users:manage';

const MATRIX: Record<Role, readonly Action[]> = {
  citizen: ['report:create'],
  collector: ['report:create', 'task:work', 'route:plan'],
  supervisor: ['report:create', 'report:viewAll', 'task:assign', 'task:viewAll', 'verification:decide', 'analytics:view', 'route:plan', 'users:list'],
  admin: ['report:create', 'report:viewAll', 'task:assign', 'task:viewAll', 'verification:decide', 'analytics:view', 'route:plan', 'users:list', 'users:manage'],
};

export function can(role: string | undefined, action: Action): boolean {
  if (!role || !(role in MATRIX)) return false;
  return MATRIX[role as Role].includes(action);
}
