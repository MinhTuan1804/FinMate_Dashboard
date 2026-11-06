import { Distribution } from '../ui/Distribution';
import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../../shared/api';
import type { AiStats } from '../../shared/models';
import { LoadingRows, PageError, PageHeader } from '../Shared';
import { list } from './opsApi';
import { Stat } from './OpsParts';

/** Thống kê AI chỉ đọc (`/ops/ai-stats`), cùng số liệu với Dashboard của Admin. */
export function OpsAiStatsPage() {
  const [days, setDays] = useState('7'), [stats, setStats] = useState<AiStats | null>(null), [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const now = Date.now(); setStats(await list<AiStats>('/ops/ai-stats', { from: new Date(now - Number(days) * 86400000).toISOString(), to: new Date(now).toISOString() })); setError(''); }
    catch (e) { setError(errorText(e)); }
  }, [days]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const p = stats?.production;
  return <>
    <PageHeader title="Thống kê AI" description="Chất lượng phân tích thông báo ngân hàng và phản hồi của người dùng (chỉ đọc)." action={<label>Khoảng ngày<select value={days} onChange={e => setDays(e.target.value)}><option value="1">Hôm nay</option><option value="7">7 ngày</option><option value="30">30 ngày</option></select></label>}/>
    <PageError message={error} retry={() => void load()}/>
    {!stats ? (!error && <LoadingRows/>) : <>
      <div className="fm-stats">
        <Stat label="Đã phân tích" value={p?.totalAnalyzed ?? '—'}/>
        <Stat label="Bản nháp đã tạo" value={p?.draftsCreated ?? '—'}/>
        <Stat label="Bản nháp xác nhận" value={p?.draftsConfirmed ?? '—'}/>
        <Stat label="Tỉ lệ xác nhận" value={p?.draftConfirmRate == null ? '—' : `${(p.draftConfirmRate * 100).toFixed(1)}%`}/>
        <Stat label="Độ trễ trung bình" value={p?.avgProcessingMs == null ? '—' : `${Math.round(p.avgProcessingMs)} ms`}/>
        <Stat label="Phản hồi chờ xử lý" value={stats.aiService?.pendingFeedbackCount ?? '—'}/>
      </div>
      <div className="fm-grid"><Distribution title="Kết quả xử lý" values={p?.byPipelineResult||{}}/><Distribution title="Theo nguồn thông báo" values={p?.byPackageName||{}}/></div>
      {stats.aiServiceError && <PageError message={stats.aiServiceError}/>}
    </>}
  </>;
}
