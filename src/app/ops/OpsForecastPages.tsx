import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../../shared/api';
import { EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { OffsetPager } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { fmtDateTime, fmtVnd, list, patch } from './opsApi';
import { SelectFilter, Stat } from './OpsParts';

const REASON_LABEL: Record<string, string> = { balance_wrong: 'Số dư sai', missing_bill: 'Thiếu khoản phải trả', wrong_bill: 'Khoản phải trả sai', unusual_spending: 'Chi tiêu bất thường', other: 'Lý do khác' };
const CAUSE_LABEL: Record<string, string> = { data_missing: 'Thiếu dữ liệu', recurring_misread: 'Đọc sai khoản định kỳ', one_off: 'Khoản chi một lần', model_issue: 'Lỗi mô hình', other: 'Khác' };

type Feedback = {
  id: string; createdAt: string; reason: string; note: string | null; status: string; cause: string | null;
  snapshot: { originDate: string; horizonDays: number; predictedCents: number; conservativeCents: number; optimisticCents: number; actualCents: number | null; confidence: string; method: string } | null;
};
type Row = { horizonDays: number; confidence: string; samples: number; maeCents: number; medianAbsErrorCents: number; maeRecurringOnlyCents: number; maeHoldCents: number; coveragePercent: number | null; meanBandWidthCents: number; ratioVsHold: number | null; ratioVsRecurringOnly: number | null };
type Count = { key: string; count: number };
type Report = { windowDays: number; from: string; to: string; method: string; snapshotsFilled: number; snapshotsPending: number; rows: Row[]; feedbackTotal: number; feedbackNew: number; feedbackByReason: Count[]; feedbackByCause: Count[] };

/** Phản hồi "dự báo sai" cho Staff: chỉ thấy con số của bản chụp, không thấy ai là người dùng; gán nguyên nhân để Manager biết lỗi nằm ở đâu. */
export function OpsForecastFeedbackPage() {
  const [status, setStatus] = useState(''), [busyId, setBusyId] = useState(''), [actionError, setActionError] = useState('');
  const feedback = useServerList<Feedback>('/ops/forecast/feedback', { params: { status: status || undefined }, limit: 20 });

  async function label(id: string, cause: string) {
    if (!cause) return;
    setBusyId(id);
    try { await patch(`/ops/forecast/feedback/${id}`, { cause }); setActionError(''); feedback.reload(); }
    catch (e) { setActionError(errorText(e)); }
    finally { setBusyId(''); }
  }

  return <>
    <PageHeader title="Phản hồi dự báo" description="Người dùng báo dự báo sai. Chọn nguyên nhân để quản lý thấy lỗi tập trung ở dữ liệu thiếu hay ở mô hình. Danh tính người dùng được ẩn."/>
    <PageError message={actionError || feedback.error} retry={feedback.reload}/>
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar"><SelectFilter label="Trạng thái" value={status} onChange={setStatus} options={[['new', 'Chưa xử lý'], ['labeled', 'Đã gán nguyên nhân']]}/></div>
      {feedback.loading && feedback.rows.length === 0 ? <LoadingRows/> : feedback.rows.length === 0 ? <EmptyState message="Chưa có phản hồi nào"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Lúc</th><th>Lý do</th><th>Lời nhắn</th><th>Dự báo</th><th>Thực tế</th><th>Nguyên nhân</th></tr></thead><tbody>
          {feedback.rows.map(f => <tr key={f.id}>
            <td>{fmtDateTime(f.createdAt)}</td>
            <td>{REASON_LABEL[f.reason] ?? f.reason}</td>
            <td>{f.note ?? '—'}</td>
            <td>{f.snapshot ? <>{fmtVnd(f.snapshot.predictedCents)}<br/><small className="fm-hint">sau {f.snapshot.horizonDays} ngày, dải {fmtVnd(f.snapshot.conservativeCents)} – {fmtVnd(f.snapshot.optimisticCents)}</small></> : '—'}</td>
            <td>{f.snapshot?.actualCents == null ? <small className="fm-hint">chưa tới ngày</small> : fmtVnd(f.snapshot.actualCents)}</td>
            <td><select aria-label="Nguyên nhân" disabled={busyId === f.id} value={f.cause ?? ''} onChange={e => void label(f.id, e.target.value)}>
              <option value="">Chọn nguyên nhân</option>{Object.entries(CAUSE_LABEL).map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select></td>
          </tr>)}
        </tbody></table></div>}
      <OffsetPager offset={feedback.offset} limit={feedback.limit} total={feedback.total} onChange={feedback.setOffset}/>
    </div>
  </>;
}

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);
const ratio = (v: number | null) => (v === null ? '—' : v.toFixed(2));

/** Độ chính xác dự báo cho Manager: lệch bao nhiêu đồng so với số dư thật, so với hai mốc đơn giản, và dải có phủ đúng không. */
export function OpsForecastAccuracyPage() {
  const [days, setDays] = useState('30'), [report, setReport] = useState<Report | null>(null), [error, setError] = useState('');
  const load = useCallback(async () => { try { setReport(await list<Report>('/ops/forecast/accuracy', { windowDays: days })); setError(''); } catch (e) { setError(errorText(e)); } }, [days]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const rows = report?.rows.filter(r => r.confidence === 'all') ?? [], lowRows = report?.rows.filter(r => r.confidence === 'low') ?? [];

  return <>
    <PageHeader title="Độ chính xác dự báo" description="Mỗi đêm hệ thống chụp dự báo 7, 14, 30 ngày; tới ngày thì so với số dư thật. Tỉ lệ nhỏ hơn 1 nghĩa là dự báo hơn mốc so sánh."
      action={<label>Khoảng ngày<select value={days} onChange={e => setDays(e.target.value)}>{['7', '30', '90', '180'].map(d => <option key={d} value={d}>{d} ngày</option>)}</select></label>}/>
    <PageError message={error} retry={() => void load()}/>
    {!report ? (!error && <LoadingRows/>) : <>
      <div className="fm-stats">
        <Stat label="Đã có số thực tế" value={report.snapshotsFilled}/>
        <Stat label="Còn chờ tới ngày" value={report.snapshotsPending}/>
        <Stat label="Phản hồi dự báo sai" value={report.feedbackTotal}/>
        <Stat label="Chưa xử lý" value={report.feedbackNew} tone={report.feedbackNew > 0 ? 'bad' : undefined}/>
      </div>
      <div className="fm-card">
        <h2>Sai số theo mốc nhìn trước</h2>
        {rows.length === 0 ? <EmptyState message="Chưa đủ dữ liệu: bản chụp đầu tiên cần 7 ngày mới có số thực tế"/> :
          <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Mốc</th><th>Mẫu</th><th>Lệch trung bình</th><th>Lệch trung vị</th><th>So với "số dư không đổi"</th><th>So với "chỉ khoản định kỳ"</th><th>Dải phủ đúng</th><th>Độ rộng dải</th></tr></thead><tbody>
            {rows.map(r => <tr key={r.horizonDays}><td>{r.horizonDays} ngày</td><td>{r.samples}</td><td>{fmtVnd(r.maeCents)}</td><td>{fmtVnd(r.medianAbsErrorCents)}</td>
              <td>{ratio(r.ratioVsHold)}</td><td>{ratio(r.ratioVsRecurringOnly)}</td><td>{pct(r.coveragePercent)}</td><td>{fmtVnd(r.meanBandWidthCents)}</td></tr>)}
          </tbody></table></div>}
        <small className="fm-hint">Dải đúng nghĩa P25–P75 thì phải phủ gần 50%. Phủ cao hơn nhiều nghĩa là dải quá rộng, ít giúp người dùng.</small>
        {lowRows.length > 0 && <p className="fm-hint">Nhóm ít dữ liệu: {lowRows.map(r => `${r.horizonDays} ngày lệch ${fmtVnd(r.maeCents)} (${r.samples} mẫu)`).join('; ')}.</p>}
      </div>
      <div className="fm-grid">
        <CountCard title="Phản hồi theo lý do" counts={report.feedbackByReason} labels={REASON_LABEL}/>
        <CountCard title="Nguyên nhân Staff đã gán" counts={report.feedbackByCause} labels={CAUSE_LABEL}/>
      </div>
    </>}
  </>;
}

function CountCard({ title, counts, labels }: { title: string; counts: Count[]; labels: Record<string, string> }) {
  return <div className="fm-card"><h2>{title}</h2>{counts.length === 0 ? <EmptyState message="Chưa có"/> :
    <table className="fm-table"><tbody>{counts.map(c => <tr key={c.key}><td>{labels[c.key] ?? c.key}</td><td>{c.count}</td></tr>)}</tbody></table>}</div>;
}
