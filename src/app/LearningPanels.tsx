import { useState } from 'react';
import { fmtDate } from '../shared/format';
import { EmptyState, LoadingRows, PageError } from './Shared';
import { OffsetPager, SearchField } from './ui/ListControls';
import { useServerList } from './ui/useServerList';

/** Nhãn hiển thị cho giá trị API ("Học AI"); giá trị lạ được hiện nguyên văn thay vì bị giấu. */
const UNCLEAR_REASON: Record<string, string> = { low_confidence: 'AI không chắc', disagree: 'Luật và AI bất đồng', not_understood: 'Không hiểu' };
const UNCLEAR_STATUS: Record<string, string> = { pending: 'Chờ duyệt', rejected: 'Đã loại' };
const FEEDBACK_TYPE: Record<string, string> = { category_correction: 'Sửa danh mục', amount_correction: 'Sửa số tiền', not_a_transaction: 'Không phải giao dịch' };
const label = (map: Record<string, string>, value: string | null | undefined) => (value ? map[value] ?? value : '—');

type Unclear = { id: string; text: string; predicted_intent: string | null; predicted_confidence: number | null; unclear_reason: string; status: string; created_at: string };
type Feedback = { id: string; package_name: string; predicted_category: string | null; corrected_category: string | null; feedback_type: string; processed: boolean; created_at: string };

function Select({ title, value, onChange, options }: { title: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return <label>{title} <select value={value} onChange={e => onChange(e.target.value)}><option value="">Tất cả</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

/** Câu chat AI chưa hiểu: server tìm trong nội dung câu, lọc trạng thái và lý do, cắt trang (không tải hết rồi lọc ở trình duyệt). Chỉ xem: duyệt/loại câu đi qua scripts/nlu_candidates.py. */
export function UnclearPanel() {
  const [status, setStatus] = useState(''), [reason, setReason] = useState('');
  const list = useServerList<Unclear>('/admin/ai-learning/unclear', { searchParam: 'q', params: { status: status || undefined, reason: reason || undefined } });
  return <div className="fm-card">
    <PageError message={list.error}/>
    <div className="fm-toolbar fm-filter-bar">
      <SearchField value={list.search} onChange={list.setSearch} placeholder="Tìm trong nội dung câu"/>
      <Select title="Trạng thái" value={status} onChange={setStatus} options={UNCLEAR_STATUS}/>
      <Select title="Lý do" value={reason} onChange={setReason} options={UNCLEAR_REASON}/>
    </div>
    {list.loading ? <LoadingRows/> : list.rows.length
      ? <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Câu</th><th>AI đoán</th><th>Lý do</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
        {list.rows.map(row => <tr key={row.id}>
          <td>{row.text}</td>
          <td>{row.predicted_intent ?? '—'}{row.predicted_confidence != null && <small> {Math.round(row.predicted_confidence * 100)}%</small>}</td>
          <td>{label(UNCLEAR_REASON, row.unclear_reason)}</td>
          <td><span className={`fm-badge ${row.status === 'pending' ? '' : 'warn'}`}>{label(UNCLEAR_STATUS, row.status)}</span></td>
          <td>{fmtDate(row.created_at)}</td>
        </tr>)}</tbody></table></div>
      : <EmptyState message={list.search || status || reason ? 'Không có kết quả khớp' : 'Chưa có câu nào cần xem lại'}/>}
    <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/>
  </div>;
}

/** Phản hồi sửa kết quả AI của người dùng: server tìm theo gói ứng dụng hoặc danh mục, lọc loại phản hồi và đã/chưa dùng để học, cắt trang. Không có băm người dùng trong dữ liệu. */
export function FeedbackPanel() {
  const [type, setType] = useState(''), [processed, setProcessed] = useState('');
  const list = useServerList<Feedback>('/admin/ai-learning/feedback', { searchParam: 'q', params: { feedback_type: type || undefined, processed: processed || undefined } });
  return <div className="fm-card">
    <PageError message={list.error}/>
    <div className="fm-toolbar fm-filter-bar">
      <SearchField value={list.search} onChange={list.setSearch} placeholder="Gói ứng dụng hoặc danh mục"/>
      <Select title="Loại" value={type} onChange={setType} options={FEEDBACK_TYPE}/>
      <Select title="Đã dùng để học" value={processed} onChange={setProcessed} options={{ true: 'Đã dùng', false: 'Chưa dùng' }}/>
    </div>
    {list.loading ? <LoadingRows/> : list.rows.length
      ? <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Gói ứng dụng</th><th>Loại</th><th>AI đoán</th><th>Người dùng sửa thành</th><th>Đã dùng để học</th><th>Thời gian</th></tr></thead><tbody>
        {list.rows.map(row => <tr key={row.id}>
          <td>{row.package_name}</td>
          <td>{label(FEEDBACK_TYPE, row.feedback_type)}</td>
          <td>{row.predicted_category ?? '—'}</td>
          <td>{row.corrected_category ?? '—'}</td>
          <td>{row.processed ? 'Đã dùng' : 'Chưa'}</td>
          <td>{fmtDate(row.created_at)}</td>
        </tr>)}</tbody></table></div>
      : <EmptyState message={list.search || type || processed ? 'Không có kết quả khớp' : 'Chưa có phản hồi nào'}/>}
    <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/>
  </div>;
}
