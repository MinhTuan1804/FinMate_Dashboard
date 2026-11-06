import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorText, getData } from '../shared/api';
import type { PromptList, PromptVersion } from '../shared/models';
import { ConfirmDialog, EmptyState, LoadingRows, PageError } from './Shared';
import { OffsetPager } from './ui/ListControls';

const base = '/admin/finance-method-prompts';
const PAGE = 10;
const MAX_CHARS = 8000;
const NAME_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;
const when = (iso: string) => new Date(iso).toLocaleString('vi-VN');

/**
 * Chỉ dẫn (prompt) của AI khi gợi ý cách quản lý tài chính. Không sửa tại chỗ: đổi chỉ dẫn = thêm phiên bản mới rồi chuyển bản đang dùng,
 * bản cũ còn nguyên để truy ngược gợi ý nào do bản nào sinh ra và để quay về khi bản mới tệ hơn.
 */
export function PromptsPanel() {
  const [data, setData] = useState<PromptList | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [activateNow, setActivateNow] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PromptVersion | null>(null);
  const [busy, setBusy] = useState(false);

  const [offset, setOffset] = useState(0);
  const load = useCallback(async () => {
    try {
      setData(await getData<PromptList>(base, { limit: PAGE, offset }));   // mỗi trang do API cắt; bản đang dùng đi riêng nên không mất khi nằm ở trang khác
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [offset]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  /** Xung đột (409): tải lại danh sách nhưng GIỮ thông báo lỗi, nếu không người dùng sẽ không biết vì sao thao tác không được. */
  async function failed(e: unknown) {
    const message = errorText(e);
    if ((e as { response?: { status?: number } }).response?.status === 409) await load();
    setError(message);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await api.post(base, { prompt_version: name.trim(), instruction_text: text.trim(), activate: activateNow });
      setNotice(activateNow ? `Đã thêm và dùng ngay "${name.trim()}".` : `Đã thêm "${name.trim()}". Bản đang dùng chưa đổi.`);
      setName('');
      setText('');
      setActivateNow(false);
      await load();
    } catch (e) {
      await failed(e);
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!confirm || !data) return;
    setBusy(true);
    setNotice('');
    try {
      // expected_active = bản đang chạy mà người sửa nhìn thấy: người khác vừa đổi thì backend từ chối thay vì ghi đè.
      await api.post(`${base}/${encodeURIComponent(confirm.prompt_version)}/activate`, { expected_active: data.active_version });
      setNotice(`Đang dùng "${confirm.prompt_version}". Có hiệu lực ngay cho các gợi ý mới.`);
      setConfirm(null);
      await load();
    } catch (e) {
      setConfirm(null);
      await failed(e);
    } finally {
      setBusy(false);
    }
  }

  const active = data?.active_version;
  const nameValid = NAME_PATTERN.test(name.trim());
  const exists = data?.items.some(item => item.prompt_version === name.trim()) ?? false;
  const canCreate = nameValid && !exists && text.trim().length > 0 && text.trim().length <= MAX_CHARS && !busy;

  return (
    <>
      <p className="fm-hint">
        AI chỉ được chọn trong các cách quản lý đang bật. Nhiệm vụ, quy tắc đầu ra và việc coi dữ liệu người dùng là dữ liệu (không phải lệnh) do hệ thống giữ cố định;
        ở đây chỉ chỉnh <strong>cách cân nhắc</strong> và giọng văn của lý do. Chỉ dẫn xấu làm AI chọn tệ hơn chứ không cho AI chọn ngoài danh sách (khi đó app dùng luật).
        Chưa có cổng đo tự động: sau khi chuyển bản, hãy xin một gợi ý thử trên app rồi đọc lý do.
      </p>
      <PageError message={error} retry={() => void load()} />
      {notice && <div className="fm-success" role="status">{notice}</div>}

      <div className="fm-settings-grid">
        <div className="fm-card">
          <h2>Các phiên bản {active && <span className="fm-badge good">Đang dùng: {active}</span>}</h2>
          {!data ? <LoadingRows /> : data.items.length === 0 ? <EmptyState message="Chưa có phiên bản nào: gợi ý đang chạy bằng luật." /> : data.items.map(item => (
            <div key={item.prompt_version}>
              <div className="fm-list-row">
                <span>
                  <strong>{item.prompt_version}</strong> {item.is_active && <span className="fm-badge good">Đang dùng</span>}
                  <br /><small>Tạo lúc {when(item.created_at)}</small>
                </span>
                <span className="fm-actions">
                  <button type="button" className="btn btn--small" aria-expanded={open === item.prompt_version} onClick={() => setOpen(open === item.prompt_version ? null : item.prompt_version)}>{open === item.prompt_version ? 'Ẩn' : 'Xem'}</button>
                  <button type="button" className="btn btn--small" onClick={() => { setName(''); setText(item.instruction_text); }}>Làm bản mới từ bản này</button>
                  <button type="button" className="btn btn--small" disabled={item.is_active || busy} onClick={() => setConfirm(item)}>Dùng bản này</button>
                </span>
              </div>
              {open === item.prompt_version && <pre className="fm-json">{item.instruction_text}</pre>}
            </div>
          ))}
          {data && <OffsetPager offset={data.offset} limit={PAGE} total={data.total} onChange={setOffset} />}
        </div>

        <form className="fm-card" onSubmit={create}>
          <h2>Thêm phiên bản mới</h2>
          <label className="fm-field">
            Tên phiên bản
            <input value={name} onChange={e => setName(e.target.value)} placeholder="vd. method-select-v2" maxLength={50} aria-invalid={Boolean(name) && (!nameValid || exists)} />
            {name && !nameValid && <small className="fm-error-text">Chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang (tối đa 50 ký tự).</small>}
            {name && nameValid && exists && <small className="fm-error-text">Tên này đã có. Không sửa tại chỗ: hãy đặt tên phiên bản mới.</small>}
          </label>
          <label className="fm-field">
            Nội dung chỉ dẫn
            <textarea value={text} onChange={e => setText(e.target.value)} rows={12} spellCheck={false} />
            <small className={text.trim().length > MAX_CHARS ? 'fm-error-text' : ''}>{text.trim().length}/{MAX_CHARS} ký tự</small>
          </label>
          <label className="fm-field fm-switch-row">
            <input type="checkbox" checked={activateNow} onChange={e => setActivateNow(e.target.checked)} />
            <span><strong>Dùng ngay sau khi thêm</strong><small>Không chọn thì chỉ lưu; bản đang dùng giữ nguyên cho tới khi bạn chuyển.</small></span>
          </label>
          <button className="btn btn--primary" disabled={!canCreate}>{busy ? 'Đang lưu...' : 'Thêm phiên bản'}</button>
        </form>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Dùng phiên bản ${confirm.prompt_version}`}
          description={`Gợi ý mới sẽ dùng chỉ dẫn này thay cho ${data?.active_version ?? 'bản hiện tại'}. Bản cũ vẫn được giữ, bạn quay về được bất cứ lúc nào.`}
          onCancel={() => setConfirm(null)}
          onConfirm={activate}
          busy={busy}
        />
      )}
    </>
  );
}
