# FinMate Admin

Trang quản trị React/Vite cho backend FinMate. Phạm vi và thứ tự hoàn thiện được ghi trong [kế hoạch frontend dashboard](docs/dashboard-frontend-plan.md).

## Giao diện hiện hành

Dashboard được làm lại ngày 19/11/2026 theo mobile trong Figma FinMate: nền xanh sương/kính mờ, pill đen, Be Vietnam Pro/Inter và logo gốc. Style áp dụng chung cho toàn bộ màn, light/dark và desktop/tablet/mobile. Xem [kết quả kiểm tra giao diện](docs/dashboard-ui-restyle-2026-11-19.md) và [design system](design-system/finmate-dashboard/MASTER.md).

## Chạy

Cần Node.js 24 trở lên để chạy cả bộ kiểm tra frontend (có import TypeScript trực tiếp).

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Docker Compose của backend xuất API tại `http://localhost:8080`. Vite proxy `/api/v1` sang cổng này; giữ `VITE_API_BASE_URL=/api/v1` khi chạy local. Đăng nhập bằng tài khoản nội bộ FinMate. Access token và refresh token được lưu trong `sessionStorage` của tab.

Console dùng **một sidebar chung**. Admin thấy các mục quản trị và vận hành trong cùng menu; Staff và OpsManager thấy menu theo capability từ `/ops/me`. Có đăng nhập và OTP email khi backend yêu cầu, các trang quản trị, cấu hình hệ thống/AI và nhóm vận hành ticket, đề xuất, giám sát, audit, câu trả lời mẫu, thống kê AI. Các phần chưa có API hiển thị chờ nguồn. Chế độ minh họa chỉ có trong DEV và phải bật có chủ đích, không thay thế lỗi API thật.

Mốc giao diện lịch sử ngày 06/11/2026: sidebar lưu trạng thái, tìm trang Ctrl+K, menu overlay trên tablet/mobile, bảng với menu thao tác và cột hành động cố định, drawer có focus trap và cảnh báo bỏ thay đổi, form tham số/phần liên kết mẫu mục tiêu, xem khác biệt cấu hình, và workspace xử lý ticket. Chi tiết ở [báo cáo cập nhật giao diện](docs/admin-ui-update-report-2026-11-06.md).

Mục Cấu hình tách hai trang: `/settings/system` (Ứng dụng; Ngưỡng & đồng bộ; Giao diện app; Tích hợp bên thứ ba; Vận hành & dữ liệu; Trạng thái dịch vụ; Lịch sử thay đổi) và `/settings/ai/{dictionary,rules,knowledge}`. Cấu hình đã nối `/admin/system-config`, mỗi lần lưu là một phiên bản và cần lý do. Tích hợp dùng panel secrets; trạng thái dùng `/ops/monitoring/status`, chung với Home và Giám sát, có làm mới và thử lại. Tab Định dạng thông báo ở Ngân hàng & Ví dùng `/admin/provider-formats`. Tài liệu cấu hình AI được gom vào Từ điển hoặc Luật theo trường `group` từ AI service. Rasa đã được gỡ khỏi sản phẩm; `/settings/ai/rasa` và `/settings?tab=rasa` chuyển về Từ điển. Đường dẫn cũ `/settings?tab=ai`, `/ai-rules`, `/ai-config` vẫn chuyển hướng.

Luồng đăng nhập dùng `/auth/login`, `/users/me`, trạng thái OTP và `/ops/me`. Khi access token hết hạn, client thử `/auth/refresh` một lần. Đăng xuất gọi `/auth/logout`; đổi mật khẩu và đăng xuất tất cả thiết bị ở Hồ sơ. Lỗi tạm thời/429 khi tải phiên cho phép thử lại, không tự xóa phiên. Backend hiện trả refresh token trong JSON nên frontend lưu token trong `sessionStorage` của tab.

Trang **Phương pháp tài chính** có hai tab. *Phương pháp*: bảng danh mục (thêm, sửa, tắt/bật, liên kết mẫu mục tiêu) và nút **Trang chủ** mở bộ chỉnh bố cục trang chủ của từng cách (chọn khối, thứ tự, tham số hiển thị, dạng danh sách hoặc chia phần trăm thu nhập; khối **Các hũ** gắn mỗi hũ với một tham số % và các danh mục chi, mỗi danh mục chỉ thuộc một hũ, T1/T2 không dùng làm hũ; có xem trước và kiểm tra hợp lệ; lưu qua `PATCH /admin/finance-methods/{id}`, loại khối lấy từ `GET /admin/finance-methods/home-blocks`). Cột **Người đang dùng** cho biết bao nhiêu người đang dùng từng cách; khi tắt một cách đang có người dùng, hộp xác nhận nêu số người bị ảnh hưởng (họ vẫn dùng như cũ, app báo đã ngừng cung cấp và mời chọn cách khác; người mới không chọn được, AI không gợi ý nữa). *Chỉ dẫn AI*: các phiên bản chỉ dẫn gửi cho AI khi gợi ý (`/admin/finance-method-prompts`), không sửa tại chỗ: thêm bản mới rồi chuyển bản đang dùng, quay về bản cũ được. Hai thiết lập của bộ chọn (thời gian dùng lại gợi ý, điểm tối thiểu của cách bổ trợ) nằm ở Cấu hình hệ thống, mục Ngưỡng & đồng bộ, cùng thẻ **Ngưỡng cảnh báo ngân sách mặc định** (T1/T2, mặc định 70/90; mức vượt hạn mức luôn 100%). Mặc định này chỉ áp dụng cho người dùng không có ngưỡng cá nhân và không dùng cách quản lý nào có ngưỡng riêng; mỗi phương pháp có T1/T2 riêng (sửa ở `paramDefs` của phương pháp) và người dùng tự đặt được ngưỡng cá nhân trên app.

