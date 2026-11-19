# Kết quả hoàn thiện frontend dashboard

Thực hiện 18–19/11/2026 trên nhánh `codex/dashboard-fe-completion`, từ baseline dashboard `7cda220`, backend đối chiếu `018bbe0`. Phạm vi: **frontend web dashboard**. Không sửa logic backend/mobile, không tự commit/merge/deploy. Backend Docker và dashboard local đã được khởi động lại; trang chính tại `http://127.0.0.1:5173`.

## Kết quả bàn giao

Đã triển khai FE-0→FE-5 và hoàn tất hồ sơ kiểm thử FE-6 theo [kế hoạch](dashboard-frontend-plan.md). [Ma trận tính năng](dashboard-feature-matrix.md) ghi riêng UI/API/E2E từng màn. Các phần chưa có nguồn hoặc chưa kiểm chứng nghiệp vụ không được tính là tích hợp hoàn tất.

- Nền chung: query cache/cancel/retry, stale/error/empty/refresh, bộ lọc và phân trang trên URL; thông báo lỗi form có liên kết/focus, dialog giữ draft và cảnh báo rời trang gồm browser Back.
- Phiên/quyền: chờ `/ops/me` cả với Admin, giữ deep link sau login/reload, tải lại quyền cập nhật menu/route, logout xóa cache, User bị từ chối console. Staff không được quản lý gói qua URL tự nhập.
- Hoàn thiện các điểm FE của màn hiện có: validation/lỗi cũ, filter/tab, audit và phạm vi CSV; bảo vệ thao tác nhiều ticket; dữ liệu khách theo scope/hạn consent.
- Home theo việc cần xử lý, ngày lịch Việt Nam và lỗi từng widget; không trình bày danh sách 5 dòng như tổng hệ thống. Cấu hình đủ 24 nhóm/10 cờ, editor có kiểu/diff/lý do/conflict, giữ trường không chỉnh. Diagnostics provider/error/trace và giám sát dịch vụ dùng chung.
- Thêm 7 module API thật: tri thức, giả định kinh tế, dự báo, thị trường, cộng đồng, pháp lý, thuê bao. Có read/detail/mutation và quyền theo contract hiện hành.
- KPI tổng thể, sync telemetry, mẫu hóa đơn có giao diện phát triển đầy đủ tìm/lọc/pager/detail và kịch bản lỗi/xung đột. Chỉ bật dữ liệu giả có chủ đích trong DEV; chế độ thật chờ API. Không fallback từ API lỗi sang fixture.
- Sửa lỗi phát hiện khi QA: login làm mất deep link, pager URL tự xóa offset của chính nó, Test nguồn thị trường gọi sai GET thay vì POST, khôi phục cộng đồng mất điểm truy cập sau khi report rời queue, và tab cấu hình tràn ngang ở tablet.

## Môi trường và dữ liệu

| Môi trường | FE | BE | Sử dụng |
|---|---|---|---|
| Chính local | 5173 | 8080 | Mở sẵn trang đăng nhập cho chủ dự án; không mutation dữ liệu thật trong lượt QA |
| QA riêng | 5174 | 8081 | DB/Redis/AI riêng, tài khoản Admin/Staff/OpsManager/User tổng hợp; chỉ mutation môi trường này |

QA dùng ảnh tự tạo 320×180 và các record seed tổng hợp cho queue/review. Seed trực tiếp không chứng minh pipeline upload/ingest. OTP trên QA vốn không bắt buộc; không tắt chính sách bảo mật để chạy test. Không gửi email/FCM cho người thật, không trả lời khách thật, không thanh toán hoặc xuất bản điều khoản thật.

## Kiểm tra tự động

