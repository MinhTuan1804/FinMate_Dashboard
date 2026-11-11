import { useState } from 'react';
import { api, errorText, getData } from '../../shared/api';
import { ConfirmDialog, EmptyState, LoadingRows, PageError, PageHeader, SuccessNotice } from '../Shared';
import { OffsetPager, SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';

type Doc = { id: string; title: string; source_name: string; source_url: string | null; as_of: string; effective_from: string; effective_to: string | null; status: 'Draft' | 'Approved' | 'Retired'; version: number; chunks: number };
type Detail = Doc & { text: string | null };

const STATUS_LABEL: Record<Doc['status'], string> = { Draft: 'Nháp', Approved: 'Đã duyệt', Retired: 'Đã gỡ' };
const FILTERS: [string, string][] = [['', 'Tất cả'], ['Draft', 'Nháp'], ['Approved', 'Đã duyệt'], ['Retired', 'Đã gỡ']];
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * Kho tri thức của AI Financial Agent: đọc nội dung từng tài liệu rồi Duyệt hoặc Gỡ. Chỉ bản Đã duyệt (và còn hiệu lực) mới được agent tìm thấy.
 * Danh sách phân trang và tìm kiếm ở server. Sửa nội dung = thêm bản mới, duyệt, rồi gỡ bản cũ (không sửa tại chỗ).
 */
export function OpsKnowledgePage() {
  const [status, setStatus] = useState('');
  const list = useServerList<Doc>('/admin/knowledge/documents', { params: status ? { status } : {} });
  const [open, setOpen] = useState<Record<string, string | null>>({});   // id → nội dung đã tải (null = đang tải)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<{ doc: Doc; action: 'approve' | 'retire' } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', sourceName: '', sourceUrl: '', asOf: '', text: '' });

  const close = (id: string) => setOpen(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));

  async function toggle(doc: Doc) {
    if (doc.id in open) { close(doc.id); return; }
    setOpen(current => ({ ...current, [doc.id]: null }));
    try { const detail = await getData<Detail>(`/admin/knowledge/documents/${doc.id}`); setOpen(current => ({ ...current, [doc.id]: detail.text ?? '' })); }
    catch (e) { setError(errorText(e)); close(doc.id); }
  }

  async function decide() {
    if (!target) return;
    setBusy(true);
    try {
      await api.post(`/admin/knowledge/documents/${target.doc.id}/${target.action}`);
      setNotice(target.action === 'approve' ? 'Đã duyệt: agent có thể tìm thấy tài liệu này.' : 'Đã gỡ: agent thôi dùng tài liệu này.'); setTarget(null); setError(''); list.reload();
    } catch (e) { setError(errorText(e)); setTarget(null); } finally { setBusy(false); }
  }

  async function create() {
    if (!form.title.trim() || !form.sourceName.trim() || !form.asOf || !form.text.trim()) { setError('Nhập tiêu đề, tên nguồn, ngày của số liệu và nội dung.'); return; }
    setBusy(true);
    const when = `${form.asOf}T00:00:00+07:00`;
    try {
      await api.post('/admin/knowledge/documents', { title: form.title.trim(), source_name: form.sourceName.trim(), ...(form.sourceUrl.trim() ? { source_url: form.sourceUrl.trim() } : {}), as_of: when, effective_from: when, text: form.text.trim() });
      setAdding(false); setForm({ title: '', sourceName: '', sourceUrl: '', asOf: '', text: '' }); setNotice('Đã tạo bản nháp. Đọc lại rồi bấm Duyệt để agent dùng.'); setError(''); list.reload();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Tri thức AI" description="Tài liệu cho AI Financial Agent. Đọc nội dung từng tài liệu rồi duyệt: chỉ bản đã duyệt mới được agent tìm thấy. Không viết số tiền cụ thể vào tài liệu." />
    <PageError message={error || list.error} retry={list.reload} /><SuccessNotice message={notice} />
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar">
        <SearchField value={list.search} onChange={list.setSearch} placeholder="Tiêu đề hoặc nguồn" />
        <span className="fm-actions">{FILTERS.map(([value, label]) => <button key={value || 'all'} className={`btn btn--small ${status === value ? 'btn--primary' : ''}`} onClick={() => setStatus(value)}>{label}</button>)}</span>
        <button className="btn btn--small" onClick={() => setAdding(a => !a)}>{adding ? 'Đóng' : 'Thêm tài liệu'}</button>
      </div>
      {adding && <div className="fm-preview">
        <label className="fm-field">Tiêu đề (từ khóa nên nằm ở tiêu đề và câu đầu)<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <div className="fm-settings-grid">
          <label className="fm-field">Tên nguồn<input value={form.sourceName} onChange={e => setForm({ ...form, sourceName: e.target.value })} placeholder="FinMate — phương pháp ..." /></label>
          <label className="fm-field">Đường dẫn nguồn (https, nếu có)<input value={form.sourceUrl} onChange={e => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://" /></label>
          <label className="fm-field">Ngày của số liệu<input type="date" value={form.asOf} onChange={e => setForm({ ...form, asOf: e.target.value })} /></label>
        </div>
        <label className="fm-field">Nội dung (tiếng Việt có dấu, câu ngắn tự đứng được; mỗi đoạn tối đa 450 ký tự)<textarea rows={6} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} /></label>
        <div className="fm-actions"><button className="btn btn--primary" disabled={busy} onClick={() => void create()}>Tạo bản nháp</button></div>
      </div>}
      {list.loading && list.rows.length === 0 ? <LoadingRows /> : list.rows.length === 0 ? <EmptyState message={list.search || status ? 'Không có tài liệu nào khớp' : 'Chưa có tài liệu nào'} /> :
        list.rows.map(d => <div key={d.id}>
          <div className="fm-list-row">
            <span><strong>{d.title}</strong> · bản {d.version} <span className={`fm-badge ${d.status === 'Approved' ? 'good' : ''}`}>{STATUS_LABEL[d.status]}</span><br />
              <small>{d.source_name}{d.source_url && <> · <a href={d.source_url} target="_blank" rel="noreferrer noopener">nguồn</a></>} · số liệu ngày {day(d.as_of)} · hiệu lực từ {day(d.effective_from)}{d.effective_to ? ` đến ${day(d.effective_to)}` : ''} · {d.chunks} đoạn</small></span>
            <span className="fm-actions">
              <button className="btn btn--small" onClick={() => void toggle(d)}>{d.id in open ? 'Ẩn nội dung' : 'Đọc nội dung'}</button>
              {d.status === 'Draft' && <button className="btn btn--small btn--primary" onClick={() => setTarget({ doc: d, action: 'approve' })}>Duyệt</button>}
              {d.status !== 'Retired' && <button className="btn btn--small" onClick={() => setTarget({ doc: d, action: 'retire' })}>Gỡ</button>}
            </span>
          </div>
          {d.id in open && <div className="fm-preview">{open[d.id] === null ? <LoadingRows /> : <p style={{ whiteSpace: 'pre-wrap' }}>{open[d.id]}</p>}</div>}
        </div>)}
      <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset} />
    </div>
    {target && <ConfirmDialog error={error} busy={busy} title={target.action === 'approve' ? 'Duyệt tài liệu này?' : 'Gỡ tài liệu này?'}
      description={target.action === 'approve' ? `"${target.doc.title}" sẽ được agent tìm thấy và dùng để trả lời. Bạn đã đọc nội dung chưa?` : `Agent thôi tìm thấy "${target.doc.title}" ngay. Gỡ rồi không duyệt lại được; muốn dùng lại thì thêm bản mới.`}
      onCancel={() => setTarget(null)} onConfirm={decide} />}
  </>;
}
