# Kết quả thực thi FE-0 · FinMate Dashboard

Ngày: 18/11/2026. Nhánh: `codex/dashboard-fe-completion`. Mốc trước sửa: dashboard `7cda220`, backend `018bbe0`.

**Hoàn tất bảy mục FE-0 trong [kế hoạch hiện hành](dashboard-frontend-plan.md).** Chỉ sửa frontend dashboard, script kiểm thử và tài liệu. FE-1 đến FE-6 chưa nghiệm thu; backend và app mobile không có thay đổi mã nguồn trong đợt này.

## Thay đổi

| Mục | Kết quả |
|---|---|
| F0-01 · Rasa | Gỡ panel, tab và call `/admin/rasa/*`. Hai URL cũ chuyển về Từ điển, giữ tương thích bookmark. |
| F0-02 · Câu chưa hiểu | Gỡ panel gọi `/admin/ai-learning/unclear`; Học AI mặc định mở Phản hồi người dùng, có retry và không hiện empty khi tải lỗi. |
| F0-03 · Slug danh mục | Đồng bộ validation với backend: `[a-z0-9_]+`, tối đa 100 ký tự. Có hint và nhãn truy cập; slug có gạch dưới sửa/lưu được. |
| F0-04 · Lỗi lưu cũ | Xóa lỗi khi mở form và khi lưu thành công. Đã thử lỗi trùng slug → sửa slug → lưu → mở lại, không còn lỗi cũ. |
| F0-05 · Fixture auth | Bỏ `missionRemindersEnabled` đã gỡ khỏi profile. Script auth đóng phiên QA trong `finally`. |
| F0-06 · Vite watcher | Bỏ qua `.chrome-qa*` và `.ui-review`; có test tạo cache thật, xác nhận source vẫn được theo dõi và cache không được theo dõi. |
| F0-07 · Thông tin lỗi thời | Danh mục giải thích đúng cơ chế sync tự động. Home, Cấu hình hệ thống và Giám sát dùng chung `/ops/monitoring/status`, có refresh, loading, empty, retry và cảnh báo dữ liệu lần trước khi refresh lỗi. |

Giữ nguyên thông tin kiểm tra gần nhất, lần tốt gần nhất, lỗi liên tiếp và trạng thái không rõ/tắt của dịch vụ. Không tạo số liệu giả thay cho API.

## Kiểm chứng

Môi trường ghi dữ liệu là QA riêng: frontend `127.0.0.1:5174`, backend `127.0.0.1:8081`, database tổng hợp; dùng vai trò Admin thật. Dashboard chính vẫn ở `127.0.0.1:5173`, backend chính ở `localhost:8080`.

| Kiểm tra | Kết quả |
|---|---|
| Build TypeScript/Vite | Đạt · 1.856 modules, JS 427,75 kB (gzip 131,35 kB) |
| ESLint | Đạt, không có cảnh báo |
| `test:frontend` | 3/3 đạt: slug hợp lệ, slug không hợp lệ, watcher với thư mục cache thật |
| `test:contract` | 33 endpoint, health và bảo vệ API Admin đạt |
| `test:auth` | 17 cấu trúc response có xác thực đạt |
| Browser FE-0 | 15/15 kiểm tra trong phạm vi sửa đạt |
| Syntax script / diff whitespace | Đạt |

Các kiểm tra browser gồm: chặn slug gạch ngang; lỗi trùng từ API thật; lưu slug gạch dưới sau lỗi; mở lại không có lỗi cũ; Học AI và hai chuyển hướng Rasa; trạng thái ở Home/Cấu hình/Giám sát; liên kết từ Home; refresh; mất kết nối; retry; bố cục 390 px; logout. Đã tạm dừng rồi khởi động lại **chỉ backend QA** để kiểm tra mất kết nối. Sau retry, lỗi được xóa và phiên vẫn dùng được.

Ở viewport 390 px, document/content rộng 390 px, panel rộng 362 px và không tràn ngang. Ảnh được chụp lại sau khi hiệu ứng đóng sidebar hoàn tất. Dialog danh mục cũng đã được kiểm tra qua nhãn truy cập.

Bằng chứng cục bộ: `D:/Capstone/outputs/finmate-dashboard-fe0-2026-11-18/` gồm `browser-results.json`, `check-results.json`, `category-underscore.jpg`, `monitoring-mobile.jpg`. Dữ liệu tạo thử `fe0_regression_category` chỉ nằm trong QA.

## Giới hạn và việc tiếp theo

- QA monitoring trả response hợp lệ với mảng dịch vụ rỗng và 0 incident. Đã kiểm chứng empty/error/stale/retry; chưa kiểm chứng các thẻ dịch vụ có dữ liệu qua browser trong lượt này.
- Không chạy lại bộ backend 3.459 ca; 11 ca đỏ trong báo cáo baseline vẫn thuộc đợt backend. OTP, email, FCM và provider ngoài không được nghiệm thu ở FE-0.
- Phát hiện thêm khi kiểm tra mobile: reload `/ops/monitoring` của Admin bị đưa về Home trong lúc bootstrap quyền. Đã đưa vào FE-1, chưa sửa trong FE-0.
- Thứ tự tiếp theo là FE-1: chuẩn hóa trạng thái tải/lỗi, dữ liệu và quyền, giữ URL, bảng/form/dialog và khả năng truy cập. Các module mới và màn chờ API tiếp tục theo FE-2 đến FE-6.
