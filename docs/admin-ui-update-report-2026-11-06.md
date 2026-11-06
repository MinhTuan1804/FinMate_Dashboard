# Cập nhật giao diện Admin — 06/11/2026

Thực hiện theo `admin-ui-update-plan-2026-11-06.md` trên source hiện có. Backend và contract nghiệp vụ được giữ làm nguồn dữ liệu. Lượt kiểm tra ban đầu dựa trên mã nguồn/build/lint; ảnh trong `.ui-review/` là ảnh sau cập nhật, không phải bộ ảnh so sánh trước/sau.

## Thay đổi đã triển khai

| Nhóm | Kết quả |
|---|---|
| Khung ứng dụng | Tách `auth/Login.tsx`, `layout/AppShell.tsx`; Dùng một sidebar chung cho quản trị và vận hành theo điều chỉnh của người dùng; menu dựa trên capability. Sidebar lưu thu gọn, tìm trang Ctrl+K, breadcrumb nhiều cấp, menu overlay trên màn hẹp, skip link và theme sáng/tối. |
| Nền giao diện | Lớp `ui.css` áp dụng token, kích thước control, khoảng cách, bảng, trạng thái, editor và responsive trên các màn hiện có. `app.css` giữ lớp nền/component cũ; `ui.css` là lớp giao diện console mới. |
| Dialog/drawer | Dùng `DialogOverlay` ở các overlay hiện có: focus trap, trả focus, Escape/backdrop, chặn đóng khi đang lưu, xác nhận bỏ thay đổi. Lỗi của form và hành động xác nhận hiển thị trong dialog. |
| Bảng quản trị | `ui/DataTable.tsx` dùng chung, trạng thái tiếng Việt, tên/mô tả xuống dòng, mã có sao chép, một hành động chính và menu phụ. Cột thao tác cố định khi cuộn ngang. |
| Biểu mẫu tài chính | Form phương pháp chia tab; tham số và bước bắt đầu có editor theo trường; liên kết mẫu mục tiêu chọn bằng checkbox, thứ tự và điều kiện. Giữ chế độ JSON nâng cao. Chuẩn hóa giá trị enum response dạng snake_case khi mở select chỉnh sửa. |
| JSON/cấu hình | JSON có validate, định dạng, mở rộng, sao chép và số dòng. AI có trạng thái phiên bản, xem nội dung phiên bản và so sánh với bản chạy; lịch sử được thu gọn. Cấu hình hệ thống có diff khi xem phiên bản. Có bảo vệ thay đổi chưa lưu khi tải lại/chuyển bằng link hoặc tìm trang. |
| Quyền | Tách Đội ngũ/Ma trận quyền thành tab. Không đổi capability, giới hạn tự đổi quyền và quy trình lưu có lý do. |
| Dashboard/giám sát | Thẻ KPI thống nhất, phân bố theo kết quả/nguồn từ dictionary API thật; thẻ trạng thái dịch vụ. KPI chưa phân công/trễ hạn dẫn sang hàng đợi với bộ lọc URL. |
| Ticket | Bảng hàng đợi gọn hơn, bộ lọc giữ trên URL. Detail có tóm tắt trạng thái/SLA, tab Trao đổi/Dữ liệu khách, thread cuộn riêng và panel ngữ cảnh. Composer phân biệt Trả lời khách/Ghi chú nội bộ; điều phối nâng cao thu gọn. Dữ liệu khách vẫn chỉ tải theo yêu cầu và consent. |
| Vận hành khác | Form đề xuất và câu trả lời mẫu mở theo nhu cầu; các trang audit, duyệt, giám sát dùng cùng ngôn ngữ giao diện. |
| Phản hồi thao tác | Toast thành công có thể đóng; thông báo lỗi không bị che sau drawer. Giữ thông báo lỗi xung đột sau khi tải lại ca. |
| Khôi phục phiên | Sửa lỗi coi mọi lỗi bootstrap là hết phiên. Lỗi tạm thời/429 có màn thử lại; lỗi của request retry sau refresh không còn bị gom chung thành lỗi refresh. |

## Thành phần mới

- `layout/AppShell.tsx`, `auth/Login.tsx`: shell và đăng nhập/OTP.
- `ui/DialogOverlay.tsx`, `ui/useUnsavedChanges.ts`: vòng đời overlay và bảo vệ bản nhập.
- `ui/DataTable.tsx`: bảng, copy mã, menu hành động.
- `ui/CatalogField.tsx`, `ui/GoalLinksEditor.tsx`: editor tài chính.
- `ui/JsonReview.tsx`, `ui/Distribution.tsx`: so sánh cấu hình và phân bố số liệu.
- `shared/labels.ts`: nhãn trình bày enum, giữ giá trị request tách với nhãn.

## Kiểm tra và giới hạn kết luận

Kết quả cuối: build và lint đạt; contract check đạt 31 endpoint/health/401; browser suite đạt 17 route quản trị, 7 route vận hành, focus/dirty form, 2 fixture menu vai trò, tab AI, refresh và logout. Đã xem ảnh light/dark/tablet, bảng phương pháp, cấu hình hệ thống, editor tham số và ticket fixture. Kiểm tra geometry riêng xác nhận thanh tab editor cao 43px, không bị ép hoặc tràn ngang.

- Build/lint kiểm tra toàn bộ mã hiện tại.
- Browser test dùng đăng nhập Admin thật và refresh thật; đi qua 17 route quản trị, 7 route vận hành theo capability, drawer, focus, cảnh báo dirty form, select phương pháp, editor tham số, tab AI và logout.
- Menu Staff/OpsManager được thử bằng fixture trình bày qua CDP. Đây là kiểm tra menu/route frontend; không thay thế đăng nhập và kiểm tra phân quyền backend bằng tài khoản Staff/OpsManager thật.
- Luồng OTP giữ nguyên API. Bài test yêu cầu mã hợp lệ nếu backend bật OTP; lần kiểm tra ở môi trường hiện tại backend không yêu cầu OTP.
- Screenshot các viewport 1280/1440/1920/768, light/dark và một ticket minh họa bằng fixture. Fixture ticket chỉ dùng trong browser test, không ghi lên backend.
- Không thử thao tác mutation trên dữ liệu đang dùng. Các form được mở/đổi chế độ/bỏ bản nhập; bài test không lưu thử cấu hình, đổi quyền hoặc gửi tin cho khách.
- Suite có ảnh chụp được chia cửa sổ theo rate limit backend, không nới giới hạn hoặc tắt bảo vệ backend.

Các phần Sync/Học AI/category sync và số liệu tổng hợp còn thiếu vẫn hiển thị chờ kết nối theo API thực tế. Không suy diễn dữ liệu hoặc tạo nút lưu giả để lấp phần còn thiếu.

## Lệnh kiểm tra

```powershell
npm run build
npm run lint
npm run test:contract
# Tài khoản chỉ truyền qua biến môi trường của phiên shell
npm run test:browser
# Chụp và kiểm tra responsive thêm:
$env:FINMATE_UI_REVIEW = '1'
npm run test:browser
```

Ảnh QA được gitignore. Thông tin đăng nhập không được đưa vào source, fixture hoặc báo cáo này.
