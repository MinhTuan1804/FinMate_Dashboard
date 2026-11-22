# Làm lại giao diện FinMate Dashboard

Hoàn tất 19/11/2026 trên `codex/dashboard-fe-completion`. Phạm vi đợt này: giao diện web dashboard, dùng UI/UX Pro Max và thiết kế mobile trong [Figma FinMate, Page 2](https://www.figma.com/design/0FARhRxrDACXkMZEaLKSGK/FinMate?node-id=102-55).

## Thiết kế đã áp dụng

Đối chiếu trực tiếp Home `103:57`, đăng nhập `103:708`, danh sách giao dịch `135:6215`, cài đặt `103:270` và logo `103:1063` bằng design context + screenshot.

- Nền xanh sương pha hồng nhẹ, panel kính sáng/viền trắng, shadow dịu; nút và tab active dạng pill đen.
- Font Be Vietnam Pro/Inter tự host, giữ chữ tiếng Việt và số rõ; icon xanh nhạt trong vòng tròn.
- Đồng bộ sidebar/header, bảng/filter/pager, form, drawer, confirm/toast, loading/empty/error và các editor cấu hình.
- Sắp lại Home: công việc cần xử lý cạnh trạng thái dịch vụ, bộ lọc thời gian gọn và các widget AI rõ thứ bậc.
- Đăng nhập dùng logo và icon gốc của Figma; drawer người dùng/audit/xóa dữ liệu trình bày theo nhóm thông tin.
- Có light/dark và responsive. Token tập trung tại `src/app/design-tokens.css`, visual chung tại `finmate-theme.css`; quy ước ở [design system](../design-system/finmate-dashboard/MASTER.md).

## Kiểm tra sau khi sửa

| Phạm vi | Kết quả |
|---|---|
| Build production, lint, frontend tests | Đạt; 16/16 test FE; build cuối không cảnh báo cú pháp CSS |
| Toàn bộ 29 mục trong sidebar Admin | Kiểm tra ở 1440×1000, 768×1024 và 375×900; không tràn ngang toàn trang, không alert tải lỗi |
| Desktop nhỏ 1024×900 | Home, users, audit, finance methods, system config đạt |
| Tab con / cấu hình | 39 lượt xem tab và đủ 16 nhóm nâng cao; không tràn khung |
| Dark mode | Home, users, legal, forecast, system config, AI config; 14 cặp màu token light/dark đạt contrast chữ ít nhất 4,5:1 |
| Tương tác | Tìm trang, sidebar thu gọn/mobile, đổi theme, drawer/detail, error summary/focus, Tab vòng trong dialog, dirty discard |
| Đăng nhập thật | Sai mật khẩu hiện lỗi; toggle hiện/ẩn hoạt động; Staff đăng nhập đúng menu/route và logout; Admin đăng nhập lại đạt |
| Mutation QA | Tạo `qa_style_20261119` qua UI, xác nhận tắt mềm, API đọc lại `isActive=false` với `includeInactive=true` |
| Assets | 3 SVG gốc tải tại local, không rỗng, callsite/slot và kích thước gốc đúng; font WOFF2 tải được |

Các lỗi tìm thấy và đã sửa trong lượt kiểm tra: ô ngày audit chồng nhau; vị trí cuộn của trang cũ còn giữ khi đổi route; nút tìm trang trống dài trên tablet; ô đăng nhập có viền lồng; màu thumb của switch bật trong dark mode. Bộ lọc/tab cùng trang vẫn giữ trạng thái URL.

Đây là kiểm tra giao diện và các luồng hồi quy nêu trên. Các API tổng hợp đang chờ, embedding và tích hợp ngoài vẫn theo [backlog backend](dashboard-backend-integration.md); không đánh đồng kiểm tra bố cục với nghiệm thu mọi nghiệp vụ.

## Bằng chứng và mở xem

- Dashboard chính: `http://127.0.0.1:5173`; QA riêng: `http://127.0.0.1:5174`. Giao diện mới áp dụng trên cả hai; tài khoản `qa-*` dùng cổng 5174.
- Đã mở sẵn Home QA bằng Admin để xem giao diện. Dữ liệu kiểm thử tổng hợp; không sửa BE/mobile hoặc dữ liệu chính trong đợt này.
- Bằng chứng: `D:/Capstone/outputs/finmate-dashboard-restyle-2026-11-19` gồm `routes-{desktop,mobile,tablet}.json`, `tabs.json`, `focused-checks.json`, `contrast.json`, `qa-category-readback.json`, `verification-summary.json`, ảnh từng màn và `browser-console.json` (không có entry lỗi JS trong phiên Admin đã lấy log).
- Ảnh tiêu biểu: `dashboard-light.jpg`, `dark/-.jpg`, `login-mobile-light.jpg`, `user-drawer-final.jpg`, `audit-filters-fixed.jpg`, `mobile/form-validation.jpg`.

Giữ nguyên các thay đổi FE từ đợt trước; chưa tự commit/merge/deploy.

## Tinh chỉnh theo phản hồi về nền sáng và câu chữ

Đã tăng diện tích xanh sương và hồng mờ, giảm trắng ở canvas/thẻ/input/bảng. Sidebar có nền và viền riêng, topbar tách lớp; thẻ chỉ số xen sắc xanh/hồng. Dark mode giữ độ phân lớp. Sửa bóng sidebar còn lộ khi đóng trên mobile và tỷ lệ hai cột của màn chỉnh định dạng thông báo.

Rà mô tả trang, biểu mẫu, thông báo xác nhận, nhãn vai trò/danh mục/trạng thái, kết quả AI và cấu hình. Đổi các mô tả về Agent/backend/contract/metadata sang tác vụ và tác động nghiệp vụ. Nhật ký dùng tên hoạt động tiếng Việt; UUID, IP, mã sự kiện và dữ liệu đối chiếu nằm trong phần thu gọn. JSON, biểu thức nhận dạng và mã ứng dụng nguồn vẫn có thể mở khi cần. Kết quả thử đọc thông báo hiển thị số tiền, chiều tiền, cửa hàng, số dư và thời điểm thay vì JSON. Không đổi mã gửi API hay dữ liệu do người dùng đặt tên.

Giả định kinh tế nhập tỷ lệ theo %, chọn chu kỳ tiếng Việt, chuyển sang điểm cơ bản khi lưu. Đã thử QA bằng `qa_ui_refine_20261119`: nhập 6.5, lưu và đọc lại 6,5%/năm; sau đó gỡ bản nháp. Không duyệt hay thay tỷ lệ đang áp dụng. Tên/mã dữ liệu QA cũ vẫn có thể chứa tiếng Anh hoặc mã thử nghiệm.

Kiểm tra lượt tinh chỉnh:

- Build và lint đạt; 18 kiểm thử FE đạt, gồm chuyển đổi tỷ lệ và tên hoạt động chưa biết.
- 29 trang chính ở 1440px và 375px; 38 lượt kiểm tra tab trên desktop. Không thấy lỗi tải hoặc tràn ngang trang.
- 16 nhóm cấu hình trên desktop và mobile; 6 màn đại diện ở tablet 768px và dark mode. Các phần sửa cuối được kiểm tra lại riêng.
- 26 cặp màu chữ/viền đạt ngưỡng tương phản; chữ nhỏ thấp nhất 5,09:1, viền điều khiển đạt 3:1.
- Kiểm tra mở/đóng thông tin kỹ thuật trong nhật ký, trình JSON nâng cao vẫn mở và đọc được dữ liệu hợp lệ. Không lưu thay đổi cấu hình/quyền/kết nối.
- Thử đọc mẫu MB Bank trong QA: nhận dạng 75.000 đồng, tiền ra, HIGHLANDS COFFEE, số dư 2.500.000 đồng. Không thay quy tắc đang chạy.

Bằng chứng mới: `D:/Capstone/outputs/finmate-dashboard-refinement-2026-11-19` gồm ảnh, `routes-{desktop,mobile,tablet,dark}.json`, `tabs-desktop.json`, `config-groups{,-mobile}.json`, `contrast.json`, `focused-checks.json`. Đây là nghiệm thu lượt tinh chỉnh UI; các nguồn tổng hợp và tích hợp ngoài vẫn theo backlog BE ở trên.
