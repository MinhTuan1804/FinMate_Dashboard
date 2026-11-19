# Bàn giao tích hợp backend cho dashboard

Cập nhật 19/11/2026. Phạm vi đợt này là frontend `FinMate_Dashboard`, backend đối chiếu tại `018bbe0`. Các đường dẫn ở phần 2 là **đề xuất**, chưa tồn tại và frontend chưa gọi chúng.

## 1. API hiện hành

Frontend dùng envelope `{ success, data, error?, meta? }`; danh sách hỗ trợ cả mảng + `meta.total` và `{items,total}`. Không suy ra tổng toàn hệ thống từ độ dài một trang. Cursor do server cấp; không tự chế offset thành cursor. Test Swagger kiểm tra 84 endpoint, health và request không xác thực bị chặn; việc endpoint xuất hiện trong Swagger không đồng nghĩa mọi nhánh nghiệp vụ đã chạy end-to-end.

| Module | API chính hiện đã nối | Ghi chú contract |
|---|---|---|
| Phiên, quyền | `/auth/*`, `/users/me`, `/ops/auth/*`, `/ops/me` | Admin cũng chờ quyền hiệu lực; refresh một lần, 429 giữ phiên và cho thử lại |
| Quản trị cũ | `/admin/users`, `categories`, `provider-configs`, `provider-formats`, `finance-methods`, `goal-templates`, `survey-questions`, `audit-logs`, `data-deletion-requests` | Giữ API và nghiệp vụ hiện có; URL giữ bộ lọc, không thêm sorting giả |
| Cấu hình | `/admin/system-config`, lịch sử/rollback và secrets | 24 nhóm, 10 cờ, giữ trường không chỉnh, diff/lý do/version conflict |
| Vận hành | `/ops/tickets`, `/ops/approvals`, `/ops/monitoring/*`, `/ops/audit`, `/ops/ai-stats` | Dữ liệu khách theo consent/scope/hạn; gom ca và broadcast cần xác nhận |
| Chẩn đoán | `/admin/monitoring/provider-formats`, `/admin/monitoring/error-events` | Admin; filter/offset/trace; định dạng đối chiếu 24 giờ và 7 ngày |
| Tri thức | `/admin/knowledge/documents`, `/admin/knowledge/candidates` | Prefix admin nhưng Staff được soạn, Manager/Admin duyệt; tạo mới cần embedding provider |
| Giả định | `/admin/assumptions`, `/admin/economic-feeds/refresh` | `draft/approved/retired` viết thường; 100 bps = 1%; refresh dùng POST, Admin |
| Dự báo | `/ops/forecast/accuracy`, `/ops/forecast/feedback` | ViewMonitoring xem accuracy; HandleTickets xem/gán nguyên nhân feedback |
| Thị trường | `/admin/market-sources`, `market-documents`, `market-events`, `fuel-prices` | Test nguồn dùng POST; lỗi fetch ngoài được hiển thị; không phải thành công crawl |
| Cộng đồng | `/ops/community/reports`, `images`, các thao tác hide/restore/mute | Ảnh lấy blob có Authorization; reject ảnh xóa bytes; hide đóng report; restore không mở lại report |
| Pháp lý | `/ops/legal/draft`, `/ops/legal/versions`, `/admin/legal/draft/publish` | `baseUpdatedAt` chống ghi đè; chỉ Admin xuất bản; xuất bản yêu cầu người dùng đồng ý lại |
| Thuê bao | `/ops/subscriptions/features`, `plans`, `orders` | Manager/Admin + capability; thay toàn bộ features; null giá cần cờ remove; đơn giữ giá snapshot |

## 2. Contract đề xuất cho ba nguồn còn thiếu

Các ví dụ bên dưới dùng cùng envelope hiện hành. Cần chốt DTO, policy và nguồn dữ liệu với BE trước khi thay adapter phát triển. **Không tự chuyển sang fixture khi API thật lỗi.** Hiện tại chế độ thật hiển thị chờ nguồn; nút minh họa chỉ có khi `import.meta.env.DEV` và người dùng chủ động bật.

### 2.1 KPI tổng thể

Đề xuất `GET /admin/analytics/overview?from=2026-11-01&to=2026-11-19&timezone=Asia%2FHo_Chi_Minh`.

