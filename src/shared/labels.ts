export const valueLabels:Record<string,string>={published:'Đã xuất bản',monthly:'Theo tháng',yearly:'Theo năm',needs_review:'Cần đối soát',healthy:'Tốt',unhealthy:'Có lỗi',disabled:'Đã tắt',unknown:'Chưa rõ',draft:'Bản nháp',approved:'Đã duyệt',retired:'Đã gỡ',pending:'Chờ xử lý',active:'Đang chạy',archived:'Đã lưu trữ',new:'Mới',labeled:'Đã gán nguyên nhân',Draft:'Bản nháp',Approved:'Đã duyệt',Retired:'Đã gỡ',New:'Mới',Covered:'Đã có tài liệu',Dismissed:'Đã bỏ qua',Paid:'Đã thanh toán',NeedsReview:'Cần đối soát',Expired:'Hết hạn',Voided:'Vô hiệu',Monthly:'Theo tháng',Yearly:'Theo năm',feed:'RSS / Feed',price_table:'Bảng giá',page:'Trang web',Pending:'Đang chờ',Processed:'Đã xử lý',Cancelled:'Đã hủy',Admin:'Quản trị viên',OpsManager:'Quản lý vận hành',Staff:'Nhân viên',User:'Người dùng',Bank:'Ngân hàng',EWallet:'Ví điện tử',Cash:'Tiền mặt',Primary:'Chính',Supporting:'Bổ trợ',Both:'Cả hai',ReserveFirst:'Dự phòng trước',Envelope:'Chia hũ',AvailableToSpend:'Khả dụng để chi',TrackOnly:'Theo dõi',primary:'Chính',supporting:'Bổ trợ',both:'Cả hai',reserve_first:'Dự phòng trước',envelope:'Chia hũ',available_to_spend:'Khả dụng để chi',track_only:'Theo dõi'};
Object.assign(valueLabels, {
  year:'năm', month:'tháng', day:'ngày', low:'Ít dữ liệu', normal:'Thông thường', high:'Cao', all:'Tất cả',
  debit:'Tiền ra', credit:'Tiền vào', income:'Thu nhập', expense:'Chi tiêu', transfer:'Chuyển tiền',
  pending_ai:'Chờ AI xử lý', ai_not_allowed:'Không cho phép AI xử lý', no_content:'Không có nội dung',
  blocked:'Bị chặn', failed:'Có lỗi', processed:'Đã xử lý', rejected:'Đã từ chối',
  offline:'Ngoại tuyến', reviewed:'Đã xem', excluded:'Đã loại khỏi học',
  increase:'Tăng', decrease:'Giảm', up:'Tăng', down:'Giảm', stable:'Ổn định',
  fuel:'Xăng dầu', electricity:'Điện', water:'Nước', gold:'Vàng', inflation:'Lạm phát',
  manual:'Nhập thủ công', collected:'Thu thập từ nguồn', feed:'Nguồn tin tự động',
  draft_created:'Đã tạo giao dịch nháp', ignored:'Đã bỏ qua', error:'Có lỗi',
  percent:'Phần trăm', int:'Số nguyên', cents:'Số tiền (đồng)', minutes:'Số phút',
  Debit:'Chi tiêu', Credit:'Thu nhập', Confirmed:'Đã xác nhận', Notification:'Thông báo',
  Manual:'Nhập thủ công', Receipt:'Hóa đơn', Transfer:'Chuyển tiền', Recurring:'Khoản định kỳ',
  food:'Ăn uống', dining:'Ăn uống', groceries:'Thực phẩm & nhu yếu phẩm', shopping:'Mua sắm',
  healthcare:'Chăm sóc sức khỏe', health:'Sức khỏe', transport:'Đi lại', transportation:'Đi lại',
  entertainment:'Giải trí', education:'Giáo dục', housing:'Nhà ở', utilities:'Điện nước & tiện ích',
  salary:'Lương', savings:'Tiết kiệm', investment:'Đầu tư', insurance:'Bảo hiểm', other:'Khác',
  brands:'Thương hiệu', keywords:'Từ khóa', 'item-cache':'Bộ nhớ hàng hóa',
  create:'Tạo mới', update:'Cập nhật', delete:'Xóa', activate:'Áp dụng', revert:'Khôi phục',
  default:'Mặc định', active:'Đang áp dụng', archived:'Đã lưu trữ',
});
export const displayValue=(value:string)=>valueLabels[value]||value;
