import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { errorText, type OpsMe } from '../../shared/api';
import { SCOPES, SCOPE_LABEL, fmtDateTime, fmtVnd, httpStatus, list, post, type AccessRequest, type CustomerAccount, type CustomerBudget, type CustomerTransactionPage, type Scope, type Ticket } from './opsApi';

const ACCESS_STATUS: Record<string, [string, string]> = { Pending: ['Chờ khách đồng ý', 'warn'], Approved: ['Đã đồng ý', 'good'], Denied: ['Khách từ chối', 'bad'], Revoked: ['Đã thu hồi', ''] };

/** Phạm vi đang có hiệu lực: yêu cầu đã đồng ý, chưa thu hồi, chưa hết hạn. Backend vẫn kiểm lại mỗi lần đọc. */
function grantedScopes(requests: AccessRequest[], now: number): Set<string> {
  return new Set(requests.filter(r => r.status === 'Approved' && !r.revokedAt && r.expiresAt && new Date(r.expiresAt).getTime() > now).flatMap(r => r.scopes));
}
const newRequestId = () => crypto.randomUUID();

/**
 * Dữ liệu tài chính của khách trong một ca. Khách phải đồng ý từng phạm vi (tối đa 24 giờ) và chỉ người đang phụ trách ca xem được, kể cả Admin.
 * Mỗi lần đọc đều bị ghi audit nên không tự tải: chỉ tải khi người dùng bấm.
 */
