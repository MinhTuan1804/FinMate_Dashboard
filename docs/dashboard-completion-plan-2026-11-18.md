# Kế hoạch hoàn thiện FinMate Console

> Bản tham khảo trước khi chốt lại phạm vi. **Kế hoạch hiện hành chỉ cho FE dashboard:** [dashboard-frontend-plan.md](dashboard-frontend-plan.md). Dùng thứ tự và tiêu chí trong bản mới để thực thi.

Ngày lập: 18/11/2026. Cập nhật thứ tự theo chủ dự án: **hoàn thiện FE trước, sau đó hoàn thiện BE trong một đợt riêng**. Căn cứ: dashboard `7cda220`, backend `018bbe0`, Swagger đang chạy và đợt kiểm thử trên QA riêng. Kết quả chi tiết ở [báo cáo kiểm thử](dashboard-test-report-2026-11-18.md).

## Mục tiêu và phạm vi

Hoàn thiện toàn bộ giao diện và luồng tương tác của web quản trị/vận hành trước. API hiện có được tích hợp trong giai đoạn FE. Màn chưa có API vẫn được làm đầy đủ bằng contract đề xuất và dữ liệu giả lập dành riêng cho phát triển; các nhu cầu backend được ghi thành backlog để triển khai cùng nhau sau khi FE được nghiệm thu.

Giữ một console và sidebar chung, nhóm menu theo công việc và quyền hiệu lực. Rasa và gamification đã được loại khỏi phạm vi. Theo dõi riêng ba trạng thái của mỗi chức năng: **giao diện/luồng đã hoàn thiện**, **đã tích hợp API thật**, **đã kiểm chứng end-to-end**.

Đợt này là kiểm thử và lập kế hoạch; chưa triển khai các thay đổi sản phẩm dưới đây. Thời lượng là ước lượng sơ bộ theo ngày làm việc của một lập trình viên đã quen dự án, gồm triển khai và kiểm thử; không phải cam kết lịch giao.

## Thứ tự thực hiện

| Đợt | Kết quả cần có | Cách xử lý phụ thuộc | Ước lượng sơ bộ |
|---|---|---|---|
| FE-0 | Dọn lỗi FE đang có và đồng bộ contract/test frontend | Dùng backend hiện tại | 1–2 ngày |
| FE-1 | Đủ cấu hình/quyền, giám sát và Home hữu ích | Tích hợp API đã có; aggregate mới dùng adapter giả lập trong phát triển | 4–7 ngày |
| FE-2A | Tri thức, giả định kinh tế, chất lượng dự báo | API đã có; hoàn thiện cả trạng thái lỗi/quyền/xung đột | 3–5 ngày |
| FE-2B | Thị trường, cộng đồng, pháp lý | API đã có; nội dung thử và thao tác ghi dùng QA | 5–8 ngày |
| FE-2C | Console gói đăng ký và đơn thanh toán | Hoàn thiện UI với API/fixture; kiểm chứng SePay thật ở giai đoạn BE | 2–3 ngày cho console |
| FE-3 | Giao diện các phần còn thiếu API; polish và regression FE | Contract đề xuất + fixture; chốt danh sách màn thuộc phạm vi trước khi làm | Ước lượng sau khi chốt từng màn |
| BE-1 | Xử lý 11 ca test backend đỏ và các lệch contract đã ghi trong giai đoạn FE | Bắt đầu sau nghiệm thu FE; phân loại đúng spec trước khi sửa | Ước lượng sau triage |
| BE-2 | Bổ sung API/aggregate/telemetry còn thiếu và thay adapter giả lập bằng nguồn thật | Làm theo backlog tích hợp đã chốt từ FE | Ước lượng theo contract |
| BE-3 | Kiểm chứng tích hợp ngoài, end-to-end và bàn giao toàn hệ thống | QA riêng, sandbox và môi trường đích phù hợp | Ước lượng sau BE-1/2 |

**Thứ tự thực thi: FE-0 → FE-1 → FE-2 → FE-3 → nghiệm thu FE → BE-1 → BE-2 → BE-3.** 11 ca backend đỏ được giữ trong backlog của giai đoạn BE. Khi API lỗi hoặc còn thiếu làm gián đoạn phát triển FE, dùng fixture qua adapter phát triển và ghi rõ vấn đề cần xử lý sau. Nghiệm thu end-to-end toàn hệ thống nằm ở BE-3.

## Quy ước để hoàn thiện FE mà không bị chặn bởi BE

