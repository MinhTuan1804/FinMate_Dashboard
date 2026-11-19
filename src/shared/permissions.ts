export const CAPABILITY_LABEL: Record<string, string> = {
  HandleTickets:'Xử lý ca hỗ trợ', AccessCustomerData:'Xin và xem dữ liệu khách theo sự đồng ý của khách', CreateDraftTransactions:'Tạo giao dịch nháp hỗ trợ',
  EmergencyLock:'Khóa tài khoản khẩn cấp', ProposeApprovals:'Tạo đề xuất', ManageTickets:'Điều phối ca hỗ trợ', DecideApprovals:'Duyệt đề xuất',
  ViewDashboard:'Xem tổng quan vận hành', ManageCannedReplies:'Quản lý câu trả lời mẫu', ViewOpsAudit:'Xem nhật ký vận hành', ViewAiStats:'Xem thống kê AI',
  ManageSystem:'Quản trị hệ thống và xuất bản pháp lý (Quản trị viên)', ViewMonitoring:'Xem giám sát và độ chính xác dự báo', ManageIncidents:'Xử lý sự cố',
  ModerateCommunity:'Kiểm duyệt ảnh, báo cáo và nội dung cộng đồng', MuteCommunityAuthors:'Tạm cấm tác giả theo nội dung',
  ManageSubscriptionPlans:'Quản lý gói và xem đơn đăng ký (Quản lý vận hành trở lên)', ManageLegalDocuments:'Soạn nháp và xem lịch sử pháp lý',
};
export function hasAny(caps: string[], required: string | string[]): boolean { return (Array.isArray(required) ? required : [required]).some(c => caps.includes(c)); }
export function homeFor(role: string, caps: string[]): string {
  if (role === 'Admin') return '/';
  const pages = [['ViewDashboard','/ops/dashboard'],['HandleTickets','/ops/tickets'],['ModerateCommunity','/ops/community'],['ManageLegalDocuments','/ops/legal']];
  return pages.find(([cap]) => caps.includes(cap))?.[1] || '/profile';
}
