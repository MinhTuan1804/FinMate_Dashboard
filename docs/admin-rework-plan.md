# Kế hoạch sửa FinMate Admin theo `admin-pages-spec.md`

Nguồn yêu cầu: `E:\Ki 9\Capstone_Project\FinMate_FE\docs\admin-pages-spec.md` (28/10/2026). Dự án hiện có là React 18 + TypeScript + Vite; tiếp tục dùng stack này và các thư viện hiện có. Giữ lại giao diện shell SOSBike đã chuyển màu FinMate, nhưng tổ chức lại màn hình và luồng theo spec.

## Trạng thái triển khai

- Đã tạo 15 route theo spec, bỏ Nhiệm vụ; đã làm xác thực Admin qua `/users/me`, refresh, logout, hồ sơ, các trang CRUD chính, tab cấu hình AI và trạng thái chờ API.
- Đã sửa phân trang theo `meta.cursor`, dùng DTO từ mã backend, thêm xác nhận cho hành động nhạy cảm và màn loading/error/empty cơ bản.
- `npm run build`, `npm run lint`, `npm run test:contract` đều đạt với Docker backend đang chạy.
- Đã nhận tài khoản Admin dev; 17 response đọc đã được xác minh và lưu fixture chỉ chứa cấu trúc. Browser smoke test xác nhận đăng nhập, refresh token, 13 trang, tab AI, drawer/form và đăng xuất. Chưa chạy mutation trên dữ liệu đang dùng; cần môi trường thử nghiệm riêng. Các API `[THIẾU]` vẫn chờ backend.

## 1. Khoảng cách với bản hiện tại

| Khu vực | Hiện tại | Cần sửa |
|---|---|---|
| Điều hướng | 12 route, có `missions`; thiếu `roles`, `settings`, `sync`, `ai-learning`, `profile` | Đúng 15 trang của spec; bỏ Nhiệm vụ; `/` là Dashboard, alias cũ có redirect |
| Xác thực | Login gọi thêm `/admin/users` để kiểm quyền; token chỉ có trong session; không refresh, logout API hay profile | Login → `/users/me` kiểm `Admin`, refresh 401 một lần, logout và logout-all qua API, hết phiên báo rõ |
| API/model | `Pages.tsx` gom mọi trang; bảng và form dùng `Record<string, unknown>`, đoán field | Client theo miền, model từ response thật, kiểm tra envelope và lỗi; fixture trong test không chứa dữ liệu nhạy cảm |
| CRUD | Form JSON thô, `window.prompt` cho hành động nhạy cảm, thiếu nhiều filter/detail/cursor | Bộ thành phần dùng chung: bảng cursor, drawer, confirm dialog có lý do, JSON editor có validate, toast |
| Dashboard | Chỉ vài KPI AI và người dùng | Bộ lọc ngày, AI và bảo mật dữ liệu thật; nhóm thiếu API hiện “Chưa hỗ trợ”; không bịa số |
| AI | Rules/config chỉ đọc | Tab AI đầy đủ: document versions/draft/preview/activate, rules, preview, history/revert |
| Trạng thái | Chưa thống nhất | Loading/skeleton, rỗng, lỗi + Thử lại, 403, disabled khi đang gửi trên mọi trang |

## 2. Giai đoạn triển khai

### Giai đoạn 0 — Khóa hợp đồng API và dữ liệu kiểm thử

1. Đối chiếu lại Swagger đang chạy ở Docker `localhost:8080` và OpenAPI AI service `localhost:8000` với spec; ghi endpoint, request, enum, cursor, status code vào bảng hợp đồng.
2. Dùng tài khoản Admin dev gọi **read-only** từng endpoint admin và `/users/me`; lưu fixture đã lược bỏ email/tên/IP/metadata nhạy cảm trong `src/test/fixtures`. Không dùng dữ liệu đoán để khai báo model.
3. Kiểm tra backend đã có proxy cho provider formats, OCR, Rasa, category sync chưa. Nếu chưa, đánh dấu các phần đó “Chưa kết nối”; không gọi AI service trực tiếp từ trình duyệt bằng khóa nội bộ.
4. Chốt danh sách thiếu API ở mục 17 của spec thành backlog backend riêng. Trang Nhiệm vụ bị loại khỏi sidebar và router.

**Điều kiện vào giai đoạn 1:** có tài khoản Admin dev hợp lệ hoặc fixture response thật do backend cung cấp. Khi chưa có, vẫn làm được shell, form, trạng thái và các phần chưa kết nối nhưng chưa thể xác nhận model/runtime.

### Giai đoạn 1 — Nền tảng ứng dụng và xác thực (trang 1, 15)

1. Tách `App.tsx`, `Pages.tsx` thành route modules và component dùng chung; giữ URL cũ bằng redirect: `/dashboard` → `/`, `/provider-configs` → `/providers`, `/survey-questions` → `/survey`, `/ai-config` và `/ai-rules` → `/settings?tab=ai`.
2. Login có nút hiện mật khẩu. Sau login gọi `/users/me`; role khác `Admin` xóa phiên và báo đúng thông điệp. Đổi token, refresh token và profile thành state thống nhất; chặn refresh lặp vô hạn; refresh một lần khi 401 rồi retry request; không log token/mật khẩu.
3. Logout gọi `/auth/logout` với refresh token trước khi xóa phiên; khi hết phiên quay `/login` với thông báo. Hồ sơ admin hiển thị `/users/me`, đổi mật khẩu và logout-all có xác nhận. Quyết định cách lưu refresh token phù hợp chính sách bảo mật trước khi triển khai; không đưa vào URL/log.
4. Tạo `ApiState`, `DataTable`, `CursorPager`, `FilterBar`, `DetailDrawer`, `ConfirmReasonDialog`, `JsonEditor`, `Toast`, `NotConnectedPanel`; test trạng thái chính.

