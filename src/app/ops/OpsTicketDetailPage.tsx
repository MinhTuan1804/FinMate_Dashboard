import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorText, fetchBlob, getAllPages, type OpsMe } from '../../shared/api';
import { ConfirmReasonDialog, LoadingRows, PageError, PageHeader } from '../Shared';
import { SETTABLE_STATUSES, STATUS_LABEL, dueText, fmtDateTime, httpStatus, patch, post, ticket, type Attachment, type CannedReply, type Message, type TicketDetail } from './opsApi';
import { CategoryText, PriorityBadge, StatusBadge } from './OpsParts';
import { CustomerDataPanel } from './CustomerDataPanel';
import { TicketManagePanel } from './TicketManagePanel';

const KIND_LABEL: Record<string, string> = { Customer: 'Khách', Staff: 'Nhân viên', InternalNote: 'Ghi chú nội bộ' };

function AttachmentImage({ ticketId, attachment }: { ticketId: string; attachment: Attachment }) {
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function open() {
    setLoading(true);
    try { setUrl(URL.createObjectURL(await fetchBlob(`/ops/tickets/${ticketId}/attachments/${attachment.id}`))); setError(''); }
    catch (e) { setError(httpStatus(e) === 403 ? 'Cần nhận ca trước khi xem ảnh.' : errorText(e)); }
    finally { setLoading(false); }
  }
  if (url) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh đính kèm" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 6 }}/></a>;
  return <span><button className="btn btn--small" disabled={loading} onClick={() => void open()}>{loading ? 'Đang tải...' : `Xem ảnh (${Math.ceil(attachment.sizeBytes / 1024)} KB)`}</button>{error && <small className="fm-error-text"> {error}</small>}</span>;
}

function MessageRow({ ticketId, message }: { ticketId: string; message: Message }) {
  return <div className={`fm-msg fm-msg--${message.kind}`}>
    <div className="fm-msg-head"><strong>{message.authorName ?? KIND_LABEL[message.kind] ?? message.kind}</strong><span className="fm-badge">{KIND_LABEL[message.kind] ?? message.kind}</span><small>{fmtDateTime(message.createdAt)}</small></div>
    <p>{message.body}</p>
    {message.attachments.map(a => <AttachmentImage key={a.id} ticketId={ticketId} attachment={a}/>)}
  </div>;
}

