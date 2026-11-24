/** Display labels only; original identifiers remain unchanged in requests and exports. */
export const serviceLabels: Record<string, string> = {
  backend: 'Hệ thống FinMate', 'ai-service': 'Phân tích AI', ai_service: 'Phân tích AI',
  ocr_service: 'Đọc hóa đơn', stt_service: 'Nhận dạng giọng nói', redis: 'Bộ nhớ tạm',
  brevo: 'Gửi email', fcm: 'Thông báo đẩy', gemini: 'Gemini', gemini_backup: 'Gemini dự phòng',
  google_vision: 'Đọc ảnh Google Vision', market_data: 'Dữ liệu thị trường', sepay: 'Thanh toán SePay',
};
export const serviceLabel = (value: string) => serviceLabels[value] || value;


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