- Component gọi một lớp service/adapter có kiểu dữ liệu rõ. API đã có dùng adapter HTTP; API còn thiếu dùng adapter giả lập cùng interface khi bật chế độ phát triển.
- Chế độ giả lập phải được bật có chủ đích và nhận biết rõ bằng nhãn “Dữ liệu minh họa”. Khi API thật lỗi, hiển thị lỗi thật; việc lỗi mạng/403/500 không được tự chuyển sang dữ liệu giả lập.
- Fixture có dữ liệu đủ để thử tìm/lọc/phân trang, loading/empty/error, validation, quyền và xung đột. Các thay đổi giả lập chỉ nằm trong môi trường phát triển/QA.
- Mỗi màn thiếu API đi kèm đề xuất request/response, quy tắc quyền, filter/pagination, mã lỗi, trạng thái và ý nghĩa số liệu. Đánh dấu contract đề xuất; đối chiếu và chốt ở giai đoạn BE.
- Với KPI/trend, FE được hoàn thiện bố cục và tương tác trên fixture. Môi trường dùng API thật chỉ hiển thị số liệu có nguồn thật hoặc trạng thái chưa kết nối phù hợp.
- Bàn giao FE kèm ma trận từng màn: tình trạng UI, adapter đang dùng, contract, test đã chạy và phần BE còn chờ. Đây là đầu vào của đợt hoàn thiện BE.

## FE-0 — Sửa các lỗi đã tái hiện

| ID | Công việc | Cách nghiệm thu |
|---|---|---|
| FIX-01 | Gỡ tab/redirect/call Rasa; gỡ hoặc thay tab “Câu chưa hiểu” theo bộ phân loại ý định hiện tại | Không gọi `/admin/rasa/*` và `/admin/ai-learning/unclear`; trang Học AI mở được với dữ liệu còn có; smoke route không 404 |
| FIX-02 | Khớp validation slug danh mục với BE `^[a-z0-9_]+` và các giới hạn thật của validator | Tạo/sửa slug có `_` thành công; `-` bị báo đúng ngay tại trường; mở danh mục hợp lệ có `_` rồi lưu không bị frontend chặn |
| FIX-03 | Xóa lỗi cũ sau lưu thành công và khi mở một bản nhập mới | Tái hiện nhập sai → sửa đúng → lưu → mở lại: không còn thông báo lỗi trước đó |
| FIX-04 | Cập nhật fixture profile bỏ `missionRemindersEnabled`; đối chiếu lại fixture với contract hiện tại | `test:auth` đạt trên QA; không bỏ assertion chỉ để che lỗi thật |
| FIX-05 | Bỏ qua `.chrome-qa`/cache QA trong watcher Vite hoặc đưa browser profile hoàn toàn ra ngoài repo | Browser suite không làm dev server chết vì EBUSY trên Windows |
| FIX-06 | Sửa mô tả “chờ backend” ở đồng bộ danh mục và trạng thái dịch vụ | Nêu đúng sync tự động đang có; trạng thái dùng `/ops/monitoring/status`; không đưa khóa service nội bộ vào browser |
| FIX-07 | Chuẩn hóa error/loading/empty và xử lý retry | API lỗi không đồng thời hiện thông báo “không có dữ liệu”; lỗi từng widget rõ; 429 không làm mất phiên; sửa retry thành công nhưng lỗi cũ còn tồn tại |

Điểm sửa chính: `src/app/CorePages.tsx`, `SettingsPages.tsx`, `LearningPanels.tsx`, `tests/fixtures/admin-contract.json`, `vite.config.ts`, các script kiểm thử và README.

## FE-1 — Nền tảng, cấu hình, giám sát và Home

### CFG-01 — Hoàn thiện schema cấu hình

Backend trả 24 nhóm; frontend hiện khai báo 8 nhóm. Bổ sung editor theo công việc cho:

- `notificationPipeline`, `listenerHealth`, `monitoring`.
- `forecast`, `agent`, `assistant`.
- `groups`, `support`, `community`.
- `economicFeeds`, `marketData`.
- `categories`, `refunds`, `duplicates`, `transfers`, `snapshots`.

Bổ sung sáu cờ: `groups`, `support`, `marketAlerts`, `community`, `subscriptions`, `groupFunds`. Giữ kiểm tra phụ thuộc, ví dụ quỹ nhóm cần cả nhóm và quỹ nhóm được bật.

Nguồn chuẩn: `FinMate_BE/backend/FinMate.Application/Admin/SystemConfig/SystemConfigDocument.cs`, validator tương ứng và API thật. Không tạo bản sao schema trong nhiều component; tách DTO/API mapping khỏi form. Các proxy JSON của AI cần fixture có cấu trúc rõ vì OpenAPI chưa mô tả đầy đủ mọi payload.