- Quyền: Admin; không cho Staff đọc số liệu tài chính toàn hệ thống.
- `from/to` là ngày lịch VN, bao gồm cả ngày kết thúc. Backend dùng interval `[from 00:00+07, ngày sau to 00:00+07)`; giới hạn tối đa 366 ngày. Trả 422 cho ngày không hợp lệ hoặc đảo khoảng.
- Grain: một ngày VN. `newUsers`, `createdTransactions`, `confirmedTransactions`, `transactionAmountVnd` là flow, cộng theo kỳ. `totalUsersAtEnd` là snapshot ngày cuối, không cộng theo ngày. Không cộng DAU để tạo unique users theo kỳ.
- Phải chốt loại giao dịch nào được tính (đã xóa, hủy, transfer, refund), thời điểm tính (createdAt/confirmedAt) và tránh đếm hai lần. Giá trị tiền nguyên đồng VND, không float.
- Trả `generatedAt`, `dataThrough`, `source`, `timezone`, `complete`, `missingDates`; thiếu dữ liệu là null, không thay bằng 0. Kỳ trước dùng cùng số ngày và định nghĩa; không hiển thị % nếu mẫu nền bằng 0/thiếu.

```json
{"success":true,"data":{"timezone":"Asia/Ho_Chi_Minh","from":"2026-11-01","to":"2026-11-19","generatedAt":"2026-11-19T05:00:00Z","dataThrough":"2026-11-18","complete":false,"missingDates":["2026-11-19"],"source":"daily_aggregate","totals":{"totalUsersAtEnd":1200,"newUsers":42,"createdTransactions":310,"confirmedTransactions":280,"transactionAmountVnd":42000000},"days":[{"date":"2026-11-18","totalUsersAtEnd":1200,"newUsers":3,"createdTransactions":20,"confirmedTransactions":18,"transactionAmountVnd":2500000}],"previous":null}}
```

Các số trên chỉ minh họa schema. Drill-down hiện là bảng aggregate ngày, không tự mở danh sách giao dịch cá nhân. Nếu BE bổ sung drill-down chi tiết phải có policy và che dữ liệu riêng.

### 2.2 Telemetry đồng bộ local-first

Đề xuất `GET /admin/sync/devices?search=&status=&limit=20&offset=0` và `GET /admin/sync/devices/{id}`. Chỉ Admin, hoặc capability chuyên biệt nếu BE quyết định mở cho vận hành; cần đồng nhất menu/route/API.

```json
{"success":true,"data":[{"id":"opaque-device-id","deviceAlias":"Thiết bị đã che","userAlias":"Tài khoản đã che","status":"unknown","queueSize":null,"lastSyncedAt":null,"reportedAt":"2026-11-19T05:00:00Z","appVersion":"1.0.0","retries":0,"lastErrorCode":null}],"meta":{"total":1,"limit":20,"offset":0}}
```

- Status đề xuất: `healthy/pending/offline/error/unknown`. Không có heartbeat không đủ kết luận offline; trả unknown sau ngưỡng freshness công bố. Queue unknown khác queue 0.
- Server nhận telemetry có timestamp server và timestamp client; không tin đồng hồ client để kết luận SLA. Định nghĩa dedupe theo device/sequence và thời gian lưu telemetry.
- Search chỉ trên alias hoặc ID cho phép; không trả access token, nội dung giao dịch hay raw payload lỗi. Detail có phiên bản/schema/lần thử và mã lỗi đã che; thêm tổng queue chỉ khi nguồn đáng tin cậy.
- UI đợt này chỉ xem/đọc. Retry/replay/clear queue trên thiết bị chưa có nghiệp vụ; không thêm nút tác động giả.
- Cần phối hợp mobile để phát sinh heartbeat/queue telemetry. Dashboard không thể tự suy ra trạng thái local từ DB server.

### 2.3 Metadata mẫu hóa đơn học AI

Đề xuất `GET /admin/ai-learning/bills?search=&status=&limit=20&offset=0`, `GET /admin/ai-learning/bills/{id}`, `PATCH /admin/ai-learning/bills/{id}` với `{status,baseVersion,reason}`. Admin hoặc capability học AI được BE định nghĩa rõ.

