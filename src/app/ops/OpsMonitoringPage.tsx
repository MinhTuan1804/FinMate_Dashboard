import { useCallback, useEffect, useState } from 'react';
import { errorText, type OpsMe } from '../../shared/api';
import { ConfirmReasonDialog, EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { INCIDENT_STATUS_LABEL, SEVERITY_LABEL, SERVICE_STATE_LABEL, fmtDateTime, fmtRate, httpStatus, list, post, type Incident, type IncidentPage, type MonitoringStatus, type OcrStats, type OcrWindow } from './opsApi';
import { OffsetPager } from '../ui/ListControls';
import { SelectFilter, Stat } from './OpsParts';

const STATE_TONE: Record<string, string> = { Healthy: 'good', Unhealthy: 'bad', Disabled: '', Unknown: 'warn' };
const SEVERITY_TONE: Record<string, string> = { Critical: 'bad', High: 'warn', Normal: '' };
const LIMIT = 30;

function StatusTab() {
  const [data, setData] = useState<MonitoringStatus | null>(null), [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await list<MonitoringStatus>('/ops/monitoring/status')); setError(''); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  return <><PageError message={error} retry={() => void load()}/>{!data ? (!error && <LoadingRows/>) : <>
    <div className="fm-stats"><Stat label="Sự cố đang mở" value={data.activeIncidents} tone={data.activeIncidents > 0 ? 'bad' : undefined}/></div>
    <div className="service-grid">{data.services.map(service=><article className="service-card" key={service.service}><h3>{service.service}<span className={`fm-badge ${STATE_TONE[service.state]??''}`}><span className="status-dot"/>{SERVICE_STATE_LABEL[service.state]??service.state}</span></h3><strong>{service.consecutiveFailures} lỗi liên tiếp</strong><div className="service-time"><small>Kiểm tra: {fmtDateTime(service.lastCheckedAt)}</small><small>Tốt gần nhất: {fmtDateTime(service.lastHealthyAt)}</small></div></article>)}</div><p className="fm-hint">Dịch vụ tắt hoặc chưa rõ chưa được tính là sự cố.</p></>}</>;
}

function IncidentsTab({ me }: { me: OpsMe }) {
  const [filters, setFilters] = useState({ status: '', severity: '' }), [offset, setOffset] = useState(0), [page, setPage] = useState<IncidentPage | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null), [resolving, setResolving] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const canManage = me.capabilities.includes('ManageIncidents');
  const load = useCallback(async () => { try { setPage(await list<IncidentPage>('/ops/monitoring/incidents', { ...filters, offset, limit: LIMIT })); setError(''); } catch (e) { setError(errorText(e)); } }, [filters, offset]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function open(i: Incident) { try { setSelected(await list<Incident>(`/ops/monitoring/incidents/${i.id}`)); } catch (e) { setError(errorText(e)); } }
  async function run(path: string, body?: unknown) {
    if (!selected) return;
    setBusy(true);
    try { setSelected(await post<Incident>(`/ops/monitoring/incidents/${selected.id}/${path}`, body)); setError(''); await load(); }
    catch (e) { setError(httpStatus(e) === 409 ? 'Sự cố đã được đóng.' : errorText(e)); await load(); }
    finally { setBusy(false); setResolving(false); }
  }

  return <><PageError message={error} retry={() => void load()}/>
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar">
        <SelectFilter label="Trạng thái" value={filters.status} onChange={v => { setFilters({ ...filters, status: v }); setOffset(0); }} options={Object.entries(INCIDENT_STATUS_LABEL)}/>
        <SelectFilter label="Mức độ" value={filters.severity} onChange={v => { setFilters({ ...filters, severity: v }); setOffset(0); }} options={Object.entries(SEVERITY_LABEL)}/>
        <small className="fm-hint">Không chọn trạng thái thì chỉ hiện sự cố chưa đóng.</small>
      </div>
      {!page ? <LoadingRows/> : page.items.length === 0 ? <EmptyState message="Không có sự cố nào"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Mức độ</th><th>Dịch vụ</th><th>Sự cố</th><th>Trạng thái</th><th>Số lần</th><th>Lần cuối</th></tr></thead><tbody>
          {page.items.map(i => <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => void open(i)}><td><span className={`fm-badge ${SEVERITY_TONE[i.severity] ?? ''}`}>{SEVERITY_LABEL[i.severity] ?? i.severity}</span></td><td>{i.service}</td><td title={i.title}>{i.title}</td><td>{INCIDENT_STATUS_LABEL[i.status] ?? i.status}</td><td>{i.occurrenceCount}</td><td>{fmtDateTime(i.lastSeenAt)}</td></tr>)}
        </tbody></table></div>}
      {page && <OffsetPager offset={page.offset} limit={page.limit} total={page.total} onChange={setOffset}/>}
    </div>
    {selected && <div className="fm-card">
      <h2>{selected.title}<button className="btn btn--small" onClick={() => setSelected(null)}>Đóng chi tiết</button></h2>
      <dl className="fm-kv"><dt>Dịch vụ</dt><dd>{selected.service} ({selected.source})</dd><dt>Mức độ</dt><dd>{SEVERITY_LABEL[selected.severity] ?? selected.severity}</dd><dt>Trạng thái</dt><dd>{INCIDENT_STATUS_LABEL[selected.status] ?? selected.status}</dd><dt>Ảnh hưởng</dt><dd>{selected.impact}</dd><dt>Số lần</dt><dd>{selected.occurrenceCount}</dd><dt>Lần đầu / cuối</dt><dd>{fmtDateTime(selected.firstSeenAt)} → {fmtDateTime(selected.lastSeenAt)}</dd>{selected.technicalDetail && <><dt>Chi tiết kỹ thuật</dt><dd><pre>{selected.technicalDetail}</pre></dd></>}</dl>
      {canManage && selected.status !== 'Resolved' && <div className="fm-toolbar">
        {selected.status === 'Open' && <button className="btn" disabled={busy} onClick={() => void run('acknowledge')}>Nhận xử lý</button>}
        <button className="btn btn--primary" disabled={busy} onClick={() => setResolving(true)}>Đóng sự cố</button>
      </div>}
    </div>}
    {resolving && <ConfirmReasonDialog error={error} title="Đóng sự cố" description="Nếu lỗi còn tiếp diễn, hệ thống sẽ mở sự cố mới." busy={busy} onCancel={() => setResolving(false)} onConfirm={async note => run('resolve', { note })}/>}
  </>;
}

