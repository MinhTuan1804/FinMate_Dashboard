# Kế hoạch hoàn thiện frontend FinMate Dashboard

Ngày cập nhật: 19/11/2026. Phạm vi được chủ dự án xác nhận: **chỉ frontend web `FinMate_Dashboard`**. Đây là kế hoạch hiện hành, thay cho thứ tự triển khai trong `dashboard-completion-plan-2026-11-18.md`.

Căn cứ: dashboard `7cda220`, backend `018bbe0` và [báo cáo kiểm thử](dashboard-test-report-2026-11-18.md). **FE-0 đã hoàn tất ngày 18/11/2026** trên nhánh `codex/dashboard-fe-completion`; xem [báo cáo thực thi và giới hạn kiểm chứng](dashboard-fe0-report-2026-11-18.md). FE-1 đến FE-6 đã triển khai và chốt hồ sơ kiểm thử ngày 19/11/2026. Xem [ma trận tính năng](dashboard-feature-matrix.md), [báo cáo thực thi](dashboard-fe-completion-report-2026-11-19.md) và [bàn giao backend](dashboard-backend-integration.md). Nghiệm thu ở mức frontend; các giới hạn end-to-end được ghi riêng, không coi fixture hoặc API trả lỗi đúng kỳ vọng là pipeline nghiệp vụ đã hoàn tất.

## 1. Mục tiêu và ranh giới

Hoàn thiện các màn quản trị/vận hành, tương tác, trạng thái dữ liệu và kiểm thử của dashboard. Giữ một console/sidebar chung và phát triển từ giao diện hiện tại, thống nhất lại bố cục, bảng, form và nhãn tiếng Việt.

- Thay đổi mã nguồn, test và tài liệu trong `FinMate_Dashboard`.
- Dùng backend đang có để đọc contract và kiểm thử tích hợp trên QA riêng.
- Ghi API còn thiếu/lệch contract vào backlog để hoàn thiện backend sau khi nghiệm thu FE.
- App mobile, logic nghiệp vụ backend, migration, model AI và sửa 11 ca backend đỏ thuộc đợt riêng.
- Rasa và gamification đã được bỏ khỏi sản phẩm; loại các tham chiếu lỗi thời khỏi dashboard.

FE hoàn thiện nghĩa là màn có luồng tương tác đầy đủ và được kiểm thử. Mỗi màn phải ghi riêng tình trạng **UI hoàn thiện**, **API thật đã tích hợp**, **end-to-end đã kiểm chứng**.

## 2. Baseline lịch sử trước khi thực thi

| Hạng mục | Đã xác minh | Việc cần làm tiếp |
|---|---|---|
| Build/lint | Đạt | Giữ đạt sau từng đợt |
| API phục vụ dashboard trên QA | 49/49 kịch bản đạt | Kiểm tra từ UI khi thêm/sửa màn |
| Browser | 16/20 kiểm tra đạt; 23/25 route không lỗi tải | Sửa bốn ca lỗi, mở rộng kiểm tra các luồng sâu |
| Config | Backend có 24 nhóm/10 cờ; form FE mới khai báo 8 nhóm/4 cờ | Hoàn thiện editor và giữ nguyên trường không chỉnh |
| Các module mới | API đã có nhưng thiếu màn | Bổ sung UI và tích hợp API hiện hành |
| Các phần chưa có API | KPI tổng thể, telemetry sync, mẫu hóa đơn | Hoàn thiện FE bằng adapter phát triển và lập contract đề xuất |

Không chạy lại toàn bộ backend 3.459 ca trong mỗi lượt sửa FE. Chạy build/lint, test FE và các kiểm tra tích hợp cần thiết; bộ backend đầy đủ được xử lý ở đợt backend.

## 3. Thứ tự triển khai

