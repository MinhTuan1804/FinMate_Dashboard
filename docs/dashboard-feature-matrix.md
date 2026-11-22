# Ma trận tính năng dashboard

Cập nhật 19/11/2026, nhánh `codex/dashboard-fe-completion`. UI/API/E2E là ba mức riêng: có màn và nút không đủ chứng minh pipeline nghiệp vụ. “QA” dưới đây là backend Docker cổng 8081 với DB/tài khoản/dữ liệu tổng hợp; dashboard chính cổng 5173 dùng backend 8080.

## Các màn dùng API thật

| Màn | Tính năng FE hiện có | API/quyền | Kiểm chứng và giới hạn |
|---|---|---|---|
| Dashboard `/` | Việc cần xử lý, link filter, AI, audit/xóa 5 dòng gần nhất, dịch vụ, date VN, refresh từng widget | Admin, số liệu có phạm vi ghi rõ | Browser desktop/mobile/light/dark; không tự dựng KPI toàn hệ thống |
| Người dùng | Tìm/cursor/filter URL, detail, khóa/mở, role, liên kết audit | Admin | Route + auth contract; mutation baseline QA 49; chưa chạy lại mọi nhánh mutation từ browser sau refactor |
| Phân quyền | Đội ngũ/ma trận capability, diff thêm/thu hồi, lý do | Admin | Role thật; đã thu hồi/tải lại quyền/kiểm tra route/menu rồi khôi phục baseline Manager |
| Audit quản trị | Filter URL/ngày, detail che dữ liệu, CSV các dòng đã tải | Admin | Route/read; không gọi CSV trang là export toàn hệ thống |
| Xóa dữ liệu | Filter/detail/yêu cầu Pending/hủy | Admin | Route/read + baseline API QA; không có nút xóa ngay |
| Danh mục | CRUD mềm/search/filter, slug đúng `_`, lỗi được xóa khi mở lại | Admin | FE-0 browser lỗi→sửa→lưu, unit validation, baseline API |
| Ngân hàng & ví | CRUD mềm/bật tắt; định dạng có nháp/pattern/sample/try/clone/activate/archive | Admin | Route/read và baseline QA; không xác minh notification thật từ ngân hàng |
| Phương pháp | Tham số/điều kiện/bước, goal links, home layout/hũ/preview, prompt phiên bản | Admin | Route/read + baseline browser/QA; mutation phức tạp không được chạy lại toàn bộ trong lượt cuối |
| Mẫu mục tiêu/khảo sát | CRUD mềm, câu hỏi/đáp án/thứ tự/showIf/signals | Admin | Route/read + baseline QA; giữ contract hiện hành |
| Cấu hình hệ thống | 24 nhóm, 10 feature flags, recursive typed editor, validation/diff/lý do/history/rollback, giữ trường không chỉnh, 409 giữ draft | Admin | Kiểm đủ 16 nhóm nâng cao; UI lưu v4→5 và API read-back giữ toàn bộ nhóm khác; rollback chưa thực hiện trong lượt cuối |
| Cấu hình AI | Từ điển/luật/tài liệu group, preview/phiên bản | Admin | Route/read; hai alias Rasa chuyển từ điển; không gọi Rasa/unclear đã gỡ |
| Home vận hành | Khối lượng/SLA đội ngũ | ViewDashboard | Route/read và baseline API |
| Ticket | Queue URL/search/filter/SLA, thread/public/internal/attachment, nhận/phân công/ưu tiên/escalate, gom/broadcast có xác nhận | HandleTickets, ManageTickets cho điều phối | Baseline API 49 có luồng ticket; lượt cuối mở ca QA, UUID validation, gom có confirm/cancel, closed chặn broadcast; chưa gửi broadcast/attachment thật |
| Consent/dữ liệu khách | Yêu cầu/duyệt/từ chối/revoke, scope/hạn rõ, ví/giao dịch/ngân sách đọc theo yêu cầu; xóa dữ liệu UI khi mất quyền/hết hạn | Theo ca + capability + consent BE | Baseline QA consent/API; code thêm expiry tick 15s / clear 403; chưa chờ hết hạn thật trên browser trong lượt cuối |
| Đề xuất/câu trả lời mẫu | Tạo/duyệt/từ chối, chống tự duyệt, status; CRUD/tắt mẫu | Capabilities tương ứng | Route/read + baseline QA approve, không gửi khách thật |
| Giám sát | Dịch vụ/sự cố/OCR, timestamp/refresh, incident detail/ack/resolve; provider 24h/7d/upload gaps/error events/trace | ViewMonitoring; diagnostics Admin | Seed Healthy/Disabled, UI ack+resolve và DB read-back; diagnostics có dữ liệu; upstream thật chưa xác minh |
| Audit vận hành | Filter URL/cursor/range, metadata che, detail, retry | ViewOpsAudit | Browser route/read; lỗi 429 bootstrap giữ phiên, retry phục hồi |
| Thống kê AI | Filter/kết quả/nguồn/latency/feedback | ViewAiStats | Route/read; không suy ra chất lượng AI khi mẫu bằng 0 |
| Tri thức | Danh sách/search/filter/detail, nguồn/ngày/text, tạo nháp, duyệt/gỡ, resolve candidate | Staff soạn; Manager/Admin duyệt | UI duyệt doc và Covered candidate; read-back doc approved. Tạo API/UI 503 giữ draft do thiếu embedding; ingest thật còn chặn |
| Giả định | Key/phiên bản/status, tỷ lệ bps, source/asOf, soạn/duyệt/gỡ; Admin refresh economic feeds | Staff soạn; Manager/Admin duyệt | API draft→403 Staff approve→Manager approve→409→retire; UI 650 bps approved, đọc lại. Feed refresh trả Disabled do chưa cấu hình nguồn |
| Dự báo | Accuracy MAE/baseline/coverage/cửa sổ, nhóm ít dữ liệu; feedback snapshot/reason/cause | ViewMonitoring hoặc HandleTickets theo tab | Seed snapshot, UI gán cause data_missing, API đọc lại; không phải đánh giá trên dữ liệu người dùng thực |
| Thị trường | CRUD/toggle/test nguồn, docs, event evidence/approve/reject, nhập correction giá xăng có lý do | Admin | UI sửa nguồn, POST test hiển thị fetch 404 có cấu trúc, reject event, form validation/correction; nguồn crawl thật chưa kiểm |
| Cộng đồng | Reports/images, blob preview có auth, approve/reject ảnh, hide/restore, resolve, mute theo quyền; nội dung vừa xử lý trong phiên | ModerateCommunity; ModerateCommunityImages; MuteCommunityAuthors riêng | UI ảnh synthetic 320×180, approve/reject, hide/restore; DB kiểm bytes reject=0/reportclosed/postvisible. Chưa kiểm pipeline upload/user consent thật; lịch sử moderation cần BE bổ sung nếu muốn tra cứu sau phiên |
| Pháp lý | Section editor/reorder, preview/diff, draft/history, baseUpdatedAt / 409, giữ draft, chỉ Admin publish có confirm phạm vi | ManageLegalDocuments; publish Admin | API save→stale 409→restore; UI lưu draft và read-back; kiểm confirm publish rồi hủy, Manager không thấy publish; chưa thực hiện publish/re-consent |
| Thuê bao | Plan/price/null cycle/free plan/soft stop/resume, thay features/limits; orderfilter/detail/NeedsReview | Manager/Admin + ManageSubscriptionPlans | API CRUD/features/softstop; UI giá 15k / limit 15 đọc lại; order giữ snapshot 12k; Staff craftedroute bị chặn. SePay chưa chạy |
| Đăng nhập/hồ sơ | Login/OTP/refresh/retry/logout/logout-all/password; deep link; cache xóa khi logout | Chỉ vai trò nội bộ | 17 auth response, Admin/Staff/Manager/User thật; deep link/quyền thu hồi. OTP email thật và thay credential chưa chạy |

