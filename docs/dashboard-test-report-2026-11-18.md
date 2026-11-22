# Kết quả kiểm thử FinMate Dashboard — 18/11/2026

Backend: `018bbe0`. Dashboard: `7cda220`. Kiểm thử trên đúng mã nguồn hiện tại; không sửa code sản phẩm để làm test đạt. Kế hoạch xử lý hiện hành cho frontend dashboard ở [dashboard-frontend-plan.md](dashboard-frontend-plan.md).

## Môi trường và cách kiểm thử

- Stack chính tiếp tục ở backend 8080/dashboard 5173.
- Stack QA riêng `finmate-dashboard-qa`: backend 8081, dashboard 5174, PostgreSQL main/AI và Redis riêng; dùng cùng image backend/AI mới nhất. Database QA được tạo mới, chỉ có seed và dữ liệu giả lập.
- Dùng tài khoản Admin, Staff, OpsManager và User thật trong database QA; không thay role bằng fixture trình bày khi kiểm tra quyền.
- API quản trị AI gọi AI Service thật của QA; các test backend xUnit có nhiều fake cho AI/Google/email và được phân biệt với kết quả API này.
- Mật khẩu/key QA khác môi trường chính. Không gọi thanh toán, gửi tin cho khách thật, hoặc thay đổi cấu hình/quyền/dữ liệu của stack chính.

## Kết quả tổng hợp

| Lớp kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| Build dashboard | Đạt | TypeScript và production bundle |
| Lint dashboard | Đạt | Không thay thế kiểm thử hành vi |
| `test:contract` | Đạt | 31 endpoint bắt buộc, health, Admin API từ chối request không token |
| `test:auth` có sẵn | Không đạt | Fixture cũ yêu cầu `missionRemindersEnabled` đã bị bỏ |
| Kịch bản API có ghi | 49/49 đạt | Dữ liệu QA, gồm negative cases và kiểm tra trạng thái sau ghi |
| Kiểm tra browser chức năng | 16/20 đạt | 4 ca không đạt: Rasa, Câu chưa hiểu, validation slug, lỗi validation cũ còn tồn tại |
| Tải trang Admin/Ops | 23/25 route không có lỗi tải | Hai route cũ nêu trên; không đồng nghĩa mọi nút của 23 route đã được thử |
| Responsive | 8/8 lượt đo không tràn ngang toàn trang | Users/Finance/System/Categories ở 768px và 390px; bảng có thể cuộn trong vùng riêng |
| Toàn bộ backend xUnit | 3.448 đạt / 11 thất bại / 3.459 ca, không skip | Chạy 29 phút 6 giây; không phải kết quả toàn bộ đạt |
| Nhóm class backend phục vụ quản trị/vận hành | 665/665 đạt | Phân loại theo tên class Admin/Ops/Support/Auth/config/monitoring… trong script tổng hợp; nhiều test dùng fake, không thay cho UI end-to-end |

Đã gặp 429 khi cố tải hàng loạt route bằng full reload trong một cửa sổ giới hạn tần suất. Sau khi qua cửa sổ và bấm thử lại, phiên được phục hồi. Đã chạy lại các route bị ảnh hưởng để tách 429 do tải kiểm thử khỏi hai lỗi 404 thực tế; không nới rate limit của stack chính.

## Các nhóm API đã kiểm chứng trên QA

| Nhóm | Những gì đã chạy |
|---|---|
| Auth | Đăng nhập bốn role; sai mật khẩu; anonymous 401; role sai 403; refresh/rotation/từ chối refresh cũ; logout; logout-all; đổi mật khẩu rồi đăng nhập bằng mật khẩu mới |
| Người dùng | Tìm và phân trang cursor; chống tự khóa/tự đổi role; cấp/khôi phục role; khóa → chặn đăng nhập → mở khóa |
| Ma trận quyền | Cấp ViewDashboard cho Staff thì API mở; thu hồi thì API chặn ngay; cấu hình thiếu quyền phụ thuộc bị từ chối |
| Danh mục | Tạo/sửa/bật tắt/tìm kiếm; slug trùng bị chặn |
| Ngân hàng/ví | Tạo/sửa/bật tắt; provider key bất biến bị chặn nếu đổi |
| Phương pháp/mục tiêu | Tạo/sửa/bật tắt phương pháp; lưu home layout; tạo/sửa/bật tắt template; lưu liên kết phương pháp–template |
| Khảo sát | Tạo câu hỏi có đáp án; sửa câu; thêm/sửa/tắt đáp án; tắt câu hỏi |
| Cấu hình | Save tạo phiên bản mới; stale 409; dữ liệu sai 400; rollback; kiểm tra giữ đủ 24 nhóm/10 cờ sau thao tác UI |
| Secret | Lưu key QA, metadata che giá trị, xóa key khỏi DB QA; không thử gọi nhà cung cấp ngoài |
| Tài liệu AI | Draft/preview/activate; stale active version bị chặn |
| Luật AI | Brand, keyword, item cache, preview; tạo/kích hoạt instruction; sửa brand rồi revert lịch sử |
| Prompt phương pháp | Tạo phiên bản; activate; stale conflict; khôi phục bản cũ |
| Định dạng thông báo | Tạo nháp; chặn kích hoạt khi thiếu mẫu; thêm regex/trường/mẫu; try/check; activate; clone; archive |
| Học AI | Feedback list hoạt động; xác nhận route unclear/Rasa đã gỡ trả 404 |
| Ticket | Khách tạo; Staff nhận; public reply và internal note tách biệt; khách không thấy ghi chú nội bộ; đổi ưu tiên/chuyển cấp/phân công; resolve/rating/close |
| Consent | Chưa có consent bị 403; khách approve thì đọc được ví/giao dịch/ngân sách; có access log; revoke thì đọc bị chặn lại |
| Đề xuất | Tạo đề xuất mở khóa; người đề xuất không tự duyệt; người thứ hai duyệt và thực hiện mở khóa |
| Câu trả lời mẫu | Tạo/sửa/tắt; tìm được bản đã tắt khi yêu cầu includeInactive |
| Xóa dữ liệu | User yêu cầu xóa mềm; Admin thấy Pending và hủy; tài khoản được khôi phục |
| Audit/monitoring | Mutation có audit; đọc Ops audit, service status, incident list và OCR stats |

