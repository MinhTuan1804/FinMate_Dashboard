import type { ReactNode } from 'react';
import type { AuditLog } from '../../shared/models';
import { ROLE_LABEL } from '../../shared/api';
import { fmtDate, showIp } from '../../shared/format';
import { Facts } from '../modules/ModuleParts';
import { ReadableValue } from './JsonReview';

/** Che các khóa có thể chứa dữ liệu nhạy cảm trước khi hiện metadata (mật khẩu, token, số tiền, nội dung thông báo, email). */
function safeMetadata(raw: string | null): unknown {
  if (!raw) return null;
  try {
    const secret = /password|token|secret|amount|notification|body|text|email/i;
    return JSON.parse(raw, (key, value) => (key && secret.test(key) ? '[Đã che]' : value));
  } catch {
    return 'Không đọc được thông tin chi tiết.';
  }
}

/** Tên người thực hiện kèm vai trò; dòng không gắn người nào là thao tác của hệ thống. */
export function AuditActor({ log }: { log: AuditLog }): ReactNode {
  if (!log.userId) return <span className="cell-muted">Hệ thống</span>;
  if (!log.actorName) return <span className="cell-muted">Tài khoản đã xóa</span>;
  return <span className="audit-actor"><strong>{log.actorName}</strong><small>{log.actorRole ? ROLE_LABEL[log.actorRole] ?? log.actorRole : ''}{log.actorEmail ? ` · ${log.actorEmail}` : ''}</small></span>;
}


/** Nội dung hộp chi tiết: ai, lúc nào, từ đâu, làm gì; mã kỹ thuật để đối chiếu nằm cuối. */
export function AuditDetail({ log }: { log: AuditLog }) {
  const detail = safeMetadata(log.metadata);
  return <div className="module-detail">
    <Facts items={[
      ['Hoạt động', log.title || 'Hoạt động khác'],
      ['Người thực hiện', <AuditActor key="actor" log={log} />],
      ['Thời gian', fmtDate(log.createdAt)],
      ['Địa chỉ IP', showIp(log.ipAddress)],
    ]} />
    {detail != null && <><h3>Chi tiết thay đổi</h3><ReadableValue value={detail} /></>}
    <details className="technical-details"><summary>Mã để đối chiếu</summary><Facts items={[['Mã sự kiện', log.eventType], ['Mã người thực hiện', log.userId || '—'], ['Mã dòng nhật ký', log.id]]} /></details>
  </div>;
}
