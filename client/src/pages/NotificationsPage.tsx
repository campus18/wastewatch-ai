import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import type { Notice } from '../types';
import { Empty, ErrorBanner, errMsg, fmtDate, Spinner, useAsync } from '../ui';

export default function NotificationsPage() {
  const n = useAsync(() => api<{ unread: number; items: Notice[] }>('/notifications'));
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); n.reload(); window.dispatchEvent(new Event('ww:notifications')); } catch (e) { setError(errMsg(e)); } };
  const open = (x: Notice) => act(async () => { if (!x.read) await api(`/notifications/${x.id}/read`, { method: 'POST' }); if (x.link) nav(x.link); });
  return (
    <>
      <div className="row between wrap"><h2 className="page-title">Notifications</h2>
        <button className="btn" disabled={!n.data?.unread} onClick={() => act(() => api('/notifications/read-all', { method: 'POST' }))}>Mark all as read</button>
      </div>
      {n.loading && <Spinner />}
      {(n.error || error) && <ErrorBanner message={(n.error ?? error)!} onRetry={n.reload} />}
      {n.data && !n.data.items.length && <Empty title="You're all caught up" hint="Updates about reports, assignments and verification show up here." />}
      <ul className="list card">{n.data?.items.map((x) => (
        <li key={x.id} className={x.read ? '' : 'unread'}><button className="li-main" onClick={() => open(x)}><span>{x.message}</span><span className="muted small">{fmtDate(x.createdAt)}</span></button>{!x.read && <span className="badge st-assigned">New</span>}</li>
      ))}</ul>
    </>
  );
}