| Đợt | Phạm vi | Kết quả bàn giao |
|---|---|---|
| FE-0 | Sửa lỗi đã tái hiện | Các màn hiện có ổn định, bỏ call đã gỡ, bộ test khớp contract |
| FE-1 | Chuẩn hóa nền giao diện và dữ liệu | Bảng/form/dialog/query/error/quyền dùng nhất quán; adapter cho API thật và minh họa |
| FE-2 | Hoàn thiện các màn quản trị/vận hành hiện có | Khép kín luồng người dùng, danh mục, phương pháp, ticket, consent và duyệt |
| FE-3 | Làm lại Home, cấu hình và giám sát | Home theo việc cần xử lý; đủ cấu hình/quyền; giám sát có drill-down |
| FE-4 | Bổ sung các module đã có API | Tri thức, giả định, dự báo, thị trường, cộng đồng, pháp lý, thuê bao |
| FE-5 | Hoàn thiện các màn chờ API | KPI tổng thể, sync, mẫu hóa đơn có UI/luồng minh họa và contract đề xuất |
| FE-6 | Kiểm thử và nghiệm thu toàn bộ FE | Ma trận màn/tính năng, bằng chứng test, danh sách BE cần làm tiếp |

Thực hiện lần lượt và cập nhật checklist sau mỗi đợt. Thời lượng được ước lượng lại sau khi chốt danh sách màn và mức độ chi tiết; bảng này xác định thứ tự và đầu ra, chưa phải lịch giao cố định.

## 4. FE-0 — Sửa lỗi và đưa baseline về ổn định

| ID | Công việc | Điều kiện hoàn thành |
|---|---|---|
| F0-01 | Gỡ call/tab Rasa; chuyển đường dẫn cũ về phần AI phù hợp | Không gọi `/admin/rasa/*`; không còn màn hỏng do Rasa đã bị gỡ |
| F0-02 | Gỡ tab Câu chưa hiểu đã mất endpoint; mở Học AI vào nội dung còn hoạt động | Không gọi `/admin/ai-learning/unclear`; feedback mở được; phần mẫu hóa đơn đi theo FE-5 |
| F0-03 | Sửa validation slug danh mục theo validator backend | `_` hợp lệ; `-` bị báo đúng; tạo/sửa danh mục hiện có không bị FE chặn sai |
| F0-04 | Xóa lỗi cũ khi lưu thành công/mở form mới | Nhập sai → sửa đúng → lưu → mở lại không còn thông báo từ lần trước |
| F0-05 | Cập nhật fixture auth, bỏ `missionRemindersEnabled` | Auth contract test đạt với profile hiện hành |
| F0-06 | Bỏ qua cache browser trong watcher Vite hoặc đưa cache ra ngoài repo | Browser test không làm Vite chết vì EBUSY |
| F0-07 | Sửa thông báo chờ backend đã lỗi thời | Danh mục nêu đúng sync tự động; trạng thái dịch vụ tái sử dụng API monitoring |

Chạy lại các bước tái hiện đã ghi trong báo cáo trước khi đánh dấu xong. Test mới tập trung bắt lỗi hành vi cụ thể và bảo vệ contract.

## 5. FE-1 — Nền giao diện và lớp dữ liệu

### Giao diện dùng chung

- Chuẩn hóa PageHeader, KPI, toolbar, bảng, phân trang, detail drawer, dialog xác nhận và toast.
- Form có nhãn, gợi ý, lỗi theo từng trường; focus vào lỗi; thông báo tổng khi cần.
- Tất cả màn có loading/empty/error/retry; bảng phân biệt không có dữ liệu với không có kết quả lọc.
- Dialog hỗ trợ bàn phím, focus trap, Escape, chặn đóng khi đang lưu và cảnh báo bản nhập chưa lưu.
- Bộ lọc cần chia sẻ được giữ trên URL; phân trang theo đúng API cursor/offset. Sorting chỉ tích hợp thật khi backend hỗ trợ.
- Sửa lỗi bootstrap phiên của Admin: tải lại đường dẫn `/ops/monitoring` đang bị đưa về Home trước khi `/ops/me` hoàn tất. Giữ đường dẫn đích trong lúc tải quyền và phân biệt tải quyền với thiếu quyền.
- Đồng nhất enum, ngày Việt Nam, đơn vị tiền và cách trình bày số chưa đo được.

### Dữ liệu và quyền

- Tách kiểu dữ liệu, gọi API và mapping response khỏi component; dùng lại dependency hiện có trước khi thêm thư viện.
- Một cơ chế tải/cache/retry nhất quán; hủy hoặc bỏ response cũ khi người dùng đổi filter nhanh.
- Quyền hiệu lực lấy từ `/ops/me`; menu, route và action có cùng quy tắc. Backend vẫn kiểm quyền ở mỗi request.
- Bổ sung nhãn cho quyền mới; phân biệt quyền soạn, duyệt, kiểm duyệt ảnh, mute, quản lý gói và xuất bản pháp lý.
- Kiểm tra policy thật của từng endpoint: một số API tri thức/giả định có prefix `/admin` nhưng cho Staff soạn và Manager duyệt.

