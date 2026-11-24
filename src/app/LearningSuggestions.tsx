import { useState, type FormEvent } from 'react';
import { api, errorText, getData } from '../shared/api';
import { fmtDate } from '../shared/format';
import { displayValue } from '../shared/labels';
import { EmptyState, LoadingRows, PageError, SuccessNotice } from './Shared';
import { DialogOverlay } from './ui/DialogOverlay';
import { OffsetPager } from './ui/ListControls';
import { useResource } from './ui/useResource';
import { useServerList } from './ui/useServerList';

type Summary = { total: number; by_type: Record<string, number>; unprocessed: number; top_corrections: { predicted_category: string | null; corrected_category: string | null; times: number }[] };
type Suggestion = { keyword: string; corrected_category: string; users: number; times: number; predicted_categories: string[]; current_category: string; covered: boolean; last_at: string | null };
type LexiconDoc = { version: number; content: Record<string, string[]> };

const LEXICON = '/admin/ai-config/documents/merchant_lexicon';
const category = (slug: string | null | undefined) => (slug ? displayValue(slug) : '—');
const keywordOf = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean).join(' ');

/** Thêm từ khóa vào một danh mục và bỏ đúng từ đó khỏi danh mục khác (một tên chỉ thuộc một danh mục). Cùng nghĩa với ``with_keyword`` ở ai-service. */
function withKeyword(content: Record<string, string[]>, keyword: string, slug: string): Record<string, string[]> {
  const key = keywordOf(keyword);
  const result = Object.fromEntries(Object.entries(content).map(([s, words]) => [s, words.filter(word => keywordOf(word) !== key)]));
  result[slug] = [...(result[slug] ?? []), key];
  return result;
}

/** Tổng quan phản hồi: bao nhiêu, còn bao nhiêu chưa dùng để học, và AI hay đoán sai ở cặp danh mục nào. */
export function LearningSummary() {
  const summary = useResource<Summary>('/admin/ai-learning/summary', {});
  const data = summary.data;
  if (!data) return summary.error ? <PageError message={summary.error} retry={summary.reload} /> : null;
  return <div className="learning-summary">
    <div className="fm-stats">
      <div className="fm-stat"><span>Phản hồi của người dùng</span><strong>{data.total}</strong></div>
      <div className="fm-stat"><span>Sửa danh mục</span><strong>{data.by_type.category_correction ?? 0}</strong></div>
      <div className="fm-stat"><span>Chưa dùng để học</span><strong>{data.unprocessed}</strong></div>
    </div>
    {data.top_corrections.length > 0 && <div className="fm-card learning-pairs"><h2>AI hay xếp sai nhất</h2>
      <ul>{data.top_corrections.map(pair => <li key={`${pair.predicted_category}-${pair.corrected_category}`}><span>{category(pair.predicted_category)} → <strong>{category(pair.corrected_category)}</strong></span><small>{pair.times} lần</small></li>)}</ul></div>}
  </div>;
}

/** Gợi ý thêm tên cửa hàng vào từ điển: chỉ những tên mà từ 2 người dùng trở lên cùng sửa sang một danh mục. Một bấm là thêm (có lý do, lịch sử và khôi phục như mọi lần sửa từ điển). */
export function SuggestionsPanel() {
  const [showCovered, setShowCovered] = useState(false), [adding, setAdding] = useState<Suggestion | null>(null), [notice, setNotice] = useState('');
  const list = useServerList<Suggestion>('/admin/ai-learning/suggestions', { params: { include_covered: showCovered || undefined } });
  return <div className="fm-card">
    <PageError message={list.error} retry={list.reload} /><SuccessNotice message={notice} />
    <div className="fm-toolbar fm-filter-bar">
      <p className="fm-hint">Tên cửa hàng mà từ 2 người dùng trở lên cùng sửa sang một danh mục. Thêm vào từ điển thì lần sau AI tự xếp đúng, không cần người dùng sửa nữa. Tên chỉ một người sửa không hiện ở đây để giữ riêng tư.</p>
      <label className="fm-inline"><input type="checkbox" checked={showCovered} onChange={e => setShowCovered(e.target.checked)} /> Hiện cả gợi ý đã được xử lý</label>
    </div>
    {list.loading ? <LoadingRows /> : list.error ? null : list.rows.length
      ? <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Tên cửa hàng</th><th>AI đang xếp vào</th><th>Người dùng sửa thành</th><th>Số người / lần</th><th>Lần gần nhất</th><th>Thao tác</th></tr></thead><tbody>
        {list.rows.map(row => <tr key={`${row.keyword}-${row.corrected_category}`}>
          <td className="cell-primary">{row.keyword}</td>
          <td>{category(row.current_category)}</td>
          <td><strong>{category(row.corrected_category)}</strong></td>
          <td>{row.users} người / {row.times} lần</td>
          <td>{fmtDate(row.last_at)}</td>
          <td className="fm-actions">{row.covered ? <span className="fm-badge good">Đã có luật</span> : <button className="btn btn--small btn--primary" onClick={() => setAdding(row)}>Thêm vào từ điển</button>}</td>
        </tr>)}</tbody></table></div>
      : <EmptyState message={showCovered ? 'Chưa có gợi ý nào' : 'Không có gợi ý mới. Khi nhiều người cùng sửa một cửa hàng, gợi ý sẽ hiện ở đây.'} />}
    {!list.error && <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset} />}
    {adding && <AddKeywordDialog suggestion={adding} onClose={() => setAdding(null)} onDone={message => { setAdding(null); setNotice(message); list.reload(); }} />}
  </div>;
}