### Giai đoạn 2 — Người dùng, phân quyền, audit, xóa dữ liệu (trang 3–6)

1. `/users`: search, role, lock, includeDeleted, cursor; detail `/users/{id}`; ngăn chi tiết + audit liên quan; lock/role có xác nhận và lý do bắt buộc. Chặn tự khóa/tự hạ quyền ở UI và xử lý lỗi backend. “Thêm tài khoản” bị vô hiệu với chú thích thiếu API.
2. `/roles`: danh sách Admin, tìm User để nâng quyền, ma trận quyền 2 vai trò chỉ đọc; cảnh báo admin cuối cùng; xác nhận và lý do.
3. `/audit-logs`: filter đồng bộ URL, cursor, drawer chi tiết, che trường nhạy cảm, xuất CSV chỉ các dòng đã tải và ghi rõ phạm vi.
4. `/data-deletion`: filter status theo enum thật, cursor, detail, chỉ cho hủy mục chờ, lý do bắt buộc, refresh sau thao tác.

### Giai đoạn 3 — Danh mục tài chính và khảo sát (trang 7–11)

1. `/categories`: CRUD/bật-tắt, kiểm tra slug, xác nhận khi tắt; nút đồng bộ AI hiển thị “Chưa kết nối” cho đến khi có đường backend được chốt.
2. `/providers`: tab Nhà cung cấp đầy đủ; tab Định dạng thông báo ở trạng thái chờ kết nối AI service. Sau khi có proxy, triển khai editor cho formats/fields/patterns/samples/try/check/activate/archive.
3. `/finance-methods`: form có các phần riêng, select enum, JSON validate, preview, liên kết mẫu mục tiêu GET/PUT và thứ tự.
4. `/goal-templates`: CRUD, JSON validate, cảnh báo khi tắt; số phương pháp đang dùng chỉ hiển thị nếu tính được từ liên kết thật.
5. `/survey`: nhóm theo `groupCode`, mở rộng options; tạo/sửa/activation câu hỏi và option; `showIf`, `signals` có validate; dùng `clearShowIf` đúng contract.

### Giai đoạn 4 — Cấu hình AI và Dashboard (trang 12, 2)

1. `/settings` tab AI: danh sách tài liệu, nội dung đang dùng/mặc định, phiên bản, lưu nháp, preview, kích hoạt với `expected_active_version`, xử lý 409 bằng tải lại; luật AI có `reason`, preview, lịch sử và revert. Các thao tác ghi cần confirm và chặn bấm đôi.
2. Tab Hệ thống và Rasa: dựng cấu trúc và trạng thái “Chưa kết nối” đúng spec; phần bộ nhớ Rasa dùng lại UI luật AI khi API backend đã xác nhận. Không tạo nút “Lưu” giả.
3. `/`: chọn Hôm nay/7 ngày/30 ngày/tùy chọn và gọi lại `/admin/ai-stats?from&to`; audit 10 mới nhất và yêu cầu xóa đang chờ. KPI còn thiếu API hiển thị “Chưa hỗ trợ”. Chỉ vẽ biểu đồ khi API trả đủ chuỗi thời gian; không suy diễn delta kỳ trước từ tổng hiện tại.

### Giai đoạn 5 — Trang chờ backend và kiểm chứng (trang 13–14)

1. `/sync` và `/ai-learning`: bố cục theo spec, trạng thái “Chưa kết nối”, mô tả dữ liệu cần endpoint. Không tạo số giả hoặc thao tác ghi không có dữ liệu nguồn.
2. Kiểm thử từng trang ở viewport 1280 và 1440 px: loading, empty, error/retry, 403, bàn phím, tương phản, format ngày/tiền. Test luồng login Admin/User, F5, refresh, logout, cursor/filter, confirm reason, JSON lỗi, 409 stale version.
3. Chạy `npm run lint`, `npm run build`, test tự động và smoke test trên Docker backend. Ghi rõ chức năng hoàn tất và API còn chờ trong README.

## 3. Phụ thuộc cần chốt với backend/chủ dự án

- **Admin dev / fixture thật:** bắt buộc để xác minh response admin. Mật khẩu seed trong `.env` có thể không còn đúng vì seeder không đặt lại mật khẩu tài khoản đã tồn tại.
- **AI service:** chọn proxy qua backend và xác thực cho đồng bộ danh mục, provider formats, OCR và Rasa; không đặt khóa nội bộ trong frontend.
- **Endpoint thiếu:** admin tạo tài khoản, số liệu tổng hợp Dashboard, cấu hình hệ thống, local-first sync, danh sách dữ liệu AI learning, Rasa status/train/sample editing, số giao dịch dùng danh mục và taxonomy version.
- **Bảo mật phiên:** thống nhất cơ chế lưu refresh token; ưu tiên cookie HttpOnly nếu backend hỗ trợ. Nếu backend hiện chỉ trả token trong JSON, ghi rõ giới hạn và xử lý phiên theo chính sách được chọn.

## 4. Tiêu chí kết thúc

15 trang/route đúng spec; trang có API dùng dữ liệu thật; trang thiếu API có trạng thái chờ rõ ràng; không còn nghiệp vụ SOSBike hoặc gamification trong menu; không dùng số liệu giả; mọi hành động nhạy cảm xác nhận + lý do; build, lint, test và smoke test Docker đạt.
