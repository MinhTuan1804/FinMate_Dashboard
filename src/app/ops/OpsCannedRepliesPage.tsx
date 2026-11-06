import { useState, type FormEvent } from 'react';
import { errorText } from '../../shared/api';
import { EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { OffsetPager, SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { fmtDateTime, patch, post, type CannedReply } from './opsApi';

/** Câu trả lời mẫu cho nhân viên. Không xóa, chỉ tắt bằng isActive để lịch sử audit còn nguyên. */
export function OpsCannedRepliesPage() {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const list = useServerList<CannedReply>('/ops/canned-replies', { params: { includeInactive: true } });
  const [editing, setEditing] = useState<string | null>(null), [form, setForm] = useState({ title: '', body: '' });

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (editing) await patch(`/ops/canned-replies/${editing}`, { title: form.title.trim(), body: form.body.trim() });
      else await post('/ops/canned-replies', { title: form.title.trim(), body: form.body.trim() });
      setForm({ title: '', body: '' }); setEditing(null); setError(''); list.reload();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function toggle(r: CannedReply) {
    setBusy(true);
    try { await patch(`/ops/canned-replies/${r.id}`, { isActive: !r.isActive }); list.reload(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const edit = (r: CannedReply) => { setEditing(r.id); setForm({ title: r.title, body: r.body }); };

  return <>
    <PageHeader title="Câu trả lời mẫu" description="Nhân viên chèn các câu này vào khung trả lời ticket. Câu đã tắt không còn hiện cho nhân viên."/>
    <PageError message={error || list.error} retry={list.reload}/>
    <details className="fm-card fm-disclosure" open={editing?true:undefined}><summary>Thêm hoặc sửa câu trả lời mẫu</summary><form className="fm-card fm-form fm-form--stack" onSubmit={save}>
      <h2>{editing ? 'Sửa câu trả lời mẫu' : 'Thêm câu trả lời mẫu'}</h2>
      <label>Tiêu đề<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={120}/></label>
      <label>Nội dung<textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required maxLength={2000}/></label>
      <div><button className="btn btn--primary" disabled={busy || !form.title.trim() || !form.body.trim()}>{editing ? 'Lưu thay đổi' : 'Thêm'}</button>{editing && <> <button type="button" className="btn" onClick={() => { setEditing(null); setForm({ title: '', body: '' }); }}>Hủy sửa</button></>}</div>
    </form></details>
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar"><SearchField value={list.search} onChange={list.setSearch} placeholder="Tiêu đề hoặc nội dung"/></div>
      {list.loading && list.rows.length === 0 ? <LoadingRows/> : list.rows.length === 0 ? <EmptyState message={list.search ? 'Không có câu trả lời mẫu nào khớp' : 'Chưa có câu trả lời mẫu'}/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Tiêu đề</th><th>Nội dung</th><th>Trạng thái</th><th>Cập nhật</th><th></th></tr></thead><tbody>
          {list.rows.map(r => <tr key={r.id}><td>{r.title}</td><td title={r.body}>{r.body}</td><td><span className={`fm-badge ${r.isActive ? 'good' : ''}`}>{r.isActive ? 'Đang bật' : 'Đã tắt'}</span></td><td>{fmtDateTime(r.updatedAt)}</td><td className="fm-actions"><button className="btn btn--small" disabled={busy} onClick={() => edit(r)}>Sửa</button> <button className="btn btn--small" disabled={busy} onClick={() => void toggle(r)}>{r.isActive ? 'Tắt' : 'Bật'}</button></td></tr>)}
        </tbody></table></div>}
      <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/>
    </div>
  </>;
}
