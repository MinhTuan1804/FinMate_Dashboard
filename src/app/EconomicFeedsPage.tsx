import { useCallback, useEffect, useState } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmDialog, ConfirmReasonDialog, EmptyState, LoadingRows, PageError, PageHeader, SuccessNotice } from './Shared';

type Feeds = { enabled: boolean; scheduleDayOfMonth: number; scheduleHour: number; cpiIndexUrl: string; autoApproveMaxDeltaBps: number; minRateBps: number; maxRateBps: number };
type ConfigView = { version: number; content: Record<string, unknown> & { economicFeeds?: Feeds } };
type Assumption = { id: string; key: string; rateBps: number; unit: string; sourceName: string; sourceUrl: string; asOf: string; version: number; status: 'draft' | 'approved' | 'retired'; createdBy: string; approvedBy: string | null };

const DEFAULT_FEEDS: Feeds = { enabled: true, scheduleDayOfMonth: 6, scheduleHour: 9, cpiIndexUrl: '', autoApproveMaxDeltaBps: 100, minRateBps: -2000, maxRateBps: 5000 };
// Địa chỉ trang tìm kiếm của Cục Thống kê: gom được cả hai chuyên mục đăng thông cáo CPI và xếp bài mới nhất lên đầu (xem docs/economic-feeds-probe.md ở repo backend).
const CPI_SEARCH_URL = 'https://www.nso.gov.vn/?s=ch%E1%BB%89+s%E1%BB%91+gi%C3%A1+ti%C3%AAu+d%C3%B9ng';
const STATUS_LABEL: Record<Assumption['status'], string> = { draft: 'Nháp', approved: 'Đang dùng', retired: 'Đã gỡ' };
const OUTCOME_TEXT: Record<string, string> = {
  Disabled: 'Chưa đặt địa chỉ nguồn CPI nên chưa tải gì. Điền địa chỉ, lưu, rồi chạy lại.',
  AlreadyCurrent: 'Bài CPI mới nhất đã có trong hệ thống, không có gì thay đổi.',
  AutoApproved: 'Đã đọc CPI mới và tự duyệt. Bản mới đang được dùng.',
  NeedsReview: 'Đã đọc CPI mới nhưng số lệch nhiều hoặc ngoài khoảng cho phép. Bản nháp đang chờ bạn duyệt ở danh sách bên dưới.',
  Failed: 'Không đọc được CPI nên giữ nguyên số cũ (trang có thể đã đổi giao diện hoặc không tải được). Xem sự cố "Nguồn số liệu kinh tế" ở trang Giám sát.',
};
const pct = (bps: number) => `${(bps / 100).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Ô nhập phần trăm (điểm cơ bản ở backend: 4,57% = 457). Giữ chuỗi đang gõ để "4," chưa bị nuốt giữa chừng; cha đặt key theo phiên bản cấu hình để ô làm mới sau khi tải lại. */
function PercentField({ label, bps, onChange }: { label: string; bps: number; onChange: (bps: number) => void }) {
  const [text, setText] = useState(String(bps / 100).replace('.', ','));
  return <label className="fm-field">{label}<input inputMode="decimal" value={text} onChange={e => {
    setText(e.target.value);
    const n = Number(e.target.value.replace(',', '.'));
    if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(Math.round(n * 100));
  }} /></label>;
}

export function EconomicFeedsPage() {
  const [view, setView] = useState<ConfigView | null>(null), [draft, setDraft] = useState<Feeds>(DEFAULT_FEEDS);
  const [items, setItems] = useState<Assumption[] | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false), [busy, setBusy] = useState(false), [running, setRunning] = useState(false);
  const [target, setTarget] = useState<{ item: Assumption; action: 'approve' | 'retire' } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ key: 'general_price_growth', rate: '', unit: 'pct_per_year', sourceName: '', sourceUrl: '', asOf: '' });

  const load = useCallback(async () => {
    try {
      const [config, list] = await Promise.all([getData<ConfigView>('/admin/system-config'), getData<Assumption[]>('/admin/assumptions')]);
      setView(config); setDraft({ ...DEFAULT_FEEDS, ...(config.content.economicFeeds ?? {}) }); setItems(list); setError('');
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const saved = { ...DEFAULT_FEEDS, ...(view?.content.economicFeeds ?? {}) };
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = (patch: Partial<Feeds>) => setDraft(current => ({ ...current, ...patch }));

  async function save(note: string) {
    if (!view) return;
    setBusy(true);
    try {
      await api.put('/admin/system-config', { expectedVersion: view.version, content: { ...view.content, economicFeeds: draft }, note });
      setSaving(false); setNotice('Đã lưu. Lịch chạy mới có hiệu lực ngay.'); await load();
    } catch (e) {
      // 409: có người vừa đổi cấu hình. Tải lại bản mới nhưng giữ thông báo lỗi để người dùng biết vì sao lưu không được.
      const message = errorText(e); if ((e as { response?: { status?: number } }).response?.status === 409) await load(); setError(message); setSaving(false);
    } finally { setBusy(false); }
  }

  async function runNow() {
    setRunning(true); setOutcome(''); setError('');
    try {
      const res = await api.post<{ data: { outcome: string } }>('/admin/economic-feeds/refresh');
      setOutcome(res.data.data.outcome); await load();
    } catch (e) { setError(errorText(e)); } finally { setRunning(false); }
  }

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

  if (!view || !items) return error ? <PageError message={error} retry={() => void load()} /> : <LoadingRows />;

  return <>
    <PageHeader title="Số liệu kinh tế" description="Giả định lạm phát cho dự báo mục tiêu dài hạn: tự cập nhật hằng tháng từ thông cáo CPI của Cục Thống kê, hoặc nhập tay. Chỉ bản đã duyệt mới được agent dùng." />
    <PageError message={error} retry={() => void load()} /><SuccessNotice message={notice} />

    <div className="fm-card"><h2>Tự cập nhật CPI</h2>
      <p className="fm-hint">Cấu hình lưu trong cấu hình hệ thống (phiên bản {view.version}, có lịch sử và khôi phục ở trang Hệ thống). Lưu xong là job được đăng ký lại ngay.</p>
      <label className="fm-field fm-switch-row"><input type="checkbox" checked={draft.enabled} onChange={e => set({ enabled: e.target.checked })} /><span><strong>Bật lịch tự chạy</strong><small>Tắt thì job bị gỡ khỏi lịch; nút "Chạy ngay" vẫn dùng được.</small></span></label>
      <div className="fm-settings-grid">
        <label className="fm-field fm-field--inline">Ngày trong tháng (1–28)<input type="number" min={1} max={28} value={draft.scheduleDayOfMonth} onChange={e => set({ scheduleDayOfMonth: Number(e.target.value) })} /></label>
        <label className="fm-field fm-field--inline">Giờ (0–23, giờ Việt Nam)<input type="number" min={0} max={23} value={draft.scheduleHour} onChange={e => set({ scheduleHour: Number(e.target.value) })} /></label>
      </div>
      <label className="fm-field">Địa chỉ trang liệt kê bài CPI (https; để trống = không tải gì)
        <input value={draft.cpiIndexUrl} placeholder={CPI_SEARCH_URL} onChange={e => set({ cpiIndexUrl: e.target.value })} /></label>
      <p className="fm-hint"><button type="button" className="btn btn--small" onClick={() => set({ cpiIndexUrl: CPI_SEARCH_URL })}>Dùng trang tìm kiếm của Cục Thống kê</button> Gom đủ các chuyên mục và xếp bài mới nhất lên đầu.</p>
      <div className="fm-settings-grid">
        <PercentField key={`delta-${view.version}`} label="Tự duyệt khi lệch tối đa (điểm %)" bps={draft.autoApproveMaxDeltaBps} onChange={v => set({ autoApproveMaxDeltaBps: v })} />
        <PercentField key={`min-${view.version}`} label="Khoảng hợp lý: từ (%/năm)" bps={draft.minRateBps} onChange={v => set({ minRateBps: v })} />
        <PercentField key={`max-${view.version}`} label="Khoảng hợp lý: đến (%/năm)" bps={draft.maxRateBps} onChange={v => set({ maxRateBps: v })} />
      </div>
      <p className="fm-hint">Số lệch quá ngưỡng hoặc ngoài khoảng hợp lý không bao giờ tự duyệt: nó nằm ở trạng thái Nháp chờ người duyệt.</p>
      <div className="fm-actions">
        <button className="btn btn--primary" disabled={!dirty || busy} onClick={() => setSaving(true)}>Lưu cấu hình</button>
        <button className="btn" disabled={dirty || running} onClick={() => void runNow()} title={dirty ? 'Lưu cấu hình trước: nút này chạy theo cấu hình đã lưu' : undefined}>{running ? 'Đang đọc...' : 'Chạy ngay'}</button>
        {dirty && <span className="fm-hint">Có thay đổi chưa lưu.</span>}
      </div>
      {outcome && <p className="fm-hint" role="status"><span className={`fm-badge ${outcome === 'AutoApproved' || outcome === 'AlreadyCurrent' ? 'good' : ''}`}>{outcome}</span> {OUTCOME_TEXT[outcome] ?? ''}</p>}
    </div>

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
        </span></div>) : <EmptyState message="Chưa có giả định nào. Bấm Chạy ngay để lấy CPI, hoặc thêm tay." />}
    </div>

    {saving && <ConfirmReasonDialog error={error} title="Lưu cấu hình số liệu kinh tế" description="Lịch chạy và địa chỉ nguồn mới có hiệu lực ngay. Ghi lý do để lưu vào lịch sử cấu hình." onCancel={() => setSaving(false)} onConfirm={save} busy={busy} />}
    {target && <ConfirmDialog error={error} busy={busy} title={target.action === 'approve' ? 'Duyệt giả định này?' : 'Gỡ giả định này?'}
      description={target.action === 'approve' ? `${target.item.key} = ${pct(target.item.rateBps)}. Bản đang dùng trước đó của cùng khóa sẽ được gỡ, agent dùng bản này ngay.` : `Agent thôi dùng ${target.item.key} bản ${target.item.version} ngay. Nếu không còn bản nào đang dùng thì câu hỏi cần giả định này sẽ trả "chưa đủ dữ liệu".`}
      onCancel={() => setTarget(null)} onConfirm={decide} />}
  </>;
}