function OcrTab() {
  const [data, setData] = useState<OcrStats | null>(null), [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await list<OcrStats>('/ops/monitoring/ocr')); setError(''); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const row = (label: string, w: OcrWindow) => <tr key={label}><td>{label}</td><td>{w.total}</td><td>{w.success}</td><td>{w.noAmount}</td><td>{w.unreadable}</td><td>{w.googleVision}</td><td>{w.local}</td><td>{fmtRate(w.readableRate)}</td><td>{fmtRate(w.localRate)}</td></tr>;
  return <><PageError message={error} retry={() => void load()}/>{!data ? (!error && <LoadingRows/>) : <div className="fm-card"><div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Khoảng</th><th>Tổng</th><th>Thành công</th><th>Không thấy tiền</th><th>Không đọc được</th><th>Vision</th><th>Cục bộ</th><th>Đọc được</th><th>Tỉ lệ cục bộ</th></tr></thead><tbody>{row('24 giờ', data.last24Hours)}{row('7 ngày', data.last7Days)}</tbody></table></div><p className="fm-hint">Tỉ lệ cục bộ tăng là dấu hiệu Vision đang lỗi; bằng 100% cũng có thể là chưa cấu hình Vision.</p></div>}</>;
}

/** Giám sát hệ thống (OpsManager trở lên): trạng thái dịch vụ, sự cố và chất lượng OCR. */
export function OpsMonitoringPage({ me }: { me: OpsMe }) {
  const [tab, setTab] = useState<'status' | 'incidents' | 'ocr'>('status');
  const tabs: [typeof tab, string][] = [['status', 'Dịch vụ'], ['incidents', 'Sự cố'], ['ocr', 'OCR']];
  return <>
    <PageHeader title="Giám sát hệ thống" description="Hệ thống kiểm tra các dịch vụ mỗi phút và gom lỗi giống nhau thành một sự cố."/>
    <div className="fm-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'status' ? <StatusTab/> : tab === 'incidents' ? <IncidentsTab me={me}/> : <OcrTab/>}
  </>;
}