Nghiệm thu: lưu từ từng nhóm giữ nguyên nhóm không sửa; giữ đủ 24 nhóm/10 cờ; có lỗi tại trường, diff trước lưu, lý do, lịch sử, rollback; hai phiên sửa cùng lúc xử lý 409 rõ ràng. Đợt QA đã xác nhận form cũ hiện giữ được các nhóm chưa có control khi lưu; đây là hành vi phải bảo vệ khi refactor.

### ACL-01 — Quyền và điều hướng

- Bổ sung nhãn và màn cho `ModerateCommunity`, `MuteCommunityAuthors`, `ManageSubscriptionPlans`, `ManageLegalDocuments`.
- Lấy quyền hiệu lực từ `/ops/me`; kiểm cả menu, route và API, bao gồm thu hồi quyền khi người dùng đang đăng nhập.
- Kho tri thức/giả định nằm dưới prefix `/admin` nhưng một số thao tác cho Staff soạn và Manager duyệt; đối chiếu policy controller thay vì suy quyền từ đường dẫn.
- Hành động không đủ quyền có lời giải thích; dữ liệu tài chính khách vẫn qua consent từng ticket, không biến console thành công cụ xem toàn bộ tài chính của mọi người.

Nghiệm thu với tài khoản Admin, Staff, OpsManager và User thật trên QA; không chỉ dùng fixture thay role frontend.

### MON-01 — Chất lượng thông báo và lỗi kỹ thuật

Tái sử dụng trang giám sát hiện có; thêm:

| Tab | API | Luồng cần có |
|---|---|---|
| Dịch vụ/sự cố/OCR | `/ops/monitoring/*` | Làm mới, thời điểm cập nhật, nhận/đóng sự cố; thông báo stale |
| Chất lượng provider | `/admin/monitoring/provider-formats` | 24h/7d, tỷ lệ đọc được, upload gap theo app version; liên kết sang định dạng cần sửa |
| Lỗi kỹ thuật | `/admin/monitoring/error-events` | Lọc service/exception/thời gian, phân trang, traceId; chỉ role phù hợp xem |

Nghiệm thu đủ healthy/unhealthy/unknown/disabled, empty, error và 403; không hiển thị 0 thay cho lỗi tải. Không coi probe healthy là đã kiểm chứng dịch vụ thanh toán/email/AI bên ngoài.

### HOME-01 — Tổng quan theo hành động

- Đặt ticket trễ SLA/chưa phân công, incident mở, nội dung chờ duyệt và lỗi provider ở vị trí ưu tiên.
- Mỗi KPI dẫn tới danh sách có filter tương ứng; hiển thị định nghĩa, khoảng đo và updatedAt.
- Sửa “Hôm nay” thành ngày Việt Nam thực sự hoặc đổi nhãn thành “24 giờ”; custom range dùng ranh giới ngày `Asia/Ho_Chi_Minh`, kiểm tra from ≤ to và ngày kết thúc trọn vẹn.
- Tách dữ liệu/lỗi/loading theo widget; hủy hoặc bỏ response cũ khi đổi range; không để số cũ mang nhãn ngày mới.
- Thêm làm mới; nếu polling thì dừng khi tab ẩn và tránh đồng loạt gửi request.
- Hoàn thiện UI KPI người dùng/giao dịch, delta kỳ trước và trend bằng fixture có định nghĩa rõ. Tích hợp aggregate API thật ở BE-2; không suy tổng từ một trang cursor hoặc đưa số minh họa vào chế độ dữ liệu thật.

Nghiệm thu FE với fixture có phát sinh và dữ liệu QA của các API đã có; kiểm tra đổi range nhanh, timezone, partial failure, 429 và không có số liệu. Kiểm chứng số liệu aggregate thực tế ở giai đoạn BE.

## FE-2 — Hoàn thiện các màn đã có API

