import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../../shared/api';
import { LoadingRows, PageError, PageHeader } from '../Shared';
import { CATEGORY_LABEL, PRIORITIES, STATUSES, STATUS_LABEL, fmtRate, list, type Count, type Dashboard } from './opsApi';
import { Stat } from './OpsParts';

const countOf = (rows: Count[], key: string) => rows.find(r => r.key === key)?.count ?? 0;

/** Tổng quan vận hành cho OpsManager: ca đang mở, trễ hạn, tải theo người và chất lượng 30 ngày gần nhất. */
export function OpsDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null), [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await list<Dashboard>('/ops/dashboard')); setError(''); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  if (!data) return <><PageHeader title="Tổng quan vận hành" description="Tình hình ticket và đề xuất chờ duyệt."/><PageError message={error} retry={() => void load()}/>{!error && <LoadingRows/>}</>;
  return <>
    <PageHeader title="Tổng quan vận hành" description="Ca đang mở và chất lượng xử lý trong 30 ngày gần nhất."/>
    <PageError message={error} retry={() => void load()}/>
    <div className="fm-stats">
      <Stat label="Ca chưa phân công" value={<Link to="/ops/tickets?assignee=none">{data.unassigned}</Link>}/>
      <Stat label="Ca trễ hạn" value={<Link to="/ops/tickets?overdue=true">{data.overdue}</Link>} tone={data.overdue > 0 ? 'bad' : undefined}/>
      <Stat label="Đề xuất chờ duyệt" value={<Link to="/ops/approvals">{data.pendingApprovals}</Link>}/>
    </div>
    <div className="fm-grid">
      <div className="fm-card">
        <h2>Ca đang mở</h2>
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Trạng thái</th><th>Số ca</th></tr></thead><tbody>{STATUSES.filter(s => s !== 'Closed' && s !== 'Resolved').map(s => <tr key={s}><td>{STATUS_LABEL[s]}</td><td>{countOf(data.openByStatus, s)}</td></tr>)}</tbody></table></div>
        <h3>Theo mức ưu tiên</h3>
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Mức</th><th>Số ca</th></tr></thead><tbody>{PRIORITIES.map(p => <tr key={p}><td>{p}</td><td>{countOf(data.openByPriority, p)}</td></tr>)}</tbody></table></div>
        <h3>Tải theo người</h3>
        {data.load.length === 0 ? <p className="fm-hint">Chưa ai đang giữ ca.</p> : <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Người</th><th>Đang giữ</th><th>Trễ hạn</th></tr></thead><tbody>{data.load.map(l => <tr key={l.userId}><td>{l.displayName ?? l.userId}</td><td>{l.openCount}</td><td>{l.overdueCount > 0 ? <span className="fm-badge bad">{l.overdueCount}</span> : 0}</td></tr>)}</tbody></table></div>}
        <p><Link to="/ops/tickets">Mở hàng đợi ticket →</Link></p>
      </div>
      <div className="fm-card">
        <h2>{data.recentDays} ngày gần nhất</h2>
        <dl className="fm-kv">
          <dt>Số ca mới</dt><dd>{data.recentCount}</dd>
          <dt>Phản hồi đầu đúng hạn</dt><dd>{fmtRate(data.firstResponseOnTimeRate)}</dd>
          <dt>Giải quyết đúng hạn</dt><dd>{fmtRate(data.resolvedOnTimeRate)}</dd>
          <dt>Điểm hài lòng</dt><dd>{data.averageRating === null ? '—' : `${data.averageRating.toFixed(1)} / 5 (${data.ratingCount} đánh giá)`}</dd>
        </dl>
        <h3>Theo loại</h3>
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Loại</th><th>Số ca</th></tr></thead><tbody>{data.recentByCategory.map(c => <tr key={c.key}><td>{CATEGORY_LABEL[c.key] ?? c.key}</td><td>{c.count}</td></tr>)}{data.recentByCategory.length === 0 && <tr><td colSpan={2}>Chưa có ca nào.</td></tr>}</tbody></table></div>
      </div>
    </div>
  </>;
}
