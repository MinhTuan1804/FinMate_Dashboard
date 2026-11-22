import { useUrlState } from './ui/useUrlState';
import { fmtDate } from '../shared/format';
import { EmptyState, LoadingRows, PageError } from './Shared';
import { OffsetPager, SearchField } from './ui/ListControls';
import { useServerList } from './ui/useServerList';

/** Nhãn hiển thị cho giá trị API ("Học AI"); giá trị lạ được hiện nguyên văn thay vì bị giấu. */
const FEEDBACK_TYPE: Record<string, string> = { category_correction: 'Sửa danh mục', amount_correction: 'Sửa số tiền', not_a_transaction: 'Không phải giao dịch' };
const label = (map: Record<string, string>, value: string | null | undefined) => (value ? map[value] ?? value : '—');

type Feedback = { id: string; package_name: string; predicted_category: string | null; corrected_category: string | null; feedback_type: string; processed: boolean; created_at: string };

function Select({ title, value, onChange, options }: { title: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return <label>{title} <select value={value} onChange={e => onChange(e.target.value)}><option value="">Tất cả</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

/** Phản hồi sửa kết quả AI của người dùng: server tìm theo gói ứng dụng hoặc danh mục, lọc loại phản hồi và đã/chưa dùng để học, cắt trang. Không có băm người dùng trong dữ liệu. */
export function FeedbackPanel() {
  const [type, setType] = useUrlState('feedback_type'), [processed, setProcessed] = useUrlState('processed');
  const list = useServerList<Feedback>('/admin/ai-learning/feedback', { searchParam: 'q', params: { feedback_type: type || undefined, processed: processed || undefined } });
  return <div className="fm-card">
    <PageError message={list.error} retry={list.reload}/>
    <div className="fm-toolbar fm-filter-bar">
      <SearchField value={list.search} onChange={list.setSearch} placeholder="Gói ứng dụng hoặc danh mục"/>
      <Select title="Loại" value={type} onChange={setType} options={FEEDBACK_TYPE}/>
      <Select title="Đã dùng để học" value={processed} onChange={setProcessed} options={{ true: 'Đã dùng', false: 'Chưa dùng' }}/>
    </div>
    {list.loading ? <LoadingRows/> : list.error ? null : list.rows.length
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
    {!list.error && <OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/>}
  </div>;
}
