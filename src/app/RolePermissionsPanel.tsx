import { displayValue } from '../shared/labels';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { CAPABILITY_LABEL } from '../shared/permissions';
import { queryClient } from '../shared/queryClient';
import { api, errorText, getData } from '../shared/api';
import { ConfirmReasonDialog, LoadingRows, PageError } from './Shared';

type RoleRow = { role: string; editable: boolean; capabilities: string[] };
type Matrix = { catalog: string[]; adminOnly: string[]; roles: RoleRow[] };

const LABEL = CAPABILITY_LABEL;
/** Khớp RolePermissionRules ở backend: quyền bên trái cần có quyền bên phải. */
const REQUIRES: Record<string, string> = { AccessCustomerData: 'HandleTickets', CreateDraftTransactions: 'AccessCustomerData', ApproveAgentContent: 'ManageAgentContent' };
const ORDER = ['User', 'Staff', 'OpsManager', 'Admin'];

const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every(c => a.has(c));

/** Nhóm hiển thị trong ma trận. Quyền chưa nằm ở đây (quyền mới thêm vào code) tự rơi vào nhóm "Khác", nên không bao giờ bị ẩn. */
const GROUPS: [string, string[]][] = [
  ['Hỗ trợ khách hàng', ['HandleTickets', 'AccessCustomerData', 'CreateDraftTransactions', 'EmergencyLock', 'ManageTickets', 'ManageCannedReplies']],
  ['Đề xuất & phê duyệt', ['ProposeApprovals', 'DecideApprovals']],
  ['Giám sát & thống kê', ['ViewDashboard', 'ViewOpsAudit', 'ViewAiStats', 'ViewMonitoring', 'ManageIncidents']],
  ['Cộng đồng', ['ModerateCommunity', 'MuteCommunityAuthors']],
  ['Kho tri thức & giả định', ['ManageAgentContent', 'ApproveAgentContent']],
  ['Gói đăng ký & pháp lý', ['ManageSubscriptionPlans', 'ManageLegalDocuments']],
  ['Quản trị hệ thống', ['ManageSystem']],
];

/** Bật/tắt một quyền kèm quyền phụ thuộc: bật thì bật luôn quyền nền; tắt quyền nền thì tắt theo các quyền cần nó. */
function applyToggle(current: Set<string>, capability: string, on: boolean) {
  const next = new Set(current);
  if (on) { next.add(capability); const need = REQUIRES[capability]; if (need) next.add(need); }
  else next.delete(capability);
  for (let i = 0; i < 3; i++) for (const [dependent, need] of Object.entries(REQUIRES)) if (!next.has(need)) next.delete(dependent);
  return next;
}