### Màn chưa có API

- Dùng adapter cùng interface với nguồn thật. Chế độ minh họa được bật có chủ đích, chỉ phục vụ phát triển/QA và có nhãn rõ.
- Lỗi API thật phải hiện lỗi thật; không tự đổi sang fixture khi gặp 403/500/mất mạng.
- Fixture có đủ dữ liệu và các tình huống tìm/lọc/phân trang, xác nhận, lỗi và xung đột để kiểm thử tương tác.
- Mỗi phần thiếu API có request/response đề xuất, quyền, pagination/filter, mã lỗi và trạng thái. Đánh dấu rõ contract đề xuất trong tài liệu tích hợp.

## 6. FE-2 — Hoàn thiện các màn đang có

| Nhóm màn | Công việc cụ thể | Nghiệm thu chính |
|---|---|---|
| Đăng nhập/hồ sơ | Login, refresh, OTP, đổi mật khẩu, logout/logout-all; lỗi phiên và retry rõ | Role thật; phiên hết hạn; OTP sai/hết hạn theo môi trường; 429 không làm mất phiên một cách sai |
| Người dùng | Tìm/lọc/cursor, detail, khóa/mở khóa, đổi role, liên kết audit | Xác nhận/lý do; tự khóa/tự đổi quyền bị chặn; 403/409/422 hiển thị đúng |
| Phân quyền | Đội ngũ và ma trận quyền; diff quyền thêm/thu hồi; phụ thuộc quyền | Lưu thành công/thất bại một phần rõ; menu cập nhật sau tải lại quyền |
| Audit/xóa dữ liệu | Filter URL, detail đã che; CSV đúng phạm vi; yêu cầu Pending và hủy | Chỉ xuất dòng đã tải nếu chức năng là CSV trang hiện tại; không có thao tác xóa tức thì |
| Danh mục/ngân hàng | CRUD mềm, tìm/lọc, validation, trạng thái, feedback lưu | Luồng tạo/sửa/bật tắt hoàn chỉnh; field bất biến được giữ đúng |
| Định dạng thông báo | Nháp, pattern/field/sample, try/check, activate/clone/archive | Không kích hoạt bản thiếu mẫu; lỗi từng bước rõ; giữ bản đang chạy khi sửa nháp |
| Phương pháp/mẫu mục tiêu | Editor tham số/điều kiện/bước; liên kết template; home layout và các hũ; prompt có phiên bản | Giữ enum khi mở form; validate tổng phần trăm/danh mục trùng; preview; xử lý version conflict |
| Khảo sát | Câu hỏi/đáp án/thứ tự/showIf/signals | Validate cấu trúc, số đáp án và mã; gỡ điều kiện đúng contract |
| Ticket | Queue/filter/SLA, thread, attachment, public/internal, nhận/phân công/chuyển cấp/gom/broadcast | Hiện đúng quyền và trạng thái ca; xác nhận thao tác nhiều ca; không gửi thử cho khách thật |
| Consent/dữ liệu khách | Yêu cầu/approve/deny/revoke; ví/giao dịch/ngân sách; draft hỗ trợ | Scope/hết hạn rõ; đọc theo yêu cầu; quyền hết hạn bị chặn và UI cập nhật |
| Đề xuất/câu trả lời mẫu | Tạo/duyệt/từ chối; template tạo/sửa/tắt | Chặn tự duyệt; giải thích Failed/Expired; refresh đúng sau thao tác |

Kiểm thử mutation trên dữ liệu QA. Các luồng email/OTP và attachment thật ghi rõ mức kiểm chứng, tránh đồng nhất fixture với tích hợp ngoài.

## 7. FE-3 — Home, cấu hình và giám sát

### Home

