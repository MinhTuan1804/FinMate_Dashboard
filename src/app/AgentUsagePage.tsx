import { NavLink } from 'react-router-dom';
import { fmtDay } from '../shared/format';
import { EmptyState, LoadingRows, PageError, PageHeader } from './Shared';
import { useResource } from './ui/useResource';
import { useUrlState } from './ui/useUrlState';

type Tokens = { input_tokens: number; output_tokens: number; cost_usd: number | null };
type Usage = {
  days: number; model: string; provider: string;
  cost: { priced: boolean; input_usd_per_million: number | null; output_usd_per_million: number | null };
  total: Tokens & { runs: number };
  by_step: (Tokens & { step: string; rows: number })[];
  by_day: (Tokens & { day: string; runs: number })[];
};

const DAYS = ['7', '30', '90'];
const STEP: Record<string, string> = { gate: 'Cổng phạm vi (không gọi LLM)', plan: 'Lập kế hoạch', compose: 'Viết câu trả lời' };
const num = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const usd = (value: number | null) => (value == null ? '—' : `$${value.toFixed(4)}`);

/**
 * Token và chi phí ước tính của trợ lý tài chính (bảng agent_runs ở AI Service). Chi phí = token × giá của mô hình đang dùng, giá do admin nhập ở Cấu hình hệ thống
 * (Trợ lý tư vấn tài chính); chưa có giá thì chỉ hiện token. Chỉ tính các lượt hỏi trợ lý, chưa tính các chỗ khác gọi LLM (chat sửa chính tả, gợi ý phương pháp, tin thị trường).
 */
export function AgentUsagePage() {
  const [days, setDays] = useUrlState('days', '30');
  const usage = useResource<Usage>('/admin/agent-usage/summary', { days });
  const data = usage.data;
  return <>
    <PageHeader title="Token và chi phí AI" description="Trợ lý tài chính đã dùng bao nhiêu token và tốn khoảng bao nhiêu tiền trong khoảng thời gian chọn."/>
    <PageError message={usage.error} retry={usage.reload}/>
    <div className="fm-toolbar fm-filter-bar">
      <label>Khoảng thời gian <select value={DAYS.includes(days) ? days : '30'} onChange={e => setDays(e.target.value)}>{DAYS.map(d => <option key={d} value={d}>{d} ngày gần nhất</option>)}</select></label>
    </div>
    {usage.loading ? <LoadingRows/> : !data ? null : <>
      {!data.cost.priced && <div className="fm-hint" role="status">Chưa có giá cho mô hình <strong>{data.model}</strong>, nên chưa tính được tiền. Nhập giá token vào và ra (USD cho 1 triệu token) ở <NavLink to="/settings/system">Cấu hình hệ thống</NavLink>, mục Trợ lý tư vấn tài chính.</div>}
      <div className="fm-stats">
        <div className="fm-stat"><span>Lượt hỏi trợ lý</span><strong>{num(data.total.runs)}</strong></div>
        <div className="fm-stat"><span>Token vào</span><strong>{num(data.total.input_tokens)}</strong></div>
        <div className="fm-stat"><span>Token ra</span><strong>{num(data.total.output_tokens)}</strong></div>
        <div className="fm-stat"><span>Chi phí ước tính</span><strong>{usd(data.total.cost_usd)}</strong></div>
      </div>
      <p className="fm-hint">Mô hình đang dùng: {data.provider} / {data.model}. Chi phí là ước tính: giá của mô hình hiện tại áp cho cả khoảng, và chỉ tính các lượt hỏi trợ lý.</p>
      <div className="fm-card"><h2>Theo ngày</h2>
        {data.by_day.length ? <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Ngày (UTC)</th><th>Lượt hỏi</th><th>Token vào</th><th>Token ra</th><th>Chi phí ước tính</th></tr></thead><tbody>
          {data.by_day.map(row => <tr key={row.day}><td>{fmtDay(row.day)}</td><td>{num(row.runs)}</td><td>{num(row.input_tokens)}</td><td>{num(row.output_tokens)}</td><td>{usd(row.cost_usd)}</td></tr>)}</tbody></table></div>
          : <EmptyState message="Chưa có lượt hỏi nào trong khoảng này"/>}
      </div>
      <div className="fm-card"><h2>Theo bước</h2><div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Bước</th><th>Token vào</th><th>Token ra</th><th>Chi phí ước tính</th></tr></thead><tbody>
          {data.by_step.map(row => <tr key={row.step}><td>{STEP[row.step] ?? row.step}</td><td>{num(row.input_tokens)}</td><td>{num(row.output_tokens)}</td><td>{usd(row.cost_usd)}</td></tr>)}
          {data.by_step.length === 0 && <tr><td colSpan={4}>Chưa có dữ liệu.</td></tr>}</tbody></table></div></div>
    </>}
  </>;
}