```json
{"success":true,"data":{"id":"opaque-sample-id","merchant":"Tên đã che","totalVnd":120000,"category":"food","confidence":0.91,"status":"pending","createdAt":"2026-11-19T05:00:00Z","trainingConsent":true,"consentVersion":"v1","retentionUntil":"2026-12-19T05:00:00Z","version":3,"items":[{"name":"Mặt hàng đã che","quantity":1,"amountVnd":120000}]}}
```

- Phân biệt `pending/reviewed/excluded`; cập nhật với optimistic concurrency, 409 giữ bản đang xem và yêu cầu tải lại. Thành công trả DTO/version mới; audit actor/reason/thời gian.
- Consent học AI phải còn hiệu lực; revoke/xóa người dùng/hết retention phải ngừng phục vụ mẫu và loại khỏi pipeline theo chính sách BE. Không suy ra đồng ý học AI từ hành vi upload hóa đơn.
- Contract hiện chỉ đề xuất metadata; **không có ảnh**. Nếu cần ảnh sau này, dùng endpoint được kiểm quyền và kiểm consent, blob ngắn hạn, không URL công khai, không cache lâu. Cần thống nhất nơi lưu, thời gian giữ, xóa bytes và audit truy cập.
- Hết hạn/xóa mẫu trả 404/410 theo quy ước chốt; thiếu consent trả 403; dữ liệu sai trả 422, rate limit 429, nguồn chưa sẵn sàng 503. Frontend không dựng lại mẫu từ cache khi mất quyền.

## 3. Thứ tự backend tiếp theo

| Ưu tiên | Công việc | Điều kiện nghiệm thu |
|---|---|---|
| P0 | Cấu hình embedding provider cho QA, kiểm lại tạo tài liệu tri thức | UI tạo → API lưu → có chunk/vector → Manager duyệt → đọc lại; không 503 |
| P0 | Phân loại và sửa 11 ca đỏ baseline backend | Chạy lại bộ 3.459 ca trên commit BE mới; baseline lịch sử là 3.448 đạt/11 lỗi, chưa chạy lại trong đợt FE |
| P1 | Chốt và triển khai KPI aggregate | Định nghĩa metric/tz/dedupe được review, test 0/null/cuối ngày/kỳ trước, đối chiếu aggregate với nguồn |
| P1 | Telemetry sync + producer mobile | Heartbeat/queue có freshness, trường che, limit/filter, không báo offline sai khi chưa có dữ liệu |
| P1 | Metadata bill + consent/retention/version | Policy, xóa/hết hạn/revoke, 409 và audit; sau đó mới quyết định ảnh |
| P1 | Tích hợp ngoài trong môi trường kiểm thử phù hợp | Email OTP, FCM, Google Vision/LLM, nguồn kinh tế/thị trường thật, SePay đối soát; có bằng chứng từng dịch vụ |
| P2 | Các nhánh chưa chạy browser đủ sâu | Pháp lý publish/re-consent, rollback config, ticket attachment/consent hết hạn trong phiên, các mutation CRUD ít dùng |

Invite tài khoản nội bộ, editor VietQR và train/eval/promote vẫn là mục mở rộng, chưa tự coi là hạng mục bắt buộc của lần hoàn thiện FE này.

## 4. Giới hạn đã biết

- QA dùng DB riêng và tài khoản/tài liệu/ảnh tổng hợp. Seed trực tiếp để kiểm tra hàng đợi và review không chứng minh pipeline ingest/upload bên ngoài.
- Tạo tri thức trả 503 do embedding chưa sẵn sàng; FE giữ draft và hiển thị lỗi. Test nguồn `example.org` cho lỗi fetch có cấu trúc, không chứng minh crawl nguồn tin thật.
- Không xác nhận thanh toán, chuyển tiền, gửi trả lời cho khách thật hoặc xuất bản điều khoản thật trong đợt kiểm thử FE.
- Cộng đồng chỉ giữ danh sách vừa xử lý trong lần mở màn để có thể khôi phục ngay; sau khi rời trang, BE chưa có màn lịch sử moderation đầy đủ cho frontend. Nếu cần tìm lại mọi nội dung đã gỡ, bổ sung API lịch sử/search theo target.