| Kiểm tra | Kết quả | Ý nghĩa |
|---|---|---|
| `npm run lint` | Đạt | ESLint/React hooks |
| `npm run build` | Đạt | TypeScript + Vite production; main 247,93 kB / gzip 72,86 kB, các module mới lazy-load |
| `npm run test:frontend` | 16/16 đạt | Ngày VN/cuối ngày/ngày sai, KPI flow vs snapshot/0 vs thiếu, payload phân trang/URL regression, form/quyền/schema, demo409, slug, watcher |
| `npm run test:contract` trên QA | 84 endpoint + health + 401 đạt | Method/path hiện diện trong Swagger; không thay thế test nghiệp vụ |
| `npm run test:auth` trên QA | 17 response đạt | Login Admin và cấu trúc response fixture, logout phiên test |
| `test:modules` với mutation QA ngày 18/11 | 62 kiểm tra status/assertion đúng kỳ vọng | Có role403, approve lặp409, plan/features/softstop, legal save/stale409/restore. Bao gồm một503embedding được ghi giới hạn, **không phải tạo tri thức thành công** |
| API read-back sau thao tác UI ngày19/11 | 9/9 assertion đạt | Gói/giá/features, đơn snapshot, legaldraft, giả định, KB approval, forecastlabel, marketsource,config |
| DB read-back sau thao tác UI | Đạt | Communityvisible/reportupheld, imageapproved/rejectedbytes0, incidentresolved, marketeventrejected, candidateCovered |
| `git diff --check`, `node --check` các runner | Đạt | Không có lỗi whitespace/syntax; Git chỉ nhắc LF→CRLF ở một số file |

Không chạy lại bộ backend 3.459 ca trong đợt FE. Mốc lịch sử vẫn là 3.448 đạt / 11 lỗi, cần xử lý khi sang backend. Runner Chrome `test:browser` cũ đã chỉnh contract nhưng **không chạy lại trong lượt cuối**; dùng kiểm tra browser trực tiếp bên dưới. Không gộp kết quả baseline với lượt kiểm tra mới để tăng số pass.

## Kiểm tra browser và read-back

Ngày 19/11 đã kiểm lại **29 route** trong sidebar Admin, có heading đúng và không có alert sau khi tải. Khi mở lại nhiều trang liên tục gặp 429 ở bước tải quyền; ứng dụng giữ phiên, hiển thị thử lại và phục hồi thành công. Chuyển tiếp qua sidebar tránh bootstrap lại phiên ở mỗi màn.

**14 kiểm tra tập trung** được lưu thành JSON: phân trang demo 11–20/48 giữ chế độ nguồn; tab cấu hình tablet không tràn; refresh nguồn kinh tế có xác nhận và trả Disabled do chưa cấu hình nguồn; xác nhận xuất bản nêu ảnh hưởng và được hủy; UUID ticket sai bị chặn; gom ticket có xác nhận và được hủy, ca đóng chặn broadcast; KPI thiếu ngày/hợp lệ/drill-down; mobile không tràn; Staff giữ deep link/không có nút duyệt/bị chặn gói; Manager có nháp/không có publish; User bị từ chối. Không thực hiện mutation gom/broadcast/publish chỉ để kiểm nút.

Các luồng đã thao tác trong ngày 18/11 và đọc lại kết quả 19/11:

| Luồng | Quan sát / đối chiếu |
|---|---|
| Config | Mở 16 nhóm nâng cao; 10 feature flags; lưu listener history 90→91, version 4→5; mọi trường khác giữ nguyên theo diff read-back |
| Tri thức/giả định | Duyệt KB seed, resolve candidate Covered; tạo/duyệt giả định 650 bps; tạo KB gặp 503, UI giữ draft/báo lỗi |
| Forecast | Có accuracy seed; gán feedback cause `data_missing`, status `labeled` |
| Cộng đồng | Blob ảnh có auth; duyệt một ảnh/từ chối một ảnh tổng hợp; hide→restore bài viết khi report rời queue |
| Legal | Lưu nháp tiêu đề QA, xem preview; dirty sidebar/browser Back bị chặn; API test stale 409. Không publish |
| Thuê bao | Sửa giá 15.000đ / feature limit 15, soft stop; đơn NeedsReview vẫn giữ snapshot 12.000đ |
| Thị trường/monitoring | Sửa nguồn; Test POST nhận warning fetch 404 từ example.org, không coi là crawl thành công; reject event; fuel validation/correction; incident ack→resolve |
| Role thực | Thu hồi ViewAiStats của Manager, bấm tải lại quyền, menu/route bị chặn; khôi phục đúng baseline và kiểm tra lại |
| Demo | Sync search/filter/detail/error; bill 409; KPI render. Pager và custom date được kiểm lại sau sửa ở lượt 19/11 |

