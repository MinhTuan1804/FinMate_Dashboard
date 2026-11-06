// Kiểu và hàm gọi API /api/v1/ops/*. Khớp DTO backend (FinMate.Application.Support / Ops / Monitoring); enum đi dưới dạng chuỗi.
import axios from 'axios';
import { api, getData, getEnvelope } from '../../shared/api';

export const STATUSES = ['New', 'InProgress', 'WaitingCustomer', 'Escalated', 'Resolved', 'Closed'] as const;
export const PRIORITIES = ['P1', 'P2', 'P3'] as const;
export const CATEGORIES = ['Security', 'Account', 'Transaction', 'Receipt', 'Notification', 'Group', 'Question'] as const;
export const SETTABLE_STATUSES = ['InProgress', 'WaitingCustomer', 'Resolved', 'Closed'] as const;
export const SCOPES = ['Accounts', 'Transactions', 'Budgets', 'Draft'] as const;
export const APPROVAL_TYPES = ['UnlockUser', 'CancelDeletion', 'TransferGroupOwner'] as const;
export type Scope = (typeof SCOPES)[number];
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const STATUS_LABEL: Record<string, string> = { New: 'Mới', InProgress: 'Đang xử lý', WaitingCustomer: 'Chờ khách', Escalated: 'Chuyển cấp', Resolved: 'Đã giải quyết', Closed: 'Đã đóng' };
export const CATEGORY_LABEL: Record<string, string> = { Security: 'Bảo mật', Account: 'Tài khoản', Transaction: 'Giao dịch', Receipt: 'Hóa đơn', Notification: 'Thông báo', Group: 'Nhóm', Question: 'Câu hỏi' };
export const SCOPE_LABEL: Record<string, string> = { Accounts: 'Ví và số dư', Transactions: 'Giao dịch', Budgets: 'Ngân sách', Draft: 'Tạo giao dịch nháp' };
export const APPROVAL_TYPE_LABEL: Record<string, string> = { UnlockUser: 'Mở khóa khách', CancelDeletion: 'Hủy yêu cầu xóa', TransferGroupOwner: 'Chuyển chủ nhóm' };
export const APPROVAL_STATUS_LABEL: Record<string, string> = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Failed: 'Thất bại' };
export const SEVERITY_LABEL: Record<string, string> = { Normal: 'Thường', High: 'Cao', Critical: 'Nghiêm trọng' };
export const INCIDENT_STATUS_LABEL: Record<string, string> = { Open: 'Đang mở', Acknowledged: 'Đã nhận', Resolved: 'Đã đóng' };
export const SERVICE_STATE_LABEL: Record<string, string> = { Healthy: 'Tốt', Unhealthy: 'Lỗi', Disabled: 'Tắt', Unknown: 'Chưa rõ' };

export type Ticket = {
  id: string; requesterUserId: string; requesterName: string | null; assigneeUserId: string | null; assigneeName: string | null; parentTicketId: string | null;
  category: string; priority: string; status: string; subject: string; firstResponseDueAt: string; resolveDueAt: string; firstRespondedAt: string | null;
  firstResponseOverdue: boolean; resolutionOverdue: boolean; rating: number | null; createdAt: string; updatedAt: string; resolvedAt: string | null; closedAt: string | null;
};
export type Attachment = { id: string; contentType: string; sizeBytes: number; createdAt: string };
export type Message = { id: string; kind: string; authorUserId: string | null; authorName: string | null; body: string; createdAt: string; attachments: Attachment[] };
export type TicketDetail = { ticket: Ticket; messages: Message[] };
export type TicketPage = { items: Ticket[]; total: number; offset: number; limit: number };
export type TicketQuery = { status?: string; priority?: string; category?: string; assignee?: string; overdue?: boolean; search?: string; offset: number; limit: number };

export type AccessRequest = {
  id: string; ticketId: string; scopes: string[]; reason: string; status: string; financialAccountId: string | null;
  createdAt: string; requestExpiresAt: string; decidedAt: string | null; expiresAt: string | null; revokedAt: string | null;
};
export type CustomerAccount = { id: string; accountName: string; accountType: string; balanceCents: number; isMonitored: boolean };
export type CustomerTransaction = { id: string; financialAccountId: string; amountCents: number; transactionType: string; source: string; status: string; categoryName: string | null; merchantName: string | null; description: string | null; transactedAt: string };
export type CustomerTransactionPage = { items: CustomerTransaction[]; nextCursor: string | null };
export type CustomerBudget = { id: string; categoryName: string | null; limitCents: number; spentCents: number; periodType: string };