| ID / Màn | API chính | Luồng và tiêu chí nghiệm thu |
|---|---|---|
| KB-01 Kho tri thức AI | `/admin/knowledge/documents`, `/candidates` | Danh sách/tìm/lọc; nguồn/ngày/nội dung; draft → approve → retire; xử lý candidate; Staff soạn, người có quyền duyệt; câu trả lời chỉ dùng bản đã duyệt |
| ECON-01 Giả định kinh tế | `/admin/assumptions` | Theo key và phiên bản; rate bps/đơn vị/nguồn/asOf; tạo/duyệt/gỡ; không nhầm bps với phần trăm; xử lý version mới thay bản đang dùng |
| FCST-01 Chất lượng dự báo | `/ops/forecast/accuracy`, `/feedback` | Khoảng đo, định nghĩa độ chính xác, danh sách feedback và gán nhãn; phân biệt chưa đủ dữ liệu với 0% |
| MKT-01 Thị trường | `/admin/market-events`, `/market-sources`, `/market-documents`, `/fuel-prices`, `/economic-feeds/refresh` | Nguồn tin tạo/sửa/bật tắt/test; hàng đợi approve/reject; nội dung thu thập; sửa giá xăng; trạng thái refresh và lỗi nguồn; không tự coi dữ liệu mới thu thập là đã duyệt |
| COM-01 Cộng đồng | `/ops/community/*` | Report, ảnh, preview nội dung; approve/reject; hide/restore; mute tác giả đúng capability; có lý do/audit theo contract và xử lý nội dung đã được người khác xử lý |
| LEGAL-01 Văn bản pháp lý | `/ops/legal/versions`, `/draft`; `/admin/legal/draft/publish` | Soạn văn bản thuần, preview/diff/lịch sử; 409 khi hai người sửa; chỉ Admin publish; giải thích việc yêu cầu người dùng đồng ý lại; nội dung có người phụ trách duyệt trước phát hành |
| SUB-01 Thuê bao | `/ops/subscriptions/features`, `/plans`, `/orders` | Gói/giá/quyền/hạn mức, trạng thái bán, đơn theo trạng thái/NeedsReview; không cho bật bán gói rỗng; hiển thị rõ trạng thái chưa đối soát |

Lưu ý “Kiến thức” hiện tại trong cấu hình AI chỉ là item cache; không dùng nó thay màn quản trị kho RAG. Trang định dạng thông báo đã có và đã được thử luồng draft → pattern/field/sample → check → activate → clone/archive; cần bổ sung quan sát chất lượng quanh luồng này, không viết lại từ đầu.

Hoàn thiện giao diện và trạng thái xử lý của các tích hợp này trong giai đoạn FE. SePay thật, OTP email thật, FCM và Gemini bên ngoài được kiểm chứng ở BE-3. Trước khi bật thuê bao thật cần chạy sandbox IPN/đối soát/hoàn tác/thất bại và chốt các phần sản phẩm/pháp lý đã ghi trong backend TASKS.

## FE-3 — Hoàn thiện giao diện các phần còn thiếu API

| ID | Phạm vi cần chốt | Làm ở FE trước | Hoàn thiện ở BE sau |
|---|---|---|---|
| DATA-01 KPI tổng thể | Định nghĩa active user, giao dịch, timezone và phạm vi | KPI/trend/bộ lọc/drill-down trên fixture; contract aggregate đề xuất | Aggregate endpoint, nguồn dữ liệu và test số liệu |
| SYNC-01 Local-first | Telemetry thiết bị và thời hạn dữ liệu | Bảng hàng đợi, freshness, lỗi, chi tiết thiết bị; fixture đủ online/offline/unknown | Ingest/query và phối hợp mobile; tận dụng listener-health đã có |
| LEARN-01 Mẫu hóa đơn | Metadata hay ảnh, consent/retention | Danh sách/chi tiết/lọc và các trạng thái bằng dữ liệu tổng hợp giả lập | API phân trang/phân quyền và mô hình dữ liệu được chốt |
| TEAM-01 Tạo tài khoản nội bộ | Invitation/tạo mới hay nâng role | Form, validation, xác nhận và kết quả giả lập theo luồng được chọn | Endpoint và quy tắc tạo/invite phù hợp |
| QR-01 Danh mục VietQR | Có thuộc MVP không | Editor danh mục riêng bằng fixture nếu chọn làm | API quản trị VietQR; phân biệt với provider-configs |
| EVAL-01 Đo model/agent | Chỉ xem hay điều phối train/eval/promote | Danh sách kết quả/job/detail/trạng thái bằng fixture theo phạm vi được chọn | API quản trị có auth; job và lịch sử; khóa nội bộ giữ ở server |

Chốt phạm vi sản phẩm cho các mục này trước khi dựng màn; trong phạm vi đã chốt, FE được hoàn thiện xuyên suốt bằng adapter phù hợp. Việc triển khai endpoint và sửa mô hình dữ liệu thuộc giai đoạn BE.

## Giai đoạn BE — Hoàn thiện sau khi FE được nghiệm thu

### BE-1 — Sửa baseline và khớp contract

- Phân loại 11 ca đỏ: hint/chuyển ví 2, hoàn/đảo thông báo 6, auto-commit 1, báo cáo khoản vay 1, chọn phương pháp 1. Đối chiếu spec trước khi sửa logic hoặc test.
- Xử lý tập trung các lệch request/response, enum, pagination, quyền, validation và mã lỗi đã ghi trong lúc hoàn thiện FE.
- Chốt các contract đề xuất của FE-3, gồm định nghĩa metric, freshness và trạng thái dữ liệu.

