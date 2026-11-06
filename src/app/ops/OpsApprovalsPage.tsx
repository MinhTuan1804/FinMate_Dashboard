import { useState, type FormEvent } from 'react';
import { errorText, type OpsMe } from '../../shared/api';
import { ConfirmDialog, ConfirmReasonDialog, EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { OffsetPager, SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { APPROVAL_STATUS_LABEL, APPROVAL_TYPES, APPROVAL_TYPE_LABEL, errorCode, fmtDateTime, httpStatus, post, type Approval, type ApprovalType } from './opsApi';

const TONE: Record<string, string> = { Pending: 'warn', Approved: 'good', Rejected: '', Failed: 'bad' };
const TARGET_HINT: Record<ApprovalType, string> = { UnlockUser: 'ID tài khoản khách đang bị khóa', CancelDeletion: 'ID tài khoản có yêu cầu xóa đang chờ', TransferGroupOwner: 'ID nhóm' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đề xuất việc nhạy cảm (cần hai người: người đề xuất khác người duyệt). Staff chỉ thấy đề xuất của mình; OpsManager trở lên thấy và duyệt tất cả. */
export function OpsApprovalsPage({ me }: { me: OpsMe }) {
  const [status, setStatus] = useState('Pending'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const list = useServerList<Approval>('/ops/approvals', { params: { status: status || undefined } });
  const [form, setForm] = useState({ type: 'UnlockUser' as ApprovalType, targetId: '', newOwnerUserId: '', ticketId: '', reason: '' });
  const [decision, setDecision] = useState<{ item: Approval; kind: 'approve' | 'reject' } | null>(null);
  const canDecide = me.capabilities.includes('DecideApprovals'), canPropose = me.capabilities.includes('ProposeApprovals');

  async function propose(event: FormEvent) {
    event.preventDefault();
    const ids = [form.targetId, form.type === 'TransferGroupOwner' ? form.newOwnerUserId : '', form.ticketId].filter(Boolean);
    if (!ids.every(v => UUID.test(v.trim()))) { setError('Các ID phải là mã UUID hợp lệ.'); return; }
    setBusy(true);
    try {
      await post('/ops/approvals', { type: form.type, targetId: form.targetId.trim(), newOwnerUserId: form.type === 'TransferGroupOwner' ? form.newOwnerUserId.trim() : undefined, ticketId: form.ticketId.trim() || undefined, reason: form.reason.trim() });
      setForm({ ...form, targetId: '', newOwnerUserId: '', ticketId: '', reason: '' }); setError(''); list.reload();
    } catch (e) { setError(httpStatus(e) === 409 ? 'Đối tượng này đã có đề xuất đang chờ.' : errorText(e)); }
    finally { setBusy(false); }
  }
  async function decide(note: string) {
    if (!decision) return;
    setBusy(true);
    try { await post(`/ops/approvals/${decision.item.id}/${decision.kind}`, note ? { note } : undefined); setDecision(null); setError(''); list.reload(); }
    catch (e) {
      setDecision(null);
      setError(httpStatus(e) === 409 ? 'Người khác đã xử lý đề xuất này trước bạn.' : errorCode(e) === 'OPS_APPROVAL_FAILED' ? `Đã duyệt nhưng không thực hiện được: ${errorText(e)}` : errorText(e));
      list.reload();
    } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Đề xuất & duyệt" description="Việc nhạy cảm cần hai người: một người đề xuất, người khác duyệt. Đề xuất hết hạn sau 7 ngày."/>
    <PageError message={error || list.error} retry={list.reload}/>
    {canPropose && <details className="fm-card fm-disclosure"><summary>Tạo đề xuất mới</summary><form className="fm-card fm-form fm-form--stack" onSubmit={propose}>
      <h2>Tạo đề xuất</h2>
      <label>Loại việc<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ApprovalType })}>{APPROVAL_TYPES.map(t => <option key={t} value={t}>{APPROVAL_TYPE_LABEL[t]}</option>)}</select></label>
      <label>{TARGET_HINT[form.type]}<input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })} required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/></label>
      {form.type === 'TransferGroupOwner' && <label>ID chủ nhóm mới (thành viên đang hoạt động)<input value={form.newOwnerUserId} onChange={e => setForm({ ...form, newOwnerUserId: e.target.value })} required/></label>}
      <label>ID ca liên quan (nếu có)<input value={form.ticketId} onChange={e => setForm({ ...form, ticketId: e.target.value })}/></label>
      <label>Lý do<textarea rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required minLength={3} maxLength={1000}/></label>
      <div><button className="btn btn--primary" disabled={busy || form.reason.trim().length < 3}>Gửi đề xuất</button></div>
    </form></details>}
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar">
        <SearchField value={list.search} onChange={list.setSearch} placeholder="Lý do đề xuất"/>
        <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(APPROVAL_STATUS_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
      </div>
      {list.loading && list.rows.length === 0 ? <LoadingRows/> : list.rows.length === 0 ? <EmptyState message="Không có đề xuất nào khớp"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Loại</th><th>Đối tượng</th><th>Lý do</th><th>Người đề xuất</th><th>Trạng thái</th><th>Hết hạn</th><th></th></tr></thead><tbody>
          {list.rows.map(a => { const own = a.requestedByUserId === me.id; return <tr key={a.id}>
            <td>{APPROVAL_TYPE_LABEL[a.type] ?? a.type}</td><td title={a.targetId}>{a.targetId.slice(0, 8)}…</td><td title={a.reason}>{a.reason}</td><td>{own ? 'Bạn' : a.requestedByUserId?.slice(0, 8) ?? '—'}</td>
            <td><span className={`fm-badge ${TONE[a.status] ?? ''}`}>{APPROVAL_STATUS_LABEL[a.status] ?? a.status}</span>{a.failureCode && <small title={a.failureCode}> {a.failureCode}</small>}{a.decisionNote && <small title={a.decisionNote}> · {a.decisionNote}</small>}</td>
            <td>{a.expired ? 'Đã hết hạn' : fmtDateTime(a.expiresAt)}</td>
            <td className="fm-actions">{canDecide && a.status === 'Pending' && !a.expired && <><button className="btn btn--small btn--primary" disabled={busy || own} title={own ? 'Không tự duyệt đề xuất của mình' : undefined} onClick={() => setDecision({ item: a, kind: 'approve' })}>Duyệt</button> <button className="btn btn--small" disabled={busy || own} onClick={() => setDecision({ item: a, kind: 'reject' })}>Từ chối</button></>}</td>
          </tr>; })}
        </tbody></table></div>}
      <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/>
    </div>
    {decision?.kind === 'approve' && <ConfirmDialog error={error} title="Duyệt đề xuất" description={`${APPROVAL_TYPE_LABEL[decision.item.type] ?? decision.item.type} sẽ được thực hiện ngay và không hoàn tác được. Hệ thống kiểm tra lại đối tượng lúc duyệt.`} busy={busy} onCancel={() => setDecision(null)} onConfirm={() => decide('')}/>}
    {decision?.kind === 'reject' && <ConfirmReasonDialog error={error} title="Từ chối đề xuất" description="Ghi lý do để người đề xuất biết." busy={busy} onCancel={() => setDecision(null)} onConfirm={decide}/>}
  </>;
}