## Màn chờ API tổng hợp

| Màn | UI phát triển đã có | Trạng thái nguồn thật | Kiểm chứng |
|---|---|---|---|
| KPI `/overview` | Ngày VN/so sánh kỳ, stock vs flow, graph+bảng số liệu, drill aggregate; 0 khác thiếu dữ liệu | Chưa có API; hiển thị chờ nguồn | Unit aggregate/tz/range; browser custom thiếu ngày không crash, khoảng hợp lệ 5 metrics/drill |
| Sync `/sync` | Search/status/pager/detail/queue/error/freshness fields | Chưa có telemetry từ server/mobile | Synthetic 48 rows; browser filter/detail/error và pager 11–20/48 giữ source |
| Bills `/ai-learning` | Metadata/list/detail/filter/pager/review/exclude/confirm 409, consent/retention | Chưa có API; không xem ảnh thật | Synthetic 42 rows; browser xung đột; unit versionguard; không gửi mutation thật |

Minh họa phải bấm bật có chủ đích ở DEV hoặc dùng URL `source=demo` trong DEV; production build bỏ nút và không kích hoạt demo dù URL có tham số. Lỗi API thật không có fallback sang dữ liệu giả. Contract đề xuất và backlog ở [bàn giao backend](dashboard-backend-integration.md).

## Trạng thái nghiệm thu

FE-0→FE-5 đã triển khai trong phạm vi frontend; FE-6 đã có build/lint/test, browser, read-back và tài liệu. Các giới hạn trong bảng là phần tích hợp/nghiệp vụ chưa được chứng minh, không được gộp thành “tất cả end-to-end đạt”. Chưa phát hành production, chưa commit/merge tự động. Báo cáo cuối ở [kết quả thực thi](dashboard-fe-completion-report-2026-11-19.md).
