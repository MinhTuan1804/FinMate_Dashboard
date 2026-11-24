import type { ReactNode } from 'react';
import type { AuditLog } from '../../shared/models';
import { AuditActor } from './AuditParts';
import { showIp } from '../../shared/format';

/** Cột chung cho bảng nhật ký quản trị và nhật ký vận hành. */
export const auditColumns: { key: string; label: string; render?: (row: AuditLog) => ReactNode }[] = [
  { key: 'createdAt', label: 'Thời gian' },
  { key: 'actorName', label: 'Người thực hiện', render: row => <AuditActor log={row} /> },
  { key: 'title', label: 'Hoạt động', render: row => row.title || 'Hoạt động khác' },
  { key: 'ipAddress', label: 'Địa chỉ IP', render: row => row.ipAddress ? <code>{showIp(row.ipAddress)}</code> : <span className="cell-muted">—</span> },
];