- Ưu tiên việc cần xử lý: ticket trễ/chưa phân công, incident mở, nội dung chờ duyệt, provider bất thường.
- Mỗi thẻ dẫn đến danh sách có filter tương ứng; ghi khoảng đo và thời điểm cập nhật.
- Sửa “Hôm nay” và custom date range theo `Asia/Ho_Chi_Minh`; kiểm tra from ≤ to và ngày kết thúc trọn vẹn.
- Tách lỗi/loading theo widget; clear lỗi sau retry; bỏ response cũ; đánh dấu dữ liệu stale.
- Thêm Làm mới; polling nếu có phải phù hợp rate limit và trạng thái tab.
- KPI tổng thể/trend mới được thiết kế cùng FE-5; chế độ thật chỉ hiển thị số có nguồn thật.

### Cấu hình

- Hoàn thiện editor cho đủ 24 nhóm và 10 feature flag từ schema backend hiện hành.
- Bổ sung các nhóm đang thiếu: notification pipeline/listener health, forecast/agent/assistant, groups/support/community, market/economic feeds, categories/refunds/duplicates/transfers/snapshots.
- Bổ sung sáu cờ: groups, support, marketAlerts, community, subscriptions, groupFunds; thể hiện phụ thuộc đúng.
- Có gợi ý, validation, diff, lý do, version conflict, lịch sử và rollback; lưu một nhóm giữ nguyên nhóm còn lại.
- Các key bên thứ ba chỉ hiển thị metadata đã che; không đưa khóa nội bộ vào frontend.

### Giám sát

- Hoàn thiện dịch vụ/sự cố/OCR: thời điểm cập nhật, refresh, trạng thái chưa rõ/tắt và lỗi tải.
- Thêm chất lượng thông báo theo provider 24h/7d, upload gap theo app version và đường sang editor định dạng.
- Thêm error events với filter, phân trang và traceId theo quyền; thao tác bằng bàn phím.

## 8. FE-4 — Các module đã có API, chưa có màn

| Module | Phạm vi frontend cần làm |
|---|---|
| Kho tri thức RAG | Danh sách/tìm/lọc/detail; nguồn/ngày/nội dung; soạn → duyệt → gỡ; xử lý candidate; phân quyền đúng |
| Giả định kinh tế | Theo key/phiên bản/trạng thái; tạo/duyệt/retire; đơn vị, bps và nguồn dữ liệu rõ |
| Chất lượng dự báo | Accuracy theo cửa sổ và mốc dự báo; trạng thái ít dữ liệu; feedback và gán nguyên nhân |
| Thị trường | Nguồn tin/bật tắt/test; tài liệu thu thập; tin chờ duyệt; approve/reject; giá xăng và refresh |
| Cộng đồng | Hàng đợi report/ảnh; preview; duyệt/từ chối, ẩn/khôi phục, mute theo quyền; xử lý xung đột |
| Pháp lý | Editor mục tiêu đề/nội dung; preview/diff; lưu nháp/lịch sử; xử lý 409; quyền xuất bản riêng và thông báo phạm vi ảnh hưởng |
| Thuê bao | Gói/giá/quyền/hạn mức; trạng thái bán; danh sách/detail đơn và NeedsReview; trạng thái thanh toán rõ |

Ưu tiên tích hợp API thật hiện có. Các nhánh chưa thể chạy trên QA có fixture phát triển và được ghi trong ma trận kiểm thử. Kiểm chứng SePay/email/FCM/Google/LLM thật thuộc đợt tích hợp backend sau.

## 9. FE-5 — Các màn chờ API và mục tùy chọn

### Phạm vi frontend cần hoàn thiện

| Màn | Luồng giao diện | Đầu ra bàn giao cho backend |
|---|---|---|
| KPI tổng thể | Bộ lọc ngày, KPI, xu hướng, so sánh kỳ, drill-down bằng fixture | Định nghĩa metric/timezone; aggregate/time series response; freshness và trường hợp thiếu dữ liệu |
| Đồng bộ local-first | Danh sách trạng thái, queue size, sync gần nhất, phiên bản/lỗi; detail và bộ lọc | Payload/query telemetry; phân quyền; pagination; quy tắc offline/unknown; phần phụ thuộc mobile |
| Mẫu hóa đơn học AI | Danh sách/detail/tìm/lọc/trạng thái; dữ liệu minh họa | Contract metadata, consent/retention và pagination; quyết định ảnh được xem theo mô hình lưu trữ thực |

### Chưa tự đưa vào phạm vi bắt buộc