Các phản hồi 400/401/403/409/422 được đánh giá theo contract cụ thể. Một số giả định ban đầu trong script khảo sát được sửa sau khi đối chiếu contract, ví dụ enum snake_case ở response, mã secret từ metadata, survey cần ít nhất hai đáp án và API tạo keyword trả 201. Các lần dò đó không được báo là lỗi sản phẩm; kết quả nghiệp vụ cuối là 49 ca đạt.

## Kiểm chứng trực tiếp qua browser

Đã thực hiện login Admin; tạo danh mục bằng form; sửa phương pháp với enum đúng; sửa và lưu bố cục trang chủ; lưu cấu hình kèm lý do và xem lịch sử. Đã đọc lại API để xác nhận tên phương pháp, tiêu đề khối và cấu hình được lưu thật.

Đã thử dirty form → đóng → xác nhận bỏ; Ctrl+K → tìm trang → Enter; đổi light/dark; rate-limit retry; tab feedback. Staff và OpsManager đăng nhập thật thấy đúng home/menu, Staff truy cập URL Admin bị chuyển về phần vận hành. User thường bị báo không có quyền truy cập console.

## Lỗi dashboard đã tái hiện

### UI-01 — Quy tắc slug frontend trái với backend

Vị trí: `src/app/CorePages.tsx:35`; đối chiếu `FinMate_BE/backend/FinMate.Application/Admin/Commands/CreateSystemCategoryCommandValidator.cs:13`.

1. Mở thêm danh mục, nhập `qa_ui_slug` và bấm Lưu.
2. Frontend chặn, thông báo có thể dùng dấu gạch nối.
3. Đổi sang `qa-ui-category`: frontend cho gửi nhưng backend từ chối, yêu cầu chữ thường/số/dấu gạch dưới.
4. Slug chỉ có chữ `qauicategory` lưu thành công.

Ảnh: `outputs/finmate-dashboard-test-2026-11-18/screenshots/slug-contract-error.jpg` tại workspace Capstone.

Ảnh hưởng: không thể tạo/sửa một số slug hợp lệ với backend; không có chỉ dẫn nhập đúng nhất quán. Ưu tiên sửa trước khi làm lại form.

### UI-02 — Lỗi validation cũ còn hiện sau khi lưu thành công

Vị trí: `src/app/CorePages.tsx`, vòng đời `open/save` của CatalogPage.

Nhập slug sai → sửa thành giá trị hợp lệ → lưu thành công → mở sửa lại dòng vừa lưu. Dialog vẫn hiện lỗi từ lượt nhập trước. Cần clear error khi mở mới và khi lưu thành công; bảo vệ riêng thông báo xung đột cần giữ sau reload.

### UI-03 — Rasa gọi API đã gỡ

`/settings/ai/rasa` gọi `/admin/rasa/status` trả 404; nút parse cũng trỏ route không còn. Backend TASKS Phase 79 xác nhận Rasa đã bị bỏ ngày 09/11/2026, thay bằng bộ phân loại ý định trong tiến trình. Đây là frontend lỗi thời, không phải yêu cầu khôi phục Rasa.

### UI-04 — Tab Câu chưa hiểu gọi API đã gỡ

`/ai-learning` mở mặc định vào `/admin/ai-learning/unclear`, trả 404. Tab phản hồi người dùng vẫn hoạt động. Màn lỗi còn đồng thời hiện empty state “Chưa có câu nào cần xem lại”, dễ khiến người dùng hiểu sai.

### QA-01 — Fixture auth và môi trường browser test cần cập nhật

`test:auth` dừng tại `/users/me` vì field `missionRemindersEnabled` không tồn tại. Bộ browser smoke có sẵn cũng chưa được cập nhật cho Rasa bị gỡ; lượt trước đã dừng ở trang này. Trong đợt này dùng khảo sát CUA riêng để đi hết 25 route và thử mutation, không sửa/bỏ assertion của suite để báo xanh.

