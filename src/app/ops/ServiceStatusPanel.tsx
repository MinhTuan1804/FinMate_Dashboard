import { serviceLabel } from '../../shared/presentation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText, type Envelope } from '../../shared/api';
import { EmptyState, LoadingRows, PageError } from '../Shared';
import { SERVICE_STATE_LABEL, fmtDateTime, type MonitoringStatus } from './opsApi';

const TONE: Record<string, string> = { Healthy: 'good', Unhealthy: 'bad', Disabled: '', Unknown: 'warn' };

/** Read-only monitoring shared by Home, system settings and Ops. */
export function ServiceStatusPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<MonitoringStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const lifetime = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    const current = ++request.current;
    const signal = lifetime.current?.signal;
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Envelope<MonitoringStatus>>('/ops/monitoring/status', { signal });
      if (!response.data.success) throw new Error(response.data.error?.message || 'Không tải được trạng thái dịch vụ');
      if (!signal?.aborted && request.current === current) setData(response.data.data);
    } catch (failure) {
      if (!signal?.aborted && request.current === current) setError(errorText(failure));
    } finally {
      if (!signal?.aborted && request.current === current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    queueMicrotask(() => { if (!controller.signal.aborted) void load(); });
    return () => controller.abort();
  }, [load]);

  return <section className={`service-status ${compact ? 'fm-card service-status--compact' : ''}`} aria-label="Trạng thái dịch vụ" aria-busy={loading}>
    <div className="fm-toolbar"><h2>Trạng thái dịch vụ</h2><button className="btn btn--small" disabled={loading} onClick={() => void load()}>{loading ? 'Đang cập nhật…' : 'Làm mới trạng thái'}</button></div>
    <PageError message={error} retry={() => void load()}/>
    {loading && !data ? <LoadingRows/> : data ? <>
      <p>Sự cố đang mở: <strong>{data.activeIncidents}</strong>{error && ' · Chưa cập nhật được, đang hiển thị dữ liệu lần tải trước.'}</p>
      {data.services.length ? <div className={compact ? undefined : 'service-grid'}>{data.services.map(service =>
        <article key={service.service} className={compact ? 'fm-list-row' : 'service-card'}>
          <h3>{serviceLabel(service.service)}</h3>
          <span className={`fm-badge ${TONE[service.state] ?? ''}`}><span className="status-dot"/>{SERVICE_STATE_LABEL[service.state] ?? service.state}</span>
          {!compact && <strong>{service.consecutiveFailures} lỗi liên tiếp</strong>}
          <small>Kiểm tra: {fmtDateTime(service.lastCheckedAt)}</small>
          {!compact && <small>Tốt gần nhất: {fmtDateTime(service.lastHealthyAt)}</small>}
        </article>)}</div> : <EmptyState message="Chưa có kết quả kiểm tra dịch vụ"/>}
      <p className="fm-hint">Dịch vụ tắt hoặc chưa rõ chưa được tính là sự cố.</p>
      {compact && <Link to="/ops/monitoring">Xem giám sát và sự cố →</Link>}
    </> : null}
  </section>;
}