Tạo/invite tài khoản nội bộ, editor danh mục VietQR và console train/eval/promote là các mục mở rộng cần chốt riêng. Trong lần hoàn thiện dashboard này, trước hết ghi rõ khả năng hiện có và phần thiếu; không tự mở thêm chức năng nghiệp vụ chỉ để làm đầy menu.

## 10. FE-6 — Kiểm thử và nghiệm thu

1. Build/lint và test FE đạt; các call/fixture lỗi thời đã được xử lý.
2. Mỗi màn trong phạm vi có đầy đủ luồng chính và các trạng thái loading/empty/error/permission/conflict.
3. Dùng Admin/Staff/OpsManager thật trên QA cho API đã có; User bị chặn; kiểm tra thu hồi quyền, refresh và logout.
4. Mỗi luồng ghi đã tích hợp có read-back API/DB trên QA; adapter minh họa có testcase riêng và không ảnh hưởng dữ liệu thật.
5. Kiểm tra desktop/tablet/mobile, light/dark, keyboard/focus, dialog dài, bảng cuộn và dữ liệu đủ lớn.
6. KPI đúng nguồn và ý nghĩa; phân biệt 0, chưa đủ dữ liệu, lỗi tải và chưa tích hợp.
7. Cập nhật README, ma trận màn/tính năng, test report và backlog tích hợp backend. Không ghi “đã chạy thật” cho các nhánh mới dùng fixture.

## 11. Hồ sơ bàn giao sau khi FE xong

- **Ma trận màn/tính năng:** UI, quyền, nguồn dữ liệu, thao tác, test và trạng thái tích hợp.
- **Danh sách contract:** API đang dùng, contract đề xuất, lệch field/enum/pagination/validation/mã lỗi cần backend xử lý.
- **Bằng chứng kiểm thử:** kết quả tự động, luồng browser, screenshot quan trọng và giới hạn kiểm chứng.
- **Backlog backend:** API thiếu, 11 ca test baseline đỏ và tích hợp ngoài; chuyển sang xử lý tập trung sau nghiệm thu FE dashboard.

## 12. Kết quả thực thi

**Đã xong FE-0**, gồm bảy mục F0-01 → F0-07. Build/lint đạt; 3/3 test frontend, 33 endpoint contract, 17 response auth và 15/15 kiểm tra browser tập trung đều đạt. Chi tiết và giới hạn ở [báo cáo FE-0](dashboard-fe0-report-2026-11-18.md). Các số liệu ở mục 2 là baseline lịch sử trước khi sửa. Đợt FE-1→FE-6 đã hoàn tất phần triển khai FE và hồ sơ; tình trạng cuối như bảng dưới.


| Đợt | Trạng thái cuối | Bằng chứng / giới hạn |
|---|---|---|
| FE-1 | Đã triển khai | Query cache/cancel/retry, URL, capability, lỗi form/focus, guard dialog và router Back; role thật trên QA |
| FE-2 | Đã hoàn thiện các điểm FE trong phạm vi | Cải thiện các màn cũ, lỗi/draft/filter/ticket/consent; baseline API 49 và route/read cuối; không chạy lại mọi mutation browser/OTP ngoài |
| FE-3 | Đã triển khai | Home VN/từng widget, 24 nhóm/10 cờ, UI save + read-back giữ trường khác, diagnostics; rollback chưa chạy lại |
| FE-4 | Đã triển khai 7 module với API hiện hành | Read/review/mutation QA theo ma trận; KB create gặp 503 embedding, publish và các dịch vụ ngoài chưa xác minh |
| FE-5 | Đã triển khai UI phát triển và contract đề xuất | KPI/sync/bill chỉ bật demo chủ đích trong DEV; nguồn thật hiện chờ API |
| FE-6 | Đã chốt hồ sơ FE | Build/lint, 16 tests, 84 endpoint contract, 17 auth response, 62 API status checks, 29 routes, 14 focused browser checks cuối, API/DB read-back; xem báo cáo giới hạn |

Bước tiếp theo về kỹ thuật là backlog backend đã tách riêng, bắt đầu từ embedding QA và phân loại 11 ca backend đỏ baseline, sau đó chốt ba API tổng hợp. Không sửa BE/mobile trong đợt dashboard FE này. Chưa commit/merge/deploy tự động.