/** Lưu nháp từ điển có thêm từ khóa rồi kích hoạt. Nếu chạy thử thấy kết quả kém đi, bản nháp vẫn được giữ và admin chọn áp dụng hay không. */
function AddKeywordDialog({ suggestion, onClose, onDone }: { suggestion: Suggestion; onClose: () => void; onDone: (message: string) => void }) {
  const [keyword, setKeyword] = useState(suggestion.keyword), [slug, setSlug] = useState(suggestion.corrected_category);
  const [reason, setReason] = useState(`Từ phản hồi của ${suggestion.users} người dùng`), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [regression, setRegression] = useState<{ version: number; expected: number } | null>(null);
  const doc = useResource<LexiconDoc>(LEXICON, {});
  const slugs = doc.data ? Object.keys(doc.data.content) : [suggestion.corrected_category];

  async function activate(version: number, expected: number, force: boolean) {
    await api.post(`${LEXICON}/versions/${version}/activate`, { expected_active_version: expected, force });
    onDone(`Đã thêm "${keywordOf(keyword)}" vào ${category(slug)}. AI áp dụng ngay cho thông báo mới.`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!doc.data) return;
    if (keywordOf(keyword).length < 2) { setError('Từ khóa cần ít nhất 2 ký tự.'); return; }
    if (reason.trim().length < 3) { setError('Lý do cần ít nhất 3 ký tự.'); return; }
    setBusy(true); setError('');
    try {
      const fresh = await getData<LexiconDoc>(LEXICON);  // lấy bản đang chạy mới nhất, tránh ghi đè thay đổi của người khác
      const draft = await api.post(`${LEXICON}/drafts`, { content: withKeyword(fresh.content, keyword, slug), note: reason.trim() });
      const version = draft.data.data.version as number;
      try { await activate(version, fresh.version, false); }
      catch (e) {
        const response = (e as { response?: { status?: number; data?: { error?: { code?: string } } } }).response;
        if (response?.status === 422 && response.data?.error?.code === 'preview_regression') { setRegression({ version, expected: fresh.version }); setError(errorText(e)); }
        else throw e;
      }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return <DialogOverlay onClose={onClose} guardChanges busy={busy}><form className="fm-modal fm-modal--compact" role="dialog" aria-modal="true" aria-label="Thêm vào từ điển tên cửa hàng" onSubmit={submit}>
    <div className="fm-modal-head"><h2>Thêm vào từ điển tên cửa hàng</h2><button type="button" className="btn" data-dialog-close>Đóng</button></div>
    <div className="fm-form">
      <PageError message={doc.error} retry={doc.reload} />
      <label>Từ khóa<input value={keyword} onChange={e => setKeyword(e.target.value)} maxLength={60} required /></label>
      <label>Danh mục<select value={slug} onChange={e => setSlug(e.target.value)}>{slugs.map(s => <option key={s} value={s}>{category(s)}</option>)}</select></label>
      <small>Thông báo có chứa từ khóa này (không phân biệt hoa thường) sẽ được xếp vào danh mục trên. Từ khóa đang nằm ở danh mục khác sẽ được chuyển sang. Rút gọn từ khóa (ví dụ bỏ tên chi nhánh) để bắt được nhiều thông báo hơn.</small>
      <label>Lý do<textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} required minLength={3} /></label>
      {error && <div className="error-box" role="alert"><span>{error}</span></div>}
    </div>
    <div className="fm-modal-foot">
      <button type="button" className="btn" onClick={onClose} disabled={busy}>Hủy</button>
      {regression
        ? <button type="button" className="btn btn--primary" disabled={busy} onClick={() => { setBusy(true); void activate(regression.version, regression.expected, true).catch(e => setError(errorText(e))).finally(() => setBusy(false)); }}>Vẫn áp dụng</button>
        : <button className="btn btn--primary" disabled={busy || !doc.data}>{busy ? 'Đang áp dụng…' : 'Thêm và áp dụng'}</button>}
    </div>
  </form></DialogOverlay>;
}