Vite watcher có thể chết khi browser suite tạo `.chrome-qa` trong repo và Chrome khóa file cache. Launcher QA lần này bỏ qua cache đó; cần sửa cấu hình chính thức.

## Các ca backend cần phân loại

Lượt toàn bộ đã thực thi 3.459 ca, 3.448 đạt và 11 thất bại. Chưa sửa hoặc kết luận nguyên nhân gốc trong nhiệm vụ kiểm thử/lập kế hoạch này; cần đối chiếu spec hiện hành để phân biệt lỗi hành vi, dữ liệu seed và kỳ vọng test lỗi thời. Danh sách đầy đủ có trong `backend-summary.json`.

| Khu vực | Ca thất bại / tín hiệu |
|---|---|
| Hint/chuyển ví — 2 ca | `AnalyzeNotificationDuplicateTests.TheAiTransferHint_IsStoredForBothDirections`: hint chuyển ví không được giữ như test yêu cầu; `TransferScenarioTests.B_AtmWithdrawal_IsSuggestedIntoCash_AndMovesTheMoneyThere`: NullReferenceException |
| Chọn phương pháp | `MethodSelectionOnSeedDataTests.TheExampleProfileInTheMdFile_GetsCashFlowBudget_WithASmallEmergencyBufferAsSupport`: phương pháp chính khác kỳ vọng. Backend TASKS đã có ghi nhận ca chọn phương pháp đỏ từ trước |
| Báo cáo dòng tiền khoản vay | `ReportsControllerTests.LoanTransactions_CountAsRealCashFlow_ButStayOutOfTheCategoryBreakdown`: tổng chi khác kỳ vọng test |
| Hoàn/đảo giao dịch — 6 ca | Ba ca `RefundNotificationTests`: thiếu hint/danh sách ứng viên, một ca lỗi do danh sách null; thêm `RefundScenarioTests.FullRefundFromANotification`, `ReversalFromANotification`, `PartialRefundOf300k` thất bại |
| Tự xác nhận thông báo | `NotificationsControllerTests.Analyze_HighConfidenceFinancialNotification_AutoCommitsAndUpdatesBalance`: nhận Draft khi test chờ Confirmed |

Các tín hiệu trên ảnh hưởng luồng nghiệp vụ tài chính/AI và độ tin cậy của KPI, cần được triage trước khi chốt số liệu cho dashboard. Không quy tất cả thành lỗi frontend; không sửa test theo output hiện tại khi chưa đối chiếu yêu cầu.

## Những phần chưa kết luận là hoàn tất

- OTP qua email thật, Google sign-in thật, FCM, Gemini/OpenRouter, SePay sandbox/production.
- Hiệu quả model phân loại, OCR hoặc STT với dữ liệu thực tế; test dashboard không thay cho đánh giá chất lượng mô hình.
- UI từng biến thể sâu của mọi form JSON; gộp/broadcast nhiều ticket từ UI; attachment thật; tạo draft hỗ trợ từ UI; đóng incident đang mở. Các vùng này có test backend ở mức khác nhau, nhưng chưa được báo là đã thử toàn bộ UI end-to-end.
- Hiệu năng dữ liệu lớn, audit export toàn bộ, toàn bộ breakpoint/light-dark, người dùng sửa đồng thời qua hai browser thật.
- Sync telemetry, mẫu hóa đơn, aggregate KPI và các màn chưa có; đây là backlog trong kế hoạch, không phải tính năng đã có được test pass.

## Artifacts và tái chạy

Thư mục workspace: `D:/Capstone/outputs/finmate-dashboard-test-2026-11-18/`.

- `api-functional-results.json`: 40 kịch bản API ban đầu, request/status/error code và fixture ID giả lập.
- `api-extra-results.json`: 9 kịch bản bổ sung, gồm read-back sau thao tác UI.
- `browser-results.json`: 25 route, 20 kiểm tra browser và 8 lượt responsive.
- `screenshots/`: lỗi slug, lịch sử cấu hình đã lưu, tablet và mobile.
- `backend-summary.json`: kết quả cuối, nhóm class phục vụ dashboard và 11 ca thất bại; `backend.trx.gz`: TRX đầy đủ đã nén và kiểm tra toàn vẹn.

Môi trường QA: `D:/Capstone/.local-run/dashboard-qa/compose.yml`, cấu hình/key chỉ nằm trong thư mục local đó. Các script tạo/sửa dữ liệu chỉ được dùng với QA này.

```powershell
docker compose -f D:/Capstone/.local-run/dashboard-qa/compose.yml up -d --wait
node D:/Capstone/.local-run/dashboard-qa/server.mjs
```

Chỉ khởi động server khi cổng 5174 trống. Script API tạo fixture mới; script extra có kiểm tra dữ liệu do thao tác browser tạo nên cần đọc thứ tự và fixture hiện hành trước khi chạy. Không đổi base URL sang stack đang dùng.