### BE-2 — Bổ sung phần còn thiếu và tích hợp dữ liệu thật

- Triển khai các API thuộc phạm vi đã chốt: aggregate KPI, telemetry sync, mẫu hóa đơn, tạo/invite tài khoản, VietQR và eval nếu có.
- Tạo migration khi cần thay đổi schema; tích hợp mobile nếu nguồn dữ liệu phụ thuộc thiết bị.
- Thay từng adapter giả lập bằng HTTP, kiểm chứng dữ liệu và quyền; ghi lại trạng thái tích hợp của từng màn.

### BE-3 — Kiểm chứng toàn hệ thống

- Chạy lại backend tests và xử lý đầy đủ các ca thất bại thuộc phạm vi; kiểm tra số liệu tài chính, audit và consent.
- Chạy end-to-end với các vai trò thật, concurrency, retry và rate limit; kiểm tra FE trên nguồn dữ liệu thật.
- Kiểm chứng tích hợp ngoài bằng môi trường phù hợp: OTP/email, Google, FCM, Gemini/OpenRouter, SePay sandbox/đối soát.
- Chốt báo cáo cuối và điều kiện phát hành; các kiểm tra độc lập từng giai đoạn được giữ làm bằng chứng, không thay cho kết quả end-to-end này.

## Chất lượng giao diện và tổ chức mã nguồn

- Dùng lại bảng, dialog, form field và phiên bản đã có; tách các file nhiều trang/JSX dài thành module theo tính năng.
- Một lớp API/DTO và cơ chế query/cache thống nhất; React Query và Zod đã có dependency, đánh giá sử dụng trước khi thêm thư viện mới.
- Lỗi tại trường có aria-describedby; summary có focus và link đến trường. Dòng incident thao tác được bằng bàn phím. Giữ focus trap, Escape và cảnh báo bản nhập chưa lưu.
- Bảng hỗ trợ sorting/filter/cột theo nhu cầu thực và khả năng backend; lưu filter trên URL; export toàn bộ là chức năng riêng, không đổi nghĩa CSV “trang hiện tại”.
- Giảm chiều cao widget rỗng, ưu tiên thao tác; nhất quán tên enum/nhãn tiếng Việt và định dạng ngày/tiền.
- Kiểm tra desktop, tablet, mobile, light/dark và lượng dữ liệu lớn; kiểm tra dialog dài và menu thao tác trong vùng cuộn.

## Cổng nghiệm thu FE trước khi chuyển sang BE

1. Toàn bộ màn trong phạm vi đã chốt có layout, form, navigation và tương tác hoàn chỉnh; build/lint và test frontend đạt.
2. Có đủ loading/empty/error/stale, validation, xác nhận, hủy, dirty form và xử lý xung đột; kiểm tra responsive, light/dark và bàn phím.
3. API hiện có được tích hợp và kiểm tra trên QA. Phần bị lỗi BE hoặc thiếu endpoint dùng adapter phát triển có nhãn rõ, contract và testcase; mọi điểm chờ được ghi trong backlog tích hợp.
4. Menu/route/hành động theo quyền; các luồng có backend sẵn được thử bằng role thật, phần còn lại có fixture kiểm tra các nhánh quyền và lỗi.
5. Giữ nguyên trường không chỉnh và cơ chế consent/audit hiện có; các thao tác giả lập không tác động dữ liệu thật.
6. Không còn call Rasa/unclear đã gỡ; fixture gamification và watcher Vite đã được cập nhật.
7. Có ma trận bàn giao từng màn và danh sách BE-1/2/3 đủ để làm backend trong một đợt. Báo cáo phân biệt test FE, test tích hợp và kiểm chứng ngoài còn chờ.

Hoàn tất các tiêu chí trên thì chuyển sang giai đoạn BE. Nghiệm thu toàn hệ thống sau BE-3 yêu cầu dữ liệu/API thật và kết quả end-to-end tương ứng.

## Bắt đầu từ đâu

Làm FIX-01 → FIX-07, tiếp đến CFG-01/ACL-01/MON-01/HOME-01; hoàn thiện các module FE-2 và các màn FE-3 thuộc phạm vi đã chốt. Sau khi nghiệm thu toàn bộ FE, xử lý tập trung BE-1/BE-2/BE-3 theo backlog đã thu thập. Các lỗi và tính năng backend chưa chặn việc hoàn thiện giao diện trong chế độ phát triển.
