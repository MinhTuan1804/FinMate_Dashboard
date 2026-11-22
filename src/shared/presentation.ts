/** Display labels only; original identifiers remain unchanged in requests and exports. */
export const serviceLabels: Record<string, string> = {
  backend: 'Hệ thống FinMate', 'ai-service': 'Phân tích AI', ai_service: 'Phân tích AI',
  ocr_service: 'Đọc hóa đơn', stt_service: 'Nhận dạng giọng nói', redis: 'Bộ nhớ tạm',
  brevo: 'Gửi email', fcm: 'Thông báo đẩy', gemini: 'Gemini', gemini_backup: 'Gemini dự phòng',
  google_vision: 'Đọc ảnh Google Vision', market_data: 'Dữ liệu thị trường', sepay: 'Thanh toán SePay',
};
export const serviceLabel = (value: string) => serviceLabels[value] || value;

const eventWords: Record<string, string> = {
  Auth: 'Xác thực', Login: 'Đăng nhập', Logout: 'Đăng xuất', Success: 'thành công', Failure: 'không thành công', Failed: 'không thành công',
  Ops: 'Vận hành', Admin: 'Quản trị', User: 'Người dùng', Users: 'Người dùng', Role: 'Vai trò', Roles: 'Vai trò',
  Create: 'Tạo mới', Created: 'Đã tạo', Update: 'Cập nhật', Updated: 'Đã cập nhật', Delete: 'Xóa', Deleted: 'Đã xóa',
  Lock: 'Khóa tài khoản', Locked: 'Đã khóa tài khoản', Unlock: 'Mở khóa tài khoản', Unlocked: 'Đã mở khóa tài khoản',
  Ticket: 'Ca hỗ trợ', Tickets: 'Ca hỗ trợ', Approval: 'Đề xuất', Approvals: 'Đề xuất',
  Approve: 'Duyệt', Approved: 'Đã duyệt', Reject: 'Từ chối', Rejected: 'Đã từ chối',
  View: 'Xem', Viewed: 'Đã xem', Read: 'Xem', Access: 'Truy cập', Export: 'Xuất dữ liệu',
  Config: 'Cấu hình', SystemConfig: 'Cấu hình hệ thống', Activate: 'Áp dụng', Activated: 'Đã áp dụng',
  Assign: 'Phân công', Assigned: 'Đã phân công', Resolve: 'Giải quyết', Resolved: 'Đã giải quyết',
  Community: 'Cộng đồng', Profile: 'Hồ sơ', Password: 'Mật khẩu', Change: 'Thay đổi', Changed: 'Đã thay đổi',
  Consent: 'Đồng ý truy cập', Data: 'Dữ liệu', CustomerData: 'Dữ liệu khách hàng',
  AiConfig:'Cấu hình AI', AiRule:'Quy tắc AI', Assumption:'Giả định kinh tế', Category:'Danh mục',
  DataDeletionRequest:'Yêu cầu xóa dữ liệu', EconomicFeed:'Nguồn số liệu kinh tế', FinanceMethod:'Phương pháp tài chính',
  FuelPrice:'Giá xăng', GoalTemplate:'Mẫu mục tiêu', Knowledge:'Tài liệu tri thức', LegalVersion:'Điều khoản',
  MarketEvent:'Tin thị trường', MarketSource:'Nguồn tin thị trường', MethodGoalTemplates:'Mẫu mục tiêu liên kết',
  MethodPrompt:'Chỉ dẫn AI', ProviderConfig:'Ngân hàng / ví', ProviderFormat:'Định dạng thông báo',
  RolePermissions:'Quyền theo vai trò', Secret:'Thông tin kết nối', SurveyOption:'Lựa chọn khảo sát', SurveyQuestion:'Câu hỏi khảo sát',
  CannedReply:'Câu trả lời mẫu', ForecastFeedback:'Phản hồi dự báo', Group:'Nhóm', Incident:'Sự cố',
  LegalDraft:'Bản nháp điều khoản', SubscriptionPlan:'Gói đăng ký', TwoFactor:'Xác thực hai bước',
  ActivationChanged:'Đổi trạng thái', Cancelled:'Hủy', Refreshed:'Đồng bộ', Retired:'Gỡ', Corrected:'Điều chỉnh',
  Submitted:'Gửi duyệt', Published:'Xuất bản', Replaced:'Thay thế', Proposed:'Gửi đề xuất',
  AuthorMuted:'Tạm ngừng quyền đăng bài', ContentHidden:'Ẩn nội dung', ContentRestored:'Khôi phục nội dung',
  ImageApproved:'Duyệt ảnh', ImageRejected:'Từ chối ảnh', PlaceHidden:'Ẩn địa điểm', ReportResolved:'Xử lý báo cáo',
  DraftCreated:'Tạo giao dịch nháp', Requested:'Yêu cầu truy cập', Labeled:'Gán nguyên nhân',
  OwnerTransferred:'Chuyển chủ sở hữu', Acknowledged:'Tiếp nhận', Saved:'Lưu', FeaturesUpdated:'Cập nhật chức năng',
  AttachmentViewed:'Xem tệp đính kèm', Broadcast:'Gửi thông báo chung', Claimed:'Nhận xử lý', Escalated:'Chuyển cấp',
  Linked:'Liên kết', PriorityChanged:'Đổi ưu tiên', StatusChanged:'Đổi trạng thái', Verified:'Xác thực thành công',
  EmergencyLocked:'Khóa khẩn cấp', RoleChanged:'Đổi vai trò',
};
const authEvents:Record<string,string>={
  'Auth.Login.Success':'Đăng nhập thành công','Auth.Login.Failed':'Đăng nhập không thành công',
  'Auth.Google.Login.Success':'Đăng nhập Google thành công','Auth.Google.Linked':'Liên kết tài khoản Google',
  'Auth.Google.Registered':'Đăng ký qua Google','Auth.AccountDeletionRequested':'Yêu cầu xóa tài khoản',
  'Auth.EmailVerified':'Xác thực email','Auth.LogoutAllDevices':'Đăng xuất mọi thiết bị',
  'Auth.PasswordChanged':'Thay đổi mật khẩu','Auth.PasswordReset':'Đặt lại mật khẩu',
  'Auth.TokenReuse.Detected':'Phát hiện phiên đăng nhập bất thường','Auth.User.Registered':'Đăng ký tài khoản',
};
export function auditEventLabel(value: string): string {
  if(authEvents[value])return authEvents[value];
  const parts = value.split('.');
  if(parts.length===3&&['Admin','Ops'].includes(parts[0])&&eventWords[parts[1]]&&eventWords[parts[2]])return `${eventWords[parts[1]]}: ${eventWords[parts[2]]}`;
  // Keep unfamiliar event identifiers in the technical disclosure, never invent their meaning.
  return 'Hoạt động hệ thống';
}

