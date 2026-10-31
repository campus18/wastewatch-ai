import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Role, User } from '../types';
import { Empty, ErrorBanner, errMsg, label, SampleTag, Spinner, useAsync } from '../ui';

const ROLES: Role[] = ['citizen', 'collector', 'supervisor', 'admin'];

export default function UsersPage() {
  const { user: me } = useAuth();
  const users = useAsync(() => api<User[]>('/users'));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const change = async (u: User, role: string) => {
    setSaving(u.id); setError(null);
    try { await api(`/users/${u.id}/role`, { method: 'PATCH', body: { role } }); users.reload(); } catch (e) { setError(errMsg(e)); } finally { setSaving(null); }
  };
  return (
    <>
      <h2 className="page-title">Users and roles</h2>
      <p className="muted">New sign-ups are citizens. Give someone the collector or supervisor role here.</p>
      {users.loading && <Spinner />}
      {(users.error || error) && <ErrorBanner message={(users.error ?? error)!} onRetry={users.reload} />}
      {users.data && !users.data.length && <Empty title="No users" />}
      <ul className="list card">{users.data?.map((u) => (
        <li key={u.id}><span className="li-main"><strong>{u.name}</strong> {u.isSample && <SampleTag />}<span className="muted small">{u.email}</span></span>
          <select aria-label={`Role for ${u.name}`} value={u.role} disabled={u.id === me?.id || saving === u.id} onChange={(e) => change(u, e.target.value)}>{ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}</select>
        </li>
      ))}</ul>
    </>
  );
}
