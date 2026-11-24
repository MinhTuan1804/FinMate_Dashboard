import { isAdminRole } from '../../shared/permissions';
import { serviceLabel } from '../../shared/presentation';
import { useServerList } from '../ui/useServerList';
import { ProviderDiagnostics, ErrorDiagnostics } from './MonitoringDiagnostics';
import { useUrlState } from '../ui/useUrlState';
import { useCallback, useEffect, useState } from 'react';
import { errorText, type OpsMe } from '../../shared/api';
import { ConfirmReasonDialog, EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { INCIDENT_STATUS_LABEL, SEVERITY_LABEL, fmtDateTime, fmtRate, httpStatus, list, post, type Incident, type OcrStats, type OcrWindow } from './opsApi';
import { OffsetPager } from '../ui/ListControls';
import { SelectFilter } from './OpsParts';
import { ServiceStatusPanel } from './ServiceStatusPanel';

const SEVERITY_TONE: Record<string, string> = { Critical: 'bad', High: 'warn', Normal: '' };
const LIMIT = 30;

function IncidentsTab({ me }: { me: OpsMe }) {
  const [status,setStatus]=useUrlState('incidentStatus'),[severity,setSeverity]=useUrlState('severity');
  const resource=useServerList<Incident>('/ops/monitoring/incidents',{params:{status:status||undefined,severity:severity||undefined},limit:LIMIT});
  const page=resource.data?{items:resource.rows,total:resource.total,offset:resource.offset,limit:resource.limit}:null,setOffset=resource.setOffset,load=resource.reload;
  const [selected, setSelected] = useState<Incident | null>(null), [resolving, setResolving] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const canManage = me.capabilities.includes('ManageIncidents');


  async function open(i: Incident) { try { setSelected(await list<Incident>(`/ops/monitoring/incidents/${i.id}`)); } catch (e) { setError(errorText(e)); } }
  async function run(path: string, body?: unknown) {
    if (!selected) return;
    setBusy(true);
    try { setSelected(await post<Incident>(`/ops/monitoring/incidents/${selected.id}/${path}`, body)); setError(''); await load(); }
    catch (e) { setError(httpStatus(e) === 409 ? 'Sự cố đã được đóng.' : errorText(e)); await load(); }
    finally { setBusy(false); setResolving(false); }
  }

  return <><PageError message={error||resource.error} retry={() => void load()}/>
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar">
        <SelectFilter label="Trạng thái" value={status} onChange={setStatus} options={Object.entries(INCIDENT_STATUS_LABEL)}/>
        <SelectFilter label="Mức độ" value={severity} onChange={setSeverity} options={Object.entries(SEVERITY_LABEL)}/>
        <small className="fm-hint">Không chọn trạng thái thì chỉ hiện sự cố chưa đóng.</small>
      </div>
      {!page ? (!resource.error&&<LoadingRows/>) : page.items.length === 0 ? <EmptyState message="Không có sự cố nào"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Mức độ</th><th>Dịch vụ</th><th>Sự cố</th><th>Trạng thái</th><th>Số lần</th><th>Lần cuối</th></tr></thead><tbody>
          {page.items.map(i => <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => void open(i)}><td><span className={`fm-badge ${SEVERITY_TONE[i.severity] ?? ''}`}>{SEVERITY_LABEL[i.severity] ?? i.severity}</span></td><td>{serviceLabel(i.service)}</td><td><button className="cell-link" onClick={event=>{event.stopPropagation();void open(i);}}>{i.title}</button></td><td>{INCIDENT_STATUS_LABEL[i.status] ?? i.status}</td><td>{i.occurrenceCount}</td><td>{fmtDateTime(i.lastSeenAt)}</td></tr>)}
        </tbody></table></div>}
      {page && <OffsetPager offset={page.offset} limit={page.limit} total={page.total} onChange={setOffset}/>}
    </div>
    {selected && <div className="fm-card">
      <h2>{selected.title}<button className="btn btn--small" onClick={() => setSelected(null)}>Đóng chi tiết</button></h2>
      <dl className="fm-kv"><dt>Dịch vụ</dt><dd>{serviceLabel(selected.service)}</dd><dt>Mức độ</dt><dd>{SEVERITY_LABEL[selected.severity] ?? selected.severity}</dd><dt>Trạng thái</dt><dd>{INCIDENT_STATUS_LABEL[selected.status] ?? selected.status}</dd><dt>Ảnh hưởng</dt><dd>{selected.impact}</dd><dt>Số lần</dt><dd>{selected.occurrenceCount}</dd><dt>Lần đầu / cuối</dt><dd>{fmtDateTime(selected.firstSeenAt)} → {fmtDateTime(selected.lastSeenAt)}</dd>{selected.technicalDetail && <><dt>Chi tiết kỹ thuật</dt><dd><details className="technical-details"><summary>Thông tin dành cho kỹ thuật</summary><pre>{selected.technicalDetail}</pre></details></dd></>}</dl>
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
  return <><PageError message={error} retry={() => void load()}/>{!data ? (!error && <LoadingRows/>) : <div className="fm-card"><div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Khoảng</th><th>Tổng</th><th>Thành công</th><th>Không thấy tiền</th><th>Không đọc được</th><th>Đọc ảnh Google</th><th>Xử lý tại thiết bị</th><th>Đọc được</th><th>Tỷ lệ xử lý tại thiết bị</th></tr></thead><tbody>{row('24 giờ', data.last24Hours)}{row('7 ngày', data.last7Days)}</tbody></table></div><p className="fm-hint">Tỷ lệ xử lý tại thiết bị tăng có thể do dịch vụ đọc ảnh Google bị gián đoạn hoặc chưa được cấu hình.</p></div>}</>;
}

/** Giám sát hệ thống (OpsManager trở lên): trạng thái dịch vụ, sự cố và chất lượng OCR. */
export function OpsMonitoringPage({ me }: { me: OpsMe }) {
  const [requested, setTab] = useUrlState('tab','status');
  const tabs: [string, string][] = [['status', 'Dịch vụ'], ['incidents', 'Sự cố'], ['ocr', 'Đọc hóa đơn'],...(isAdminRole(me.role)?[['providers','Chất lượng thông báo'],['errors','Sự kiện lỗi']] as [string,string][]:[])];
  const tab=tabs.some(([key])=>key===requested)?requested:'status';
  return <>
    <PageHeader title="Giám sát hệ thống" description="Hệ thống kiểm tra các dịch vụ mỗi phút và gom lỗi giống nhau thành một sự cố."/>
    <div className="fm-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'status' ? <ServiceStatusPanel/> : tab === 'incidents' ? <IncidentsTab me={me}/> : tab==='providers'?<ProviderDiagnostics/>:tab==='errors'?<ErrorDiagnostics/>:<OcrTab/>}
  </>;
}