export type Approval = {
  id: string; type: string; targetId: string; newOwnerUserId: string | null; ticketId: string | null; reason: string; requestedByUserId: string | null; status: string; expired: boolean;
  decidedByUserId: string | null; decidedAt: string | null; decisionNote: string | null; failureCode: string | null; expiresAt: string; createdAt: string;
};
export type CannedReply = { id: string; title: string; body: string; isActive: boolean; updatedAt: string };

export type Count = { key: string; count: number };
export type AssigneeLoad = { userId: string; displayName: string | null; openCount: number; overdueCount: number };
export type Dashboard = {
  openByStatus: Count[]; openByPriority: Count[]; unassigned: number; overdue: number; load: AssigneeLoad[]; recentDays: number; recentCount: number; recentByCategory: Count[];
  firstResponseOnTimeRate: number | null; resolvedOnTimeRate: number | null; ratingCount: number; averageRating: number | null; pendingApprovals: number;
};

export type ServiceStatus = { service: string; state: string; consecutiveFailures: number; lastCheckedAt: string; lastHealthyAt: string | null };
export type MonitoringStatus = { services: ServiceStatus[]; activeIncidents: number };
export type Incident = {
  id: string; source: string; service: string; severity: string; status: string; title: string; impact: string; technicalDetail: string | null; occurrenceCount: number;
  firstSeenAt: string; lastSeenAt: string; acknowledgedByUserId: string | null;
};
export type IncidentPage = { items: Incident[]; total: number; offset: number; limit: number };
export type OcrWindow = { hours: number; total: number; success: number; noAmount: number; unreadable: number; googleVision: number; local: number; unknownEngine: number; readableRate: number | null; localRate: number | null };
export type OcrStats = { last24Hours: OcrWindow; last7Days: OcrWindow };

const clean = (params: Record<string, unknown>) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false));

export const queue = (q: TicketQuery) => getData<TicketPage>('/ops/tickets', clean(q));
export const ticket = (id: string) => getData<TicketDetail>(`/ops/tickets/${id}`);
export const list = <T>(path: string, params: Record<string, unknown> = {}) => getData<T>(path, clean(params));
export const post = async <T>(url: string, body?: unknown) => (await api.post<{ data: T }>(url, body)).data.data;
export const patch = async <T>(url: string, body: unknown) => (await api.patch<{ data: T }>(url, body)).data.data;
export const del = async <T>(url: string) => (await api.delete<{ data: T }>(url)).data.data;
export { getEnvelope };

/** Mã lỗi nghiệp vụ backend trả về (error.code), để phân biệt 409/422 cụ thể. */
export function errorCode(e: unknown): string | undefined {
  return axios.isAxiosError(e) ? (e.response?.data?.error?.code as string | undefined) : undefined;
}
export const httpStatus = (e: unknown) => (axios.isAxiosError(e) ? e.response?.status : undefined);

export const fmtDateTime = (v: string | null | undefined) => (v ? new Date(v).toLocaleString('vi-VN', { hour12: false }) : '—');
export const fmtVnd = (cents: number) => `${new Intl.NumberFormat('vi-VN').format(cents)} ₫`;   // tiền là BIGINT đồng (VND), không chia 100
export const fmtRate = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

/** Còn bao lâu đến hạn, hoặc trễ bao lâu. */
export function dueText(due: string, overdue: boolean, done: boolean): string {
  const mins = Math.round((new Date(due).getTime() - Date.now()) / 60000);
  if (done && !overdue) return 'Đúng hạn';
  const abs = Math.abs(mins);
  const span = abs >= 1440 ? `${Math.floor(abs / 1440)} ngày` : abs >= 60 ? `${Math.floor(abs / 60)} giờ` : `${abs} phút`;
  return overdue ? `Trễ ${span}` : `Còn ${span}`;
}