/** Ma trận quyền sửa được: Admin tick/bỏ tick quyền của Staff và OpsManager rồi bấm một nút Lưu, kèm một lý do chung. Admin và User chỉ đọc. */
export function RolePermissionsPanel() {
  const [data, setData] = useState<Matrix | null>(null), [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [open, setOpen] = useState<Set<string>>(new Set());
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

  function toggle(role: string, capability: string, on: boolean) { setMany(role, [capability], on); }
  // Quyền phụ thuộc đi theo chuỗi: CreateDraftTransactions → AccessCustomerData → HandleTickets.
  function setMany(role: string, capabilities: string[], on: boolean) {
    setSuccess('');
    setDraft(current => ({ ...current, [role]: capabilities.reduce((set, c) => applyToggle(set, c, on), new Set(current[role])) }));
  }
  const grantable = (r: RoleRow, capabilities: string[]) => capabilities.filter(c => r.editable && !data!.adminOnly.includes(c));
  const known = new Set(GROUPS.flatMap(([, list]) => list));
  const groups = [
    ...GROUPS.map(([name, list]) => [name, data.catalog.filter(c => list.includes(c))] as [string, string[]]),
    ['Khác', data.catalog.filter(c => !known.has(c))] as [string, string[]],
  ].filter(([, list]) => list.length > 0);
  const changed = roles.filter(r => r.editable && dirty(r));
  // Backend lưu theo từng vai trò (PUT /role-permissions/{role}), nên gọi lần lượt; dừng ở vai trò lỗi đầu tiên.
  async function save(reason: string) {
    setBusy(true);
    const done: string[] = [];
    try {
      for (const r of changed) {
        await api.put(`/admin/role-permissions/${r.role}`, { capabilities: [...(draft[r.role] ?? [])], reason });
        done.push(r.role);
        void queryClient.invalidateQueries({queryKey:['/ops/me']});
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
    return `${displayValue(r.role)} — thêm: ${d.added.map(c => LABEL[c] ?? c).join('; ') || 'không'}; thu hồi: ${d.removed.map(c => LABEL[c] ?? c).join('; ') || 'không'}.`;
  }).join(' ');

  return <div className="fm-card">
    <h2>Ma trận quyền</h2>
    <PageError message={error} retry={() => void load()}/>
    {success && <div className="fm-success">{success}</div>}
    <p className="fm-hint">Chọn để cấp quyền, bỏ chọn để thu hồi. Bạn có thể điều chỉnh quyền của Nhân viên và Quản lý vận hành; Quản trị viên luôn có đầy đủ quyền. Các quyền phụ thuộc được cập nhật cùng nhau.</p>
    <div className="fm-table-wrap"><table className="fm-table fm-matrix"><thead><tr><th>Khả năng</th>{roles.map(r => <th key={r.role}>{displayValue(r.role)}</th>)}</tr></thead><tbody>
      {groups.map(([group, list]) => <Fragment key={group}>
        <tr className="fm-group-row"><td><button type="button" className="fm-group-toggle" aria-expanded={open.has(group)} onClick={() => setOpen(cur => { const next = new Set(cur); if (!next.delete(group)) next.add(group); return next; })}><span className="fm-group-chevron" aria-hidden="true">›</span>{group} <span className="fm-group-count">({list.length})</span></button></td>{roles.map(r => {
          const g = grantable(r, list), on = g.filter(c => (draft[r.role] ?? new Set()).has(c)).length;
          return <td key={r.role}>{g.length > 0 && <input type="checkbox" aria-label={`${displayValue(r.role)}: cả nhóm ${group}`} checked={on === g.length} ref={el => { if (el) el.indeterminate = on > 0 && on < g.length; }} onChange={e => setMany(r.role, g, e.target.checked)}/>}</td>;
        })}</tr>
        {open.has(group) && list.map(capability => <tr key={capability}>
          <td className="fm-matrix-name" title={capability}>{LABEL[capability] ?? capability}</td>
          {roles.map(r => {
            const locked = !r.editable || data.adminOnly.includes(capability);
            const checked = (draft[r.role] ?? new Set()).has(capability);
            return <td key={r.role}>{locked
              ? (r.capabilities.includes(capability) ? 'Có' : '—')
              : <input type="checkbox" aria-label={`${displayValue(r.role)}: ${LABEL[capability] ?? capability}`} checked={checked} onChange={e => toggle(r.role, capability, e.target.checked)}/>}</td>;
          })}
        </tr>)}
      </Fragment>)}
    </tbody></table></div>
    <div className="fm-toolbar fm-matrix-actions">
      <button className="btn btn--primary" disabled={!changed.length || busy} onClick={() => setConfirming(true)}>Lưu quyền</button>{' '}
      <button className="btn" disabled={!changed.length || busy} onClick={() => setDraft(d => ({ ...d, ...Object.fromEntries(changed.map(r => [r.role, new Set(r.capabilities)])) }))}>Hoàn tác</button>
    </div>
    <small>Nhân viên và Quản lý vận hành sử dụng các chức năng được cấp trong không gian vận hành. Mã xác thực email được yêu cầu khi hệ thống bật xác thực hai bước.</small>
    {confirming && changed.length > 0 && <ConfirmReasonDialog error={error} title={`Lưu quyền của ${changed.map(r => displayValue(r.role)).join(', ')}`} busy={busy} onCancel={() => setConfirming(false)} onConfirm={save}
      description={summary}/>}
  </div>;
}
