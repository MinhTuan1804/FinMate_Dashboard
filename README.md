# FinMate Admin

Trang quản trị React/Vite cho backend FinMate (`E:\Ki 9\Model AI\FinMate_BE`), theo [đặc tả Admin](<E:/Ki 9/Capstone_Project/FinMate_FE/docs/admin-pages-spec.md>).

## Chạy

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Docker Compose của backend xuất API tại `http://localhost:8080`. Vite proxy `/api/v1` sang cổng này; giữ `VITE_API_BASE_URL=/api/v1` khi chạy local. Đăng nhập bằng tài khoản admin FinMate. Frontend chỉ lưu access token trong session của tab.

Console dùng **một sidebar chung**. Admin thấy các mục quản trị và vận hành trong cùng menu; Staff và OpsManager thấy menu theo capability từ `/ops/me`. Có đăng nhập và OTP email khi backend yêu cầu, các trang quản trị, cấu hình hệ thống/AI và nhóm vận hành ticket, đề xuất, giám sát, audit, câu trả lời mẫu, thống kê AI. Các phần chưa có API hiển thị **Chưa kết nối**.

Giao diện cập nhật ngày 06/11/2026: sidebar lưu trạng thái, tìm trang Ctrl+K, menu overlay trên tablet/mobile, bảng với menu thao tác và cột hành động cố định, drawer có focus trap và cảnh báo bỏ thay đổi, form tham số/phần liên kết mẫu mục tiêu, xem khác biệt cấu hình, và workspace xử lý ticket. Chi tiết ở [báo cáo cập nhật giao diện](docs/admin-ui-update-report-2026-11-06.md).

Mục Cấu hình tách hai trang: `/settings/system` (Ứng dụng gồm bảo trì, phiên bản app và tính năng; Ngưỡng & đồng bộ; Giao diện app; Lịch sử thay đổi có khôi phục: đã nối `/admin/system-config`, mỗi lần lưu là một phiên bản và cần lý do. Tích hợp bên thứ ba và Trạng thái dịch vụ còn chờ backend) và `/settings/ai/{dictionary,rules,knowledge}`. Tab Định dạng thông báo ở Ngân hàng & Ví đã nối qua `/admin/provider-formats`. Tài liệu cấu hình AI được gom vào Từ điển hoặc Luật theo trường `group` mà AI service trả về, admin không giữ bảng tên-nhóm riêng. Đường dẫn cũ `/settings?tab=ai`, `/ai-rules`, `/ai-config` vẫn chuyển hướng.

Luồng đăng nhập dùng `/auth/login`, `/users/me`, trạng thái OTP và `/ops/me`. Khi access token hết hạn, client thử `/auth/refresh` một lần. Đăng xuất gọi `/auth/logout`; đổi mật khẩu và đăng xuất tất cả thiết bị ở Hồ sơ. Lỗi tạm thời/429 khi tải phiên cho phép thử lại, không tự xóa phiên. Backend hiện trả refresh token trong JSON nên frontend lưu token trong `sessionStorage` của tab.

Trang **Phương pháp tài chính** có hai tab. *Phương pháp*: bảng danh mục (thêm, sửa, tắt/bật, liên kết mẫu mục tiêu) và nút **Trang chủ** mở bộ chỉnh bố cục trang chủ của từng cách (chọn khối, thứ tự, tham số hiển thị, dạng danh sách hoặc chia phần trăm thu nhập; khối **Các hũ** gắn mỗi hũ với một tham số % và các danh mục chi, mỗi danh mục chỉ thuộc một hũ, T1/T2 không dùng làm hũ; có xem trước và kiểm tra hợp lệ; lưu qua `PATCH /admin/finance-methods/{id}`, loại khối lấy từ `GET /admin/finance-methods/home-blocks`). Cột **Người đang dùng** cho biết bao nhiêu người đang dùng từng cách; khi tắt một cách đang có người dùng, hộp xác nhận nêu số người bị ảnh hưởng (họ vẫn dùng như cũ, app báo đã ngừng cung cấp và mời chọn cách khác; người mới không chọn được, AI không gợi ý nữa). *Chỉ dẫn AI*: các phiên bản chỉ dẫn gửi cho AI khi gợi ý (`/admin/finance-method-prompts`), không sửa tại chỗ: thêm bản mới rồi chuyển bản đang dùng, quay về bản cũ được. Hai thiết lập của bộ chọn (thời gian dùng lại gợi ý, điểm tối thiểu của cách bổ trợ) nằm ở Cấu hình hệ thống, mục Ngưỡng & đồng bộ, cùng thẻ **Ngưỡng cảnh báo ngân sách mặc định** (T1/T2, mặc định 70/90; mức vượt hạn mức luôn 100%). Mặc định này chỉ áp dụng cho người dùng không có ngưỡng cá nhân và không dùng cách quản lý nào có ngưỡng riêng; mỗi phương pháp có T1/T2 riêng (sửa ở `paramDefs` của phương pháp) và người dùng tự đặt được ngưỡng cá nhân trên app.

## Kiểm tra

```powershell
npm run build
npm run lint
npm run test:contract
```

`test:contract` cần Docker backend đang chạy tại `http://localhost:8080`. Có thể đổi URL bằng `FINMATE_BACKEND_URL`.

Kiểm tra API có xác thực và luồng trình duyệt bằng tài khoản Admin dev (đặt biến môi trường trong phiên shell, không ghi mật khẩu vào file):

```powershell
$env:FINMATE_ADMIN_EMAIL = '<email-admin-dev>'
$env:FINMATE_ADMIN_PASSWORD = '<mat-khau>'
npm run test:auth
npm run test:browser
Remove-Item Env:FINMATE_ADMIN_EMAIL,Env:FINMATE_ADMIN_PASSWORD
```

`test:auth` so response với fixture cấu trúc. `test:browser` dùng Chrome headless để kiểm tra đăng nhập, refresh, các trang quản trị/vận hành được cấp quyền, drawer, dirty form, form phương pháp, tab AI và logout. Menu Staff/OpsManager được kiểm tra bằng fixture trình bày riêng, không thay thế kiểm thử phân quyền backend. Nếu 2FA bật, cần cung cấp OTP hợp lệ qua `FINMATE_ADMIN_OTP`; bài test không tắt OTP.

Đặt `FINMATE_UI_REVIEW=1` để chụp các viewport 1280/1440/1920/768, light/dark và ticket bằng fixture minh họa. Ảnh nằm trong `.ui-review/` được gitignore. Chế độ này chờ một cửa sổ rate limit giữa các lượt để tránh dồn quá nhiều request vào backend.

## Chờ backend / dữ liệu kiểm thử

- Đã xác minh response đọc bằng tài khoản Admin dev và lưu fixture chỉ chứa tên trường. Chưa chạy thao tác ghi trên dữ liệu đang dùng; các thao tác này cần môi trường thử nghiệm riêng để tránh thay đổi dữ liệu thật.
- Các panel định dạng thông báo, secrets và cấu hình hệ thống đã có đường gọi trong source.
- Các màn vẫn chờ nguồn dữ liệu gồm đồng bộ danh mục sang AI, trạng thái hàng đợi local-first, danh sách dữ liệu học AI và một số số liệu tổng hợp. Không tự coi API thiếu đã sẵn sàng khi chỉ đổi giao diện.