const fields: Record<string, string> = {
  result: 'Kết quả', current: 'Hiện tại', proposed: 'Đề xuất', changed: 'Có thay đổi',
  bill: 'Hóa đơn', item: 'Hàng hóa', category_slug: 'Danh mục', source: 'Nguồn', confidence: 'Độ tin cậy',
  available: 'Sẵn sàng', cases: 'Số câu thử', correct_before: 'Đúng trước', correct_after: 'Đúng sau',
  delta: 'Chênh lệch', preview: 'Kết quả chạy thử', validation: 'Kiểm tra dữ liệu', diff_vs_active: 'Khác với bản đang áp dụng',
  amount: 'Số tiền', balance: 'Số dư', merchant: 'Cửa hàng', description: 'Nội dung', occurred_at: 'Thời điểm',
  transaction_type: 'Chiều tiền', sign: 'Dấu tiền', currency: 'Loại tiền', provider_key: 'Ngân hàng / ví',
  amount_cents:'Số tiền (đồng)',merchant_name:'Cửa hàng',balance_after_cents:'Số dư sau giao dịch (đồng)',transacted_at:'Thời điểm giao dịch',
  quantity:'Số lượng',unit_price:'Đơn giá',total_price:'Thành tiền',total_cents:'Tổng tiền (đồng)',
  targetUserId: 'Tài khoản liên quan', from: 'Trước thay đổi', to: 'Sau thay đổi', resource: 'Đối tượng',
  action: 'Thao tác', version: 'Phiên bản', status: 'Trạng thái', reason: 'Lý do', name: 'Tên',
  count: 'Số lượng', total: 'Tổng', items: 'Các mục', success: 'Thành công', matched: 'Nhận dạng được',
  problems: 'Vấn đề cần xử lý', warnings: 'Lưu ý', note: 'Ghi chú', fields: 'Thông tin nhận dạng',
  enabled: 'Đang bật', rateBps: 'Tỷ lệ', unit: 'Chu kỳ', sourceName: 'Tên nguồn', sourceUrl: 'Liên kết nguồn',
};
export const presentationFieldLabel = (key: string) => fields[key];
export const percentToBasisPoints = (percent: number) => Math.round(percent * 100);
