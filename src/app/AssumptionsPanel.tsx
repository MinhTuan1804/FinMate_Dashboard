import { useCallback, useEffect, useState } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmDialog, EmptyState, LoadingRows, PageError, SuccessNotice } from './Shared';

export type Assumption = { id: string; key: string; rateBps: number; unit: string; sourceName: string; sourceUrl: string; asOf: string; version: number; status: 'draft' | 'approved' | 'retired'; createdBy: string; approvedBy: string | null };

const STATUS_LABEL: Record<Assumption['status'], string> = { draft: 'Nháp', approved: 'Đang dùng', retired: 'Đã gỡ' };
const pct = (bps: number) => `${(bps / 100).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * Danh sách giả định kinh tế (lạm phát, lãi suất...) kèm Thêm / Duyệt / Gỡ. Dùng chung cho trang Admin "Số liệu kinh tế" và trang của Manager.
 * `reloadKey` đổi thì tải lại (trang cha báo khi vừa chạy cập nhật CPI). Chỉ bản đã duyệt mới được agent dùng.
 */
export function AssumptionsPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const [items, setItems] = useState<Assumption[] | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<{ item: Assumption; action: 'approve' | 'retire' } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ key: 'general_price_growth', rate: '', unit: 'pct_per_year', sourceName: '', sourceUrl: '', asOf: '' });

  const load = useCallback(async () => {
    try { setItems(await getData<Assumption[]>('/admin/assumptions')); setError(''); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load, reloadKey]);

  async function decide() {
    if (!target) return;
    setBusy(true);
    try {
      await api.post(`/admin/assumptions/${target.item.id}/${target.action}`);
      setNotice(target.action === 'approve' ? 'Đã duyệt: bản này đang được agent dùng.' : 'Đã gỡ: agent thôi dùng bản này.'); setTarget(null); await load();
    } catch (e) { setError(errorText(e)); setTarget(null); } finally { setBusy(false); }
  }

  async function create() {
    const rate = Number(form.rate.replace(',', '.'));
    if (!Number.isFinite(rate) || form.rate.trim() === '' || !form.asOf) { setError('Nhập tỉ lệ (%) và ngày của số liệu.'); return; }
    setBusy(true);
    try {
      await api.post('/admin/assumptions', { key: form.key.trim(), rateBps: Math.round(rate * 100), unit: form.unit.trim(), sourceName: form.sourceName.trim(), sourceUrl: form.sourceUrl.trim(), asOf: `${form.asOf}T00:00:00+07:00` });
      setAdding(false); setForm(f => ({ ...f, rate: '', sourceName: '', sourceUrl: '', asOf: '' })); setNotice('Đã tạo bản nháp. Duyệt để agent dùng.'); setError(''); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  if (!items) return error ? <PageError message={error} retry={() => void load()} /> : <LoadingRows />;

  return <>
    <PageError message={error} retry={() => void load()} /><SuccessNotice message={notice} />
    <div className="fm-card"><div className="fm-toolbar"><h2>Giả định đã nhập</h2><button className="btn btn--small" onClick={() => setAdding(a => !a)}>{adding ? 'Đóng' : 'Thêm giả định'}</button></div>
      {adding && <div className="fm-preview">
        <div className="fm-settings-grid">
          <label className="fm-field">Khóa (chữ thường, số, gạch dưới)<input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></label>
          <label className="fm-field">Tỉ lệ (%/năm)<input inputMode="decimal" value={form.rate} placeholder="4,57" onChange={e => setForm({ ...form, rate: e.target.value })} /></label>
          <label className="fm-field">Đơn vị<input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></label>
          <label className="fm-field">Ngày của số liệu<input type="date" value={form.asOf} onChange={e => setForm({ ...form, asOf: e.target.value })} /></label>
        </div>
        <label className="fm-field">Tên nguồn<input value={form.sourceName} onChange={e => setForm({ ...form, sourceName: e.target.value })} placeholder="Cục Thống kê — CPI tháng 10/2026" /></label>
        <label className="fm-field">Đường dẫn nguồn (https)<input value={form.sourceUrl} onChange={e => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://" /></label>
        <div className="fm-actions"><button className="btn btn--primary" disabled={busy} onClick={() => void create()}>Tạo bản nháp</button></div>
      </div>}
      {items.length ? items.map(a => <div className="fm-list-row" key={a.id}>
        <span><strong>{a.key}</strong> · bản {a.version} · <strong>{pct(a.rateBps)}</strong> ({a.unit}) <span className={`fm-badge ${a.status === 'approved' ? 'good' : ''}`}>{STATUS_LABEL[a.status] ?? a.status}</span><br />
          <small>{a.sourceName} · số liệu ngày {day(a.asOf)} · <a href={a.sourceUrl} target="_blank" rel="noreferrer noopener">nguồn</a></small></span>
        <span className="fm-actions">
          {a.status === 'draft' && <button className="btn btn--small btn--primary" onClick={() => setTarget({ item: a, action: 'approve' })}>Duyệt</button>}
          {a.status !== 'retired' && <button className="btn btn--small" onClick={() => setTarget({ item: a, action: 'retire' })}>Gỡ</button>}
        </span></div>) : <EmptyState message="Chưa có giả định nào." />}
    </div>
    {target && <ConfirmDialog error={error} busy={busy} title={target.action === 'approve' ? 'Duyệt giả định này?' : 'Gỡ giả định này?'}
      description={target.action === 'approve' ? `${target.item.key} = ${pct(target.item.rateBps)}. Bản đang dùng trước đó của cùng khóa sẽ được gỡ, agent dùng bản này ngay.` : `Agent thôi dùng ${target.item.key} bản ${target.item.version} ngay. Nếu không còn bản nào đang dùng thì câu hỏi cần giả định này sẽ trả "chưa đủ dữ liệu".`}
      onCancel={() => setTarget(null)} onConfirm={decide} />}
  </>;
}
