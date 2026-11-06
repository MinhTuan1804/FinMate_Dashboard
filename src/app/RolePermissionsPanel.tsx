import { useCallback, useEffect, useState } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmReasonDialog, LoadingRows, PageError } from './Shared';

type RoleRow = { role: string; editable: boolean; capabilities: string[] };
type Matrix = { catalog: string[]; adminOnly: string[]; roles: RoleRow[] };

const LABEL: Record<string, string> = {
  HandleTickets: 'Xử lý ticket, nói chuyện với khách',
  AccessCustomerData: 'Xin xem dữ liệu khách (khách phải đồng ý từng ca)',
  CreateDraftTransactions: 'Tạo giao dịch nháp cho khách',
  EmergencyLock: 'Khóa khẩn cấp tài khoản khách',
  ProposeApprovals: 'Đề xuất việc nhạy cảm cần duyệt',
  ManageTickets: 'Điều phối ticket (phân công, ưu tiên, gom ca)',
  DecideApprovals: 'Duyệt hoặc từ chối đề xuất',
  ViewDashboard: 'Xem dashboard vận hành',
  ManageCannedReplies: 'Quản lý câu trả lời mẫu',
  ViewOpsAudit: 'Xem audit vận hành',
  ViewAiStats: 'Xem thống kê AI',
  ViewMonitoring: 'Xem giám sát dịch vụ và sự cố',
  ManageIncidents: 'Nhận xử lý và đóng sự cố',
  ManageSystem: 'Quản trị hệ thống (/admin/*, chi tiết kỹ thuật sự cố)',
};
/** Khớp RolePermissionRules ở backend: quyền bên trái cần có quyền bên phải. */
const REQUIRES: Record<string, string> = { AccessCustomerData: 'HandleTickets', CreateDraftTransactions: 'AccessCustomerData' };
const ORDER = ['User', 'Staff', 'OpsManager', 'Admin'];

const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every(c => a.has(c));

/** Ma trận quyền sửa được: Admin tick/bỏ tick quyền của Staff và OpsManager rồi bấm một nút Lưu, kèm một lý do chung. Admin và User chỉ đọc. */
export function RolePermissionsPanel() {
  const [data, setData] = useState<Matrix | null>(null), [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const next = await getData<Matrix>('/admin/role-permissions');
      setData(next); setDraft(Object.fromEntries(next.roles.map(r => [r.role, new Set(r.capabilities)]))); setError('');
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  if (!data) return <div className="fm-card"><h2>Ma trận quyền</h2><PageError message={error} retry={() => void load()}/>{!error && <LoadingRows/>}</div>;

  const roles = ORDER.map(name => data.roles.find(r => r.role === name)).filter((r): r is RoleRow => Boolean(r));
  const dirty = (r: RoleRow) => !sameSet(draft[r.role] ?? new Set(), r.capabilities);

  function toggle(role: string, capability: string, on: boolean) {
    setSuccess('');
    setDraft(current => {
      const next = new Set(current[role]);
      if (on) { next.add(capability); const need = REQUIRES[capability]; if (need) next.add(need); }
      else next.delete(capability);
      // Quyền phụ thuộc mất quyền nền thì bỏ theo, theo chuỗi: CreateDraftTransactions → AccessCustomerData → HandleTickets.
      for (let i = 0; i < 2; i++) for (const [dependent, need] of Object.entries(REQUIRES)) if (!next.has(need)) next.delete(dependent);
      return { ...current, [role]: next };
    });
  }
  const changed = roles.filter(r => r.editable && dirty(r));
  // Backend lưu theo từng vai trò (PUT /role-permissions/{role}), nên gọi lần lượt; dừng ở vai trò lỗi đầu tiên.
  async function save(reason: string) {
    setBusy(true);
    const done: string[] = [];
    try {
      for (const r of changed) {
        await api.put(`/admin/role-permissions/${r.role}`, { capabilities: [...(draft[r.role] ?? [])], reason });
        done.push(r.role);
      }
      setSuccess(`Đã lưu quyền của ${done.join(', ')}. Có hiệu lực ngay, người đang đăng nhập thấy menu mới sau khi tải lại.`); setConfirming(false); await load();
    } catch (e) {
      const msg = errorText(e);
      setConfirming(false); await load(); // đồng bộ lại để vai trò đã lưu thành công không còn "chưa lưu"
      setError(done.length ? `Đã lưu ${done.join(', ')} nhưng dừng ở vai trò tiếp theo: ${msg}` : msg);
    } finally { setBusy(false); }
  }
  const diff = (r: RoleRow) => {
    const now = draft[r.role] ?? new Set<string>();
    return { added: [...now].filter(c => !r.capabilities.includes(c)), removed: r.capabilities.filter(c => !now.has(c)) };
  };
  const summary = changed.map(r => {
    const d = diff(r);
    return `${r.role} — thêm: ${d.added.map(c => LABEL[c] ?? c).join('; ') || 'không'}; thu hồi: ${d.removed.map(c => LABEL[c] ?? c).join('; ') || 'không'}.`;
  }).join(' ');

  return <div className="fm-card">
    <h2>Ma trận quyền</h2>
    <PageError message={error} retry={() => void load()}/>
    {success && <div className="fm-success">{success}</div>}
    <p className="fm-hint">Tick để thêm quyền, bỏ tick để thu hồi. Chỉ Staff và OpsManager sửa được; Admin luôn đủ quyền. Một số quyền kéo theo quyền khác nên tự tick/bỏ tick theo.</p>
    <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Khả năng</th>{roles.map(r => <th key={r.role}>{r.role}</th>)}</tr></thead><tbody>
      {data.catalog.map(capability => <tr key={capability}>
        <td title={capability}>{LABEL[capability] ?? capability}</td>
        {roles.map(r => {
          const locked = !r.editable || data.adminOnly.includes(capability);
          const checked = (draft[r.role] ?? new Set()).has(capability);
          return <td key={r.role}>{locked
            ? (r.capabilities.includes(capability) ? 'Có' : '—')
            : <input type="checkbox" aria-label={`${r.role}: ${LABEL[capability] ?? capability}`} checked={checked} onChange={e => toggle(r.role, capability, e.target.checked)}/>}</td>;
        })}
      </tr>)}
    </tbody></table></div>
    <div className="fm-toolbar">
      <button className="btn btn--primary" disabled={!changed.length || busy} onClick={() => setConfirming(true)}>Lưu quyền</button>{' '}
      <button className="btn" disabled={!changed.length || busy} onClick={() => setDraft(d => ({ ...d, ...Object.fromEntries(changed.map(r => [r.role, new Set(r.capabilities)])) }))}>Hoàn tác</button>
    </div>
    <small>Staff và OpsManager chỉ gọi được /api/v1/ops/*. Tài khoản nội bộ phải xác thực OTP email khi backend bật OPS_REQUIRE_2FA.</small>
    {confirming && changed.length > 0 && <ConfirmReasonDialog error={error} title={`Lưu quyền của ${changed.map(r => r.role).join(', ')}`} busy={busy} onCancel={() => setConfirming(false)} onConfirm={save}
      description={summary}/>}
  </div>;
}