/** Chi tiết ca: thread, trả lời, đổi trạng thái, chuyển cấp, khóa khẩn cấp, dữ liệu khách theo ca và (nếu có quyền) điều phối. */
export function OpsTicketDetailPage({ me }: { me: OpsMe }) {
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<TicketDetail | null>(null), [error, setError] = useState(''), [forbidden, setForbidden] = useState(false), [busy, setBusy] = useState(false);
  const [body, setBody] = useState(''), [internal, setInternal] = useState(false), [canned, setCanned] = useState<CannedReply[]>([]);
  const [panel,setPanel]=useState<'thread'|'customer'>('thread');
  const [dialog, setDialog] = useState<'escalate' | 'lock' | null>(null), [status, setStatus] = useState('');
  const load = useCallback(async () => {
    try { setDetail(await ticket(id)); setError(''); setForbidden(false); }
    catch (e) { if (httpStatus(e) === 403) setForbidden(true); else setError(errorText(e)); }
  }, [id]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => { getAllPages<CannedReply>('/ops/canned-replies').then(setCanned).catch(() => setCanned([])); }, []);

  const can = (c: string) => me.capabilities.includes(c);
  async function act(run: () => Promise<TicketDetail | void>, after?: () => void) {
    setBusy(true);
    try { const next = await run(); if (next) setDetail(next); setError(''); after?.(); }
    catch (e) { const message=httpStatus(e) === 409 ? 'Ca đã được người khác nhận hoặc đổi trạng thái. Đã tải lại.' : errorText(e); await load();setError(message); }
    finally { setBusy(false); }
  }
  const claim = () => act(() => post<TicketDetail>(`/ops/tickets/${id}/claim`));
  const reply = (event: FormEvent) => { event.preventDefault(); if (body.trim()) void act(() => post<TicketDetail>(`/ops/tickets/${id}/messages`, { body: body.trim(), internal }), () => setBody('')); };
  const setTicketStatus = () => status && act(() => patch<TicketDetail>(`/ops/tickets/${id}/status`, { status }), () => setStatus(''));

  if (forbidden) return <><PageHeader title="Chi tiết ca" description=""/><div className="fm-card"><p>Bạn không xem được ca này: ca đã có người khác nhận, hoặc ca do chính bạn tạo.</p><Link to="/ops/tickets">← Về hàng đợi</Link></div></>;
  if (!detail) return <><PageHeader title="Chi tiết ca" description=""/><PageError message={error} retry={() => void load()}/><LoadingRows/></>;

  const t = detail.ticket, closed = t.status === 'Closed';
  const mine = t.assigneeUserId === me.id, manager = can('ManageTickets');
  const canWork = (mine || manager) && !closed;
  return <>
    <PageHeader title={t.subject} description={`Ca ${t.id}`} action={<Link className="btn" to="/ops/tickets">← Hàng đợi</Link>}/>
    <PageError message={error} retry={() => void load()}/>
    <div className="fm-detail-summary"><StatusBadge value={t.status}/><PriorityBadge value={t.priority}/><span className="fm-badge">{t.assigneeName||'Chưa phân công'}</span><span className={t.resolutionOverdue?'fm-badge bad':'fm-badge'}>{dueText(t.resolveDueAt,t.resolutionOverdue,Boolean(t.resolvedAt||t.closedAt))}</span></div><div className="fm-grid ticket-workspace">
      <div><div className="fm-tabs"><button className={panel==='thread'?'active':''} onClick={()=>setPanel('thread')}>Trao đổi ({detail.messages.length})</button>{can('AccessCustomerData')&&<button className={panel==='customer'?'active':''} onClick={()=>setPanel('customer')}>Dữ liệu khách theo ca</button>}</div>
        {panel==='thread'&&<div className="fm-card">
          <h2>Trao đổi</h2>
          <div className="fm-thread">{detail.messages.map(m => <MessageRow key={m.id} ticketId={t.id} message={m}/>)}</div>
          {canWork ? <form className="fm-form fm-form--stack" onSubmit={reply}>
            <h3>Trả lời</h3>
            {canned.filter(c => c.isActive).length > 0 && <label>Câu trả lời mẫu<select value="" onChange={e => { const c = canned.find(x => x.id === e.target.value); if (c) setBody(b => (b ? `${b}\n` : '') + c.body); }}><option value="">Chèn câu mẫu...</option>{canned.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
            <label>Nội dung<textarea rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={4000}/></label>
            <div className="fm-tabs composer-tabs"><button type="button" className={!internal?'active':''} onClick={()=>setInternal(false)}>Trả lời khách</button><button type="button" className={internal?'active internal':''} onClick={()=>setInternal(true)}>Ghi chú nội bộ</button></div><small>{internal?'Chỉ đội vận hành đọc được ghi chú này.':'Nội dung sẽ được gửi trực tiếp cho khách.'}</small>
            <div><button className="btn btn--primary" disabled={busy || !body.trim()}>{internal ? 'Lưu ghi chú' : 'Gửi cho khách'}</button></div>
          </form> : !closed && <p><button className="btn btn--primary" disabled={busy || Boolean(t.assigneeUserId)} onClick={() => void claim()}>Nhận ca để trả lời</button>{t.assigneeUserId && <small> Ca đang do {t.assigneeName ?? 'người khác'} phụ trách.</small>}</p>}
        </div>}
        {panel==='customer'&&<CustomerDataPanel me={me} ticket={t} canAct={mine && !closed}/>}
      </div>
      <div className="ticket-context">
        <div className="fm-card">
          <h2>Thông tin ca</h2>
          <dl className="fm-kv">
            <dt>Khách</dt><dd>{t.requesterName ?? '—'}</dd>
            <dt>Loại</dt><dd><CategoryText value={t.category}/></dd>
            <dt>Ưu tiên</dt><dd><PriorityBadge value={t.priority}/></dd>
            <dt>Trạng thái</dt><dd><StatusBadge value={t.status}/></dd>
            <dt>Phụ trách</dt><dd>{t.assigneeName ?? 'Chưa ai nhận'}</dd>
            <dt>Phản hồi đầu</dt><dd>{t.firstRespondedAt ? fmtDateTime(t.firstRespondedAt) : dueText(t.firstResponseDueAt, t.firstResponseOverdue, false)}</dd>
            <dt>Hạn giải quyết</dt><dd>{fmtDateTime(t.resolveDueAt)} ({dueText(t.resolveDueAt, t.resolutionOverdue, Boolean(t.resolvedAt || t.closedAt))})</dd>
            <dt>Đánh giá</dt><dd>{t.rating ?? '—'}</dd>
            <dt>Tạo lúc</dt><dd>{fmtDateTime(t.createdAt)}</dd>
            {t.parentTicketId && <><dt>Ca cha</dt><dd><Link to={`/ops/tickets/${t.parentTicketId}`}>Mở ca cha</Link></dd></>}
          </dl>
          {!t.assigneeUserId && !closed && <button className="btn btn--primary" disabled={busy} onClick={() => void claim()}>Nhận ca</button>}
          {canWork && <div className="fm-form fm-form--stack">
            <label>Đổi trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Chọn...</option>{SETTABLE_STATUSES.filter(s => s !== t.status).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
            <div><button className="btn" disabled={busy || !status} onClick={() => void setTicketStatus()}>Cập nhật</button></div>
            <div><button className="btn" disabled={busy} onClick={() => setDialog('escalate')}>Chuyển cấp</button></div>
            {can('EmergencyLock') && <div><button className="btn" disabled={busy} onClick={() => setDialog('lock')}>Khóa khẩn cấp khách</button></div>}
          </div>}
        </div>
        {manager && <details className="fm-card fm-disclosure"><summary>Điều phối & thao tác nâng cao</summary><TicketManagePanel ticket={t} busy={busy} act={act} reload={load}/></details>}
      </div>
    </div>
    {dialog === 'escalate' && <ConfirmReasonDialog error={error} title="Chuyển cấp ca" description="Ghi rõ bạn đã thử gì. Ca sang trạng thái Chuyển cấp và chỉ Manager trở lên đổi được." busy={busy} onCancel={() => setDialog(null)} onConfirm={async note => { await act(() => post<TicketDetail>(`/ops/tickets/${id}/escalate`, { note }), () => setDialog(null)); }}/>}
    {dialog === 'lock' && <ConfirmReasonDialog error={error} title="Khóa khẩn cấp tài khoản khách" description="Khóa ngay tài khoản của khách đã tạo ca này và chuyển ca sang Chuyển cấp để Manager rà soát. Không khóa được tài khoản nội bộ." busy={busy} onCancel={() => setDialog(null)} onConfirm={async reason => { await act(async () => { await post(`/ops/users/${t.requesterUserId}/emergency-lock`, { ticketId: id, reason }); await load(); }, () => setDialog(null)); }}/>}
  </>;
}
