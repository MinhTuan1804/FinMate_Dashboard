import type { ReactNode } from 'react';
import { EmptyState, LoadingRows, PageError } from '../Shared';
import { fmtDate } from '../../shared/format';

export function ResourceView({ loading, error, reload, hasData = false, empty = false, filtered = false, children }: {
  loading: boolean; error: string; reload: () => void; hasData?: boolean; empty?: boolean; filtered?: boolean; children: ReactNode;
}) {
  if (loading && !hasData) return <LoadingRows/>;
  return <><PageError message={error} retry={reload}/>{error && hasData && <p className="fm-hint" role="status">Chưa cập nhật được. Đang hiển thị dữ liệu lần tải trước.</p>}
    {(!error || hasData) && (empty ? <EmptyState message={filtered ? 'Không có kết quả khớp bộ lọc' : 'Chưa có dữ liệu'}/> : children)}</>;
}
export function RefreshBar({ refreshing, updatedAt, reload }: { refreshing: boolean; updatedAt: number; reload: () => void }) {
  return <div className="fm-toolbar fm-refresh"><small>{updatedAt ? `Cập nhật: ${fmtDate(updatedAt)}` : 'Chưa tải dữ liệu'}</small><button className="btn btn--small" disabled={refreshing} onClick={reload}>{refreshing ? 'Đang tải…' : 'Làm mới'}</button></div>;
}