## Kiểm tra

```powershell
npm run build
npm run lint
npm run test:frontend
npm run test:contract
```

`test:contract` cần Docker backend đang chạy tại `http://localhost:8080`. Có thể đổi URL bằng `FINMATE_BACKEND_URL`.

`test:frontend` có 16 test: ngày Việt Nam, stock/flow KPI, dữ liệu thiếu, pagination/URL, xung đột demo, form/capability/schema 24 nhóm/10 cờ, slug và watcher Vite. Kết quả lịch sử FE-0 giữ ở [báo cáo FE-0](docs/dashboard-fe0-report-2026-11-18.md); kết quả hiện tại ở [báo cáo hoàn thiện FE](docs/dashboard-fe-completion-report-2026-11-19.md).

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

- Đã xác minh response đọc bằng tài khoản Admin dev và lưu fixture chỉ chứa tên trường. Các thao tác ghi được kiểm thử trên môi trường QA riêng có dữ liệu tổng hợp.
- Các panel định dạng thông báo, secrets, cấu hình hệ thống, trạng thái dịch vụ và phản hồi học AI đã có API thật. Học AI mặc định mở Phản hồi người dùng; không còn gọi API unclear đã gỡ.
- Backend tự đồng bộ danh mục sang AI sau khi lưu/bật tắt và có lượt bù định kỳ; lỗi AI không làm mất lần lưu danh mục. Dashboard chưa có telemetry của quá trình sync.
- KPI tổng thể, telemetry local-first và mẫu hóa đơn đã có UI phát triển; nguồn thật vẫn chờ API. Chi tiết contract đề xuất, nguồn/metric/consent/retention và thứ tự BE ở [bàn giao tích hợp](docs/dashboard-backend-integration.md).


## Phạm vi FE hoàn thiện ngày 19/11/2026

Đã bổ sung Kho tri thức, Giả định kinh tế, Chất lượng dự báo, Thị trường, Kiểm duyệt cộng đồng, Pháp lý, Gói & đơn đăng ký; cấu hình đủ 24 nhóm/10 cờ; diagnostics provider/error; Home theo việc cần xử lý. Xem [ma trận tính năng và mức kiểm chứng](docs/dashboard-feature-matrix.md). Các màn mới dùng API hiện hành và lazy-load theo route.

Query dùng TanStack Query có sẵn, hủy request cũ và retry có giới hạn; logout xóa cache và token. Menu/route/action theo quyền hiệu lực `/ops/me`, có nút tải lại quyền. Form và dialog giữ draft khi lỗi, cảnh báo rời trang bằng sidebar hoặc browser Back. Bộ lọc/pagination giữ trên URL, ngày hiển thị Việt Nam.

Ba màn `/overview`, `/sync`, mẫu hóa đơn trong `/ai-learning` mặc định chờ API. Trong DEV có thể bấm **Xem dữ liệu minh họa** để thử tìm/lọc/pager/detail và các tình huống empty/error/conflict. `source=demo` cũng chỉ có hiệu lực trong DEV; production build không kích hoạt adapter này. Không hiển thị số mẫu như dữ liệu thật, không gửi mutation demo đến backend.

Kiểm thử module API bằng tài khoản tổng hợp chỉ chạy trên QA riêng:

```powershell
$env:FINMATE_BACKEND_URL = 'http://127.0.0.1:8081'
$env:FINMATE_ADMIN_PASSWORD = '<mat-khau-tai-khoan-QA-tong-hop>'
$env:FINMATE_TEST_OUTPUT = '<thu-muc-ket-qua-rieng>'
npm run test:modules
# Chỉ trên DB QA disposable: thêm FINMATE_QA_MUTATIONS=1 để kiểm thử ghi.
Remove-Item Env:FINMATE_ADMIN_PASSWORD
```

Runner chặn URL khác cổng QA trên; mặc định chỉ đọc, kiểm tra role thật Admin/Staff/Manager/User và logout phiên test. Chế độ mutation tạo dữ liệu QA và tạm sửa/khôi phục legal draft. Tài khoản phải được tạo trong QA trước; test không tắt OTP. Tạo tri thức có thể trả 503 nếu embedding provider chưa cấu hình: đây là giới hạn tích hợp được báo riêng, không phải tạo thành công.

Đợt thực thi giữ BE/mobile ngoài phạm vi. Email OTP, FCM, Google/LLM, nguồn thị trường/kinh tế thật, thanh toán SePay và legal publish/re-consent cần lượt tích hợp riêng. Mã hiện ở nhánh `codex/dashboard-fe-completion`, chưa tự commit/merge/deploy.
