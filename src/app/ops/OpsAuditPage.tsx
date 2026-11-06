import { DialogOverlay } from '../ui/DialogOverlay';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { errorText } from '../../shared/api';
import type { AuditLog } from '../../shared/models';
import { CursorPager, EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { fmtDateTime, httpStatus, list } from './opsApi';

type AuditPage = { items: AuditLog[]; nextCursor: string | null };

function prettyMetadata(raw: string | null): string {
  if (!raw) return '—';
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

/** Audit vận hành: backend chỉ trả sự kiện `Ops.*`, hỏi sự kiện khác thì 403. Khác `/admin/audit-logs` ở dạng phân trang (nextCursor trong data). */
export function OpsAuditPage() {
  const [filters, setFilters] = useState({ eventType: '', search: '', from: '', to: '' }), [applied, setApplied] = useState(filters);
  const [stack, setStack] = useState<(string | null)[]>([null]), [page, setPage] = useState<AuditPage | null>(null), [selected, setSelected] = useState<AuditLog | null>(null), [error, setError] = useState('');
  const cursor = stack.at(-1) ?? null;
  const load = useCallback(async () => {
    try {
      setPage(await list<AuditPage>('/ops/audit-logs', { eventType: applied.eventType, search: applied.search.trim(), from: applied.from && new Date(applied.from).toISOString(), to: applied.to && new Date(applied.to).toISOString(), cursor: cursor ?? undefined, limit: 30 }));
      setError('');
    } catch (e) { setError(httpStatus(e) === 403 ? 'Chỉ xem được các sự kiện vận hành (bắt đầu bằng "Ops.").' : errorText(e)); }
  }, [applied, cursor]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const apply = (event: FormEvent) => { event.preventDefault(); setStack([null]); setApplied(filters); };

  return <>
    <PageHeader title="Audit vận hành" description="Thao tác của đội vận hành: nhận ca, xem dữ liệu khách, duyệt đề xuất, xử lý sự cố."/>
    <PageError message={error} retry={() => void load()}/>
    <div className="fm-card">
      <form className="fm-toolbar" onSubmit={apply}>
        <label>Sự kiện<input value={filters.eventType} onChange={e => setFilters({ ...filters, eventType: e.target.value })} placeholder="Ops...."/></label>
        <label>Tìm (sự kiện, IP)<input type="search" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Một phần tên sự kiện hoặc IP"/></label>
        <label>Từ<input type="datetime-local" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}/></label>
        <label>Đến<input type="datetime-local" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}/></label>
        <button className="btn btn--primary">Áp dụng</button>
      </form>
      {!page ? (!error && <LoadingRows/>) : page.items.length === 0 ? <EmptyState message="Chưa có sự kiện nào"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Sự kiện</th><th>IP</th><th></th></tr></thead><tbody>
          {page.items.map(r => <tr key={r.id}><td>{fmtDateTime(r.createdAt)}</td><td title={r.userId ?? ''}>{r.userId?.slice(0, 8) ?? '—'}</td><td>{r.eventType}</td><td>{r.ipAddress ?? '—'}</td><td className="fm-actions"><button className="btn btn--small" onClick={() => setSelected(r)}>Chi tiết</button></td></tr>)}
        </tbody></table></div>}
      <CursorPager back={stack.length > 1} next={Boolean(page?.nextCursor)} onBack={() => setStack(s => s.slice(0, -1))} onNext={() => page?.nextCursor && setStack(s => [...s, page.nextCursor])}/>
    </div>
    {selected && <DialogOverlay onClose={()=>setSelected(null)}><div className="fm-modal" role="dialog" aria-modal="true" aria-label="Chi tiết audit"><div className="fm-modal-head"><h2>{selected.eventType}</h2><button data-dialog-close className="btn" onClick={() => setSelected(null)}>Đóng</button></div><div className="fm-form"><p>Thời gian: {fmtDateTime(selected.createdAt)}</p><p>Người thực hiện: {selected.userId ?? '—'}</p><p>IP: {selected.ipAddress ?? '—'}</p><h3>Metadata</h3><pre className="fm-json">{prettyMetadata(selected.metadata)}</pre></div></div></DialogOverlay>}
  </>;
}