export function CustomerDataPanel({ me, ticket, canAct }: { me: OpsMe; ticket: Ticket; canAct: boolean }) {
  const base = `/ops/tickets/${ticket.id}`;
  const [requests, setRequests] = useState<AccessRequest[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [scopes, setScopes] = useState<Scope[]>([]), [reason, setReason] = useState('');
  const [accounts, setAccounts] = useState<CustomerAccount[] | null>(null), [budgets, setBudgets] = useState<CustomerBudget[] | null>(null), [txs, setTxs] = useState<CustomerTransactionPage | null>(null);
  const [draft, setDraft] = useState({ amount: '', type: 'Debit', at: '', merchant: '', description: '' }), [draftId, setDraftId] = useState(newRequestId), [draftDone, setDraftDone] = useState('');

  const [now, setNow] = useState(0);   // mốc so hạn quyền; cập nhật mỗi lần tải để render không gọi Date.now()
  const loadRequests = useCallback(async () => {
    if (!canAct) { setRequests([]); return; }   // backend chỉ cho người đang phụ trách ca đọc yêu cầu (Manager/Admin cũng phải nhận ca trước)
    try { setRequests(await list<AccessRequest[]>(`${base}/access-requests`)); setNow(Date.now()); } catch (e) { setError(errorText(e)); }
  }, [base, canAct]);
  useEffect(() => { queueMicrotask(() => void loadRequests()); }, [loadRequests]);

  if (!me.capabilities.includes('AccessCustomerData')) return null;
  const granted = grantedScopes(requests, now);
  const pending = requests.some(r => r.status === 'Pending' && new Date(r.requestExpiresAt).getTime() > now);

  async function run(job: () => Promise<void>) {
    setBusy(true); setError('');
    try { await job(); }
    catch (e) { setError(httpStatus(e) === 403 ? 'Không đọc được: quyền đã hết hạn, bị thu hồi, hoặc bạn không còn là người phụ trách ca.' : httpStatus(e) === 409 ? 'Đã có một yêu cầu đang chờ khách trả lời.' : errorText(e)); await loadRequests(); }
    finally { setBusy(false); }
  }
  const toggle = (s: Scope) => setScopes(cur => (cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]));
  const requestAccess = (event: FormEvent) => { event.preventDefault(); void run(async () => { await post(`${base}/access-requests`, { scopes, reason: reason.trim() }); setScopes([]); setReason(''); await loadRequests(); }); };
  const loadTransactions = (cursor?: string) => run(async () => {
    const page = await list<CustomerTransactionPage>(`${base}/customer-data/transactions`, { cursor, limit: 30 });
    setTxs(cursor && txs ? { items: [...txs.items, ...page.items], nextCursor: page.nextCursor } : page);
  });
  const createDraft = (event: FormEvent) => {
    event.preventDefault();
    const amountCents = Math.round(Number(draft.amount));
    if (!Number.isFinite(amountCents) || amountCents <= 0) { setError('Số tiền phải là số đồng lớn hơn 0.'); return; }
    void run(async () => {
      await post(`${base}/draft-transactions`, { amountCents, transactionType: draft.type, transactedAt: draft.at ? new Date(draft.at).toISOString() : new Date().toISOString(), merchantName: draft.merchant.trim() || undefined, description: draft.description.trim() || undefined, clientRequestId: draftId });
      setDraft({ amount: '', type: 'Debit', at: '', merchant: '', description: '' }); setDraftId(newRequestId()); setDraftDone('Đã tạo giao dịch nháp. Khách phải xác nhận thì số dư mới đổi.');
    });
  };

  return <div className="fm-card">
    <h2>Dữ liệu khách theo ca</h2>
    <p className="fm-hint">Khách phải đồng ý từng phạm vi, hiệu lực tối đa 24 giờ và chấm dứt khi đổi người phụ trách. Mỗi lần đọc đều được ghi lại.</p>
    {error && <div className="error-box" role="alert">{error}</div>}
    {requests.length > 0 && <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Phạm vi</th><th>Trạng thái</th><th>Lý do</th><th>Hiệu lực đến</th></tr></thead><tbody>
      {requests.map(r => { const [label, tone] = ACCESS_STATUS[r.status] ?? [r.status, '']; return <tr key={r.id}><td>{r.scopes.map(s => SCOPE_LABEL[s] ?? s).join(', ')}</td><td><span className={`fm-badge ${tone}`}>{label}</span></td><td title={r.reason}>{r.reason}</td><td>{r.status === 'Pending' ? `Chờ đến ${fmtDateTime(r.requestExpiresAt)}` : fmtDateTime(r.expiresAt)}</td></tr>; })}
    </tbody></table></div>}

    {canAct ? <form className="fm-form fm-form--stack" onSubmit={requestAccess}>
      <h3>Xin quyền xem dữ liệu</h3>
      <div className="fm-inline">{SCOPES.map(s => <label key={s} className="fm-inline"><input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)}/> {SCOPE_LABEL[s]}</label>)}</div>
      <label>Lý do (khách đọc được)<textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} maxLength={500}/></label>
      <div><button className="btn btn--primary" disabled={busy || pending || scopes.length === 0 || reason.trim().length < 3}>{pending ? 'Đang chờ khách trả lời' : 'Gửi yêu cầu'}</button></div>
    </form> : <p className="fm-hint">Nhận ca (và còn mở) để xin xem dữ liệu của khách.</p>}

    {canAct && granted.size > 0 && <>
      <h3>Dữ liệu đã được cấp</h3>
      <div className="fm-toolbar">
        {granted.has('Accounts') && <button className="btn" disabled={busy} onClick={() => void run(async () => setAccounts(await list<CustomerAccount[]>(`${base}/customer-data/accounts`)))}>Xem ví</button>}
        {granted.has('Transactions') && <button className="btn" disabled={busy} onClick={() => void loadTransactions()}>Xem giao dịch</button>}
        {granted.has('Budgets') && <button className="btn" disabled={busy} onClick={() => void run(async () => setBudgets(await list<CustomerBudget[]>(`${base}/customer-data/budgets`)))}>Xem ngân sách</button>}
      </div>
      {accounts && <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Ví</th><th>Loại</th><th>Số dư</th><th>Theo dõi</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id}><td>{a.accountName}</td><td>{a.accountType}</td><td>{fmtVnd(a.balanceCents)}</td><td>{a.isMonitored ? 'Có' : 'Không'}</td></tr>)}</tbody></table></div>}
      {budgets && <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Danh mục</th><th>Kỳ</th><th>Hạn mức</th><th>Đã chi</th></tr></thead><tbody>{budgets.map(b => <tr key={b.id}><td>{b.categoryName ?? 'Tổng'}</td><td>{b.periodType}</td><td>{fmtVnd(b.limitCents)}</td><td>{fmtVnd(b.spentCents)}</td></tr>)}</tbody></table></div>}
      {txs && <><div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Số tiền</th><th>Danh mục</th><th>Nơi chi / mô tả</th><th>Nguồn</th><th>Trạng thái</th></tr></thead><tbody>{txs.items.map(t => <tr key={t.id}><td>{fmtDateTime(t.transactedAt)}</td><td>{t.transactionType}</td><td>{fmtVnd(t.amountCents)}</td><td>{t.categoryName ?? '—'}</td><td title={t.description ?? ''}>{t.merchantName ?? t.description ?? '—'}</td><td>{t.source}</td><td>{t.status}</td></tr>)}</tbody></table></div>
        {txs.nextCursor && <button className="btn btn--small" disabled={busy} onClick={() => void loadTransactions(txs.nextCursor!)}>Tải thêm</button>}</>}

      {granted.has('Draft') && me.capabilities.includes('CreateDraftTransactions') && <form className="fm-form fm-form--stack" onSubmit={createDraft}>
        <h3>Tạo giao dịch nháp</h3>
        {draftDone && <p className="fm-success">{draftDone}</p>}
        <label>Số tiền (đồng)<input type="number" min={1} step={1} value={draft.amount} onChange={e => { setDraft({ ...draft, amount: e.target.value }); setDraftDone(''); }} required/></label>
        <label>Loại<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}><option value="Debit">Chi</option><option value="Credit">Thu</option></select></label>
        <label>Thời điểm<input type="datetime-local" value={draft.at} onChange={e => setDraft({ ...draft, at: e.target.value })}/></label>
        <label>Nơi chi / người nhận<input value={draft.merchant} onChange={e => setDraft({ ...draft, merchant: e.target.value })} maxLength={200}/></label>
        <label>Mô tả<input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} maxLength={500}/></label>
        <div><button className="btn btn--primary" disabled={busy}>Tạo nháp</button></div>
      </form>}
    </>}
  </div>;
}