Chi tiết mutation CRUD/Ops cũ dùng thêm baseline 49 kịch bản API QA và báo cáo FE-0; lượt cuối xác nhận tải màn và các điểm hồi quy liên quan, **chưa lặp mọi mutation cũ từ browser**. Các kiểm tra nháp/role ngày 18/11 được ghi nhận thủ công; mảng log browser cũ trong bộ nhớ không còn sau khi môi trường khởi động lại, nên số 29/14 trong báo cáo chỉ tính file bằng chứng mới.

## Responsive và khả năng sử dụng

- Desktop 1440×1000 dark/light, tablet 768×1024 và mobile 390×900. Ở tablet, content 753/scroll 753px; tab nội bộ 705/scroll 842px, cuộn trong khung. Mobile content 375/scroll 375px, document 390px.
- Bảng rộng có khung cuộn; sidebar overlay ở màn nhỏ; ảnh preview co theo khung; reduced motion và vùng chạm 44px trên coarse pointer.
- Form lỗi có summary/link tới field, nhãn/aria; dialog focus trap/Escape/khôi phục focus; dirty navigation/Back kiểm trực tiếp. Biểu đồ KPI có bảng số liệu/định nghĩa để đọc bằng bàn phím.
- Review React: hooks/lint/typecheck đạt; query cancellation/cache, listener/timer/blobURL cleanup, stable row keys, module lazy-load. Đây không phải audit WCAG toàn diện hoặc load test.

![Dashboard desktop QA](../../outputs/finmate-dashboard-completion-2026-11-18/browser/home-desktop-dark.jpg)

## Bằng chứng lưu trên workspace

Thư mục `D:/Capstone/outputs/finmate-dashboard-completion-2026-11-18` giữ tên ngày bắt đầu; có cả kết quả 18 và 19/11:

- `module-api-results.json`: 62 kiểm tra status API đúng kỳ vọng, gồm cả 403/409 và 503 embedding được báo riêng.
- `browser-routes.json`: 29 route kiểm lại ngày 19/11.
- `browser-focused-checks.json`: 14 kiểm tra tập trung ngày 19/11.
- `config-readback.json`: version 4→5, 24 nhóm/10 cờ, trường khác giữ nguyên.
- `ui-api-readback.json`, `ui-db-readback.json`: đọc lại sau mutation UI.
- `verification-summary.json`: tổng hợp lệnh đã chạy.
- `browser/home-desktop-dark.jpg`, `home-desktop-light.jpg`, `home-mobile-dark.jpg`, `config-tablet-dark.jpg`, `economic-feed-disabled.jpg`.

## Việc còn lại khi sang backend

1. Cấu hình embedding provider QA, chạy lại tạo tài liệu hoàn chỉnh; hiện lỗi 503 đã được xử lý ở FE.
2. Phân loại/sửa 11 ca backend đỏ baseline.
3. Chốt/triển khai API tổng hợp KPI, sync telemetry và bill metadata/consent/retention/version; sau đó thay adapter DEV.
4. Kiểm chứng dịch vụ ngoài: OTP email, FCM, Google Vision/LLM, nguồn kinh tế/thị trường thật, SePay; legal publish/re-consent và rollback config trong môi trường nghiệm thu phù hợp.
5. Nếu cần tra cứu lại toàn bộ nội dung cộng đồng đã gỡ sau khi rời trang, bổ sung API lịch sử/search moderation. FE chỉ giữ danh sách vừa xử lý trong lần mở màn.

Contract đề xuất, policy, lỗi và điều kiện nghiệm thu chi tiết ở [bàn giao backend](dashboard-backend-integration.md). Invite tài khoản/VietQR/train-eval-promote vẫn là mục mở rộng chưa đưa vào phạm vi bắt buộc.
