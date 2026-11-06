# Kế hoạch cập nhật giao diện FinMate Admin — 06/11/2026

> Đã triển khai giao diện mới. Xem `admin-ui-update-report-2026-11-06.md` để biết phạm vi, kiểm tra và giới hạn thực tế; các phần bên dưới giữ lại nội dung kế hoạch ban đầu.

## 1. Cơ sở rà soát và phạm vi

Đã đọc toàn bộ 31 file trong `src/`, ba script kiểm tra, fixture API, cấu hình dự án, README và plan cũ. `npm run build` và `npm run lint` đạt ở thời điểm lập plan. Đánh giá dưới đây dựa trên mã hiện tại; chưa chụp lại các màn có xác thực trong lượt rà soát này.

Ứng dụng hiện có cả quản trị và vận hành: User/Staff/OpsManager/Admin, OTP email, capability từ backend, ticket, duyệt đề xuất, giám sát, cấu hình hệ thống có phiên bản, tích hợp dịch vụ, AI, ngân hàng và bộ chỉnh trang chủ. Vì vậy không dùng giới hạn “15 trang, 2 vai trò” của plan tháng 10 để thiết kế lại.

Mục tiêu: người quản trị tìm đúng màn nhanh hơn, đọc được bảng nhiều dữ liệu, hiểu tác động trước khi lưu và xử lý được một ca hỗ trợ mà không phải cuộn qua nhiều form. Giữ React/TypeScript/Vite, màu teal FinMate và các contract API hiện có. Chưa cần bổ sung thư viện UI lớn.

Lượt này chỉ tạo kế hoạch; chưa thay đổi mã ứng dụng.

## 2. Các vấn đề cụ thể trong mã hiện tại

| Khu vực | Quan sát từ code | Hướng xử lý |
|---|---|---|
| Shell — `App.tsx` | Admin thấy toàn bộ menu quản trị cộng 7 mục vận hành; menu dài. Topbar tìm kiếm chỉ lọc menu, breadcrumb chỉ có một cấp. Thu gọn sidebar chưa có trạng thái lưu. | Chuyển giữa không gian Quản trị/Vận hành; menu theo capability; breadcrumb nhiều cấp; ghi rõ “Tìm trang”; lưu trạng thái sidebar. |
| Responsive — `app.css` | Dưới 900px ép sidebar thành rail 68px và ẩn nút mở menu. Nhiều bảng, form và ma trận không có bố cục riêng cho màn hẹp. | Menu dạng overlay trên màn hẹp; nút mở luôn truy cập được; cuộn ngang chỉ trong bảng; form về một cột. |
| Bảng — `CorePages.tsx`, `ops/*` | Bảng generic chỉ nằm cục bộ trong CorePages; nhiều trang tự viết bảng. Nội dung bị cắt tối đa 300px, hành động nằm thành dãy nút. Hàng click mở chi tiết chưa có điều hướng bàn phím tương ứng. | DataTable dùng chung, cột nội dung chính được xuống dòng, mã rút gọn có nút sao chép, action chính + menu phụ; liên kết/nút chi tiết dùng được bằng bàn phím. |
| Dialog/drawer — `Shared.tsx` | Mỗi trang tự dựng overlay. Escape được xử lý bằng cách tìm nút theo chữ Hủy/Đóng trong DOM. Chưa có focus trap, trả focus hoặc xác nhận bỏ thay đổi dùng chung. | Một lớp Dialog/Drawer chuẩn, đóng bằng callback; focus trap, Escape, focus return, chặn bỏ thay đổi khi form dirty. |
| Form dài/JSON | Phương pháp tài chính, liên kết mẫu, khảo sát và tài liệu AI còn dùng nhiều textarea JSON. Lỗi lưu thường nằm ngoài overlay nên có thể bị che. | Form theo phần; lỗi ngay trường và trong drawer; JSON là chế độ nâng cao, có validate, định dạng và preview/diff. |
| Trạng thái | Skeleton, rỗng, lỗi và thành công có sẵn nhưng dùng không đều. Success banner tồn tại lâu; một số trang giữ dữ liệu cũ khi đang đổi lọc mà không báo đang tải lại. | Chuẩn hóa tải đầu/tải lại/lưu, error cục bộ, toast thành công, thời gian cập nhật và trạng thái dữ liệu cũ. |
| Dashboard | Admin và Ops dùng nhiều KPI/bảng nhỏ; chưa phân cấp rõ chỉ số cần hành động. | Ưu tiên ca trễ, ca chưa nhận, đề xuất chờ, lỗi dịch vụ; thêm liên kết từ KPI sang danh sách lọc sẵn nếu danh sách hỗ trợ. |
| Ticket | Thread, composer, xin dữ liệu khách và điều phối đều nằm trên một trang dài. Checkbox quyết định gửi khách hay ghi chú nội bộ. | Không gian xử lý ca, composer có hai chế độ phân biệt rõ, panel dữ liệu/điều phối mở theo nhu cầu; SLA và người phụ trách luôn dễ thấy. |
| Cấu hình AI | Danh sách tài liệu + editor + lịch sử dồn trong một card, kết quả xem thử là JSON; luật có nhiều tab phụ, lý do nằm trong form riêng lẻ. | Workspace tài liệu có phiên bản/diff/preview rõ ràng; bảng luật theo loại, lịch sử có trước/sau, hành động lưu và kích hoạt tách rõ. |
| Quyền và dữ liệu khách | Có capability, OTP và consent theo ca; UI mới phải thể hiện đúng trạng thái hạn quyền và phạm vi truy cập. | Thiết kế theo quyền backend; không làm xuất hiện hành động không được phép, không tự tải dữ liệu khách để phục vụ preview. |
| Tài liệu và test | README/fixture còn mô tả 15 trang và một số API “chưa có” dù code đã nối. Browser test chưa bao phủ OTP, Staff/OpsManager và nhóm `/ops/*`. | Cập nhật tài liệu theo route/API hiện dùng, thêm test theo vai trò và OTP, giữ phân biệt cursor admin/offset ops. |

## 3. Hướng giao diện đề xuất

### 3.1 Ngôn ngữ thị giác

- Phong cách console quản trị gọn, rõ dữ liệu: nền xám nhẹ, surface trắng, teal cho điều hướng và hành động chính; đỏ/vàng chỉ cho rủi ro và cảnh báo.
- Kế thừa IBM Plex Sans/Mono và token light/dark hiện có; chuẩn hóa thang khoảng cách 4/8/12/16/24/32px, chiều cao control 36–40px, hàng bảng 44–52px. Tiêu đề trang 24–28px, nội dung chính 14px; mã/JSON dùng mono.
- Mỗi màn có một hành động chính. Thao tác nguy hiểm đặt trong khu vực riêng và dùng nhãn cụ thể như “Khóa tài khoản”, “Kích hoạt v3”.
- Trạng thái có nhãn tiếng Việt và icon khi cần; enum kỹ thuật chỉ hiện ở tooltip/chi tiết. KPI hiện đơn vị và phạm vi ngày, không hiển thị phần trăm so sánh khi API không đủ dữ liệu.

### 3.2 Khung điều hướng

- Đầu sidebar có bộ chọn **Quản trị / Vận hành** cho Admin. Staff/OpsManager thấy không gian phù hợp capability; mọi route kiểm quyền vẫn giữ tại frontend và backend.
- Quản trị chia nhóm: Tổng quan; Tài khoản & quyền; Danh mục tài chính; Cấu hình hệ thống/AI. Vận hành gồm Tổng quan; Ticket; Đề xuất; Giám sát; Nhật ký; Câu trả lời mẫu; Thống kê AI.
- Trang chưa kết nối như Sync/Học AI vẫn truy cập được ở nhóm liên quan, có nhãn trạng thái; không chiếm vùng KPI chính.
- Topbar có breadcrumb thật, tìm trang (có thể thêm Ctrl+K bằng code hiện có), chuyển theme và menu hồ sơ. Không đặt tên “tìm kiếm” cho chức năng chỉ lọc menu.
- Desktop dùng sidebar 240–256px; dưới 900px dùng menu overlay; ưu tiên desktop 1280–1920px và tablet 1024px.

### 3.3 Mẫu màn hình thống nhất

1. **Danh sách:** PageHeader → vùng lọc → chip bộ lọc đang áp dụng → bảng → phân trang. Bộ lọc và tab lưu ở URL khi có ích cho liên kết/quay lại.
2. **Chi tiết:** drawer 480–640px cho tài khoản/audit/sự cố; trang riêng hoặc editor rộng cho cấu hình phức tạp. Drawer có tiêu đề và footer cố định.
3. **Cấu hình:** nhóm điều hướng → nội dung đang chỉnh → thanh lưu với dirty state và phạm vi tác động; lịch sử/xem trước mở riêng thay vì luôn chiếm chiều dài trang.
4. **Vận hành:** vùng làm việc chính + panel ngữ cảnh. Các hành động điều phối hoặc dữ liệu nhạy cảm chỉ mở khi cần.

## 4. Thay đổi theo nhóm màn

| Nhóm | Giao diện đích |
|---|---|
| Login/OTP/Profile | Form login gọn, nút hiện mật khẩu nằm cạnh input; OTP một luồng rõ gửi mã/nhập mã/gửi lại/hết hạn. Giữ `one-time-code`, hỗ trợ dán đủ 6 số. Profile chia thông tin, đổi mật khẩu, quản lý phiên. |
| Dashboard Admin/Ops/AI | KPI có thứ tự ưu tiên; bảng tải nhân viên, SLA và chất lượng nằm theo nhóm. Dữ liệu thiếu thể hiện “Chưa có/Chưa hỗ trợ”, không dùng zero thay null. Dùng bar/ring SVG đơn giản cho phân bố có dữ liệu; không dựng biểu đồ thời gian từ tổng số. |
| Users/Roles | Danh sách nhân sự và ma trận quyền thành tab riêng; ma trận có cột quyền cố định và phần thay đổi trước khi lưu. Users có drawer thông tin phân nhóm; khóa nằm trong menu phụ và dialog tác động rõ. |
| Audit/Deletion | Nhãn sự kiện/trạng thái dễ đọc; ID sao chép được; audit drawer có phần tổng quan + metadata được che theo chính sách. Giữ rõ CSV chỉ xuất dữ liệu đã tải. |
| Categories/Providers/Goals | Dùng chung list/drawer. Icon danh mục có preview; nhà cung cấp có nhãn loại; mô tả dài xuống dòng. Giữ bộ lọc khi đóng drawer hoặc lưu. |
| Finance methods | Màn danh sách gọn, chỉnh phương pháp chia phần Thông tin/Tham số/Điều kiện/Bước đầu/Mẫu mục tiêu. Editor tham số và liên kết dạng form; JSON nâng cao vẫn giữ. Bộ chỉnh trang chủ dùng editor rộng, preview sticky và báo lỗi cạnh từng khối/hũ. |
| Survey | Danh sách nhóm + vùng preview câu hỏi; chỉnh option trực tiếp trong drawer riêng; signals/showIf có form hỗ trợ trong phạm vi schema đã có, JSON nâng cao. Thao tác thứ tự dùng lên/xuống truy cập bàn phím. |
| Provider formats | Danh sách có tìm/lọc theo provider/trạng thái; workspace chi tiết chia Pattern/Mẫu kiểm tra/Chạy thử. Kết quả parse thành bảng field/value, trạng thái check nổi bật cạnh nút kích hoạt; regex nâng cao không chiếm toàn màn. |
| AI documents/rules/prompts | Chia tài liệu, nội dung và phiên bản; tải nội dung phiên bản trước khi khôi phục; hiển thị diff và regression trước khi kích hoạt/force. Luật thành bảng có trạng thái, danh mục và cập nhật. Prompt có chế độ đọc/so sánh/tạo phiên bản. |
| System config/Secrets | Nhóm cấu hình theo nhiệm vụ, thanh lưu cố định, lỗi validation cạnh ô nhập; so sánh bản đang chạy với bản sắp lưu. Secrets giữ che key, kết quả test ở từng dịch vụ, không render lại key đã lưu. Preview theme gắn nhãn “Minh họa” để tránh hiểu là dữ liệu khách. |
| Ticket queue/detail | Queue ưu tiên chủ đề, SLA, trạng thái và người xử lý; cột phụ vào chi tiết. Detail giữ thread/composer là vùng chính; thông tin ca sticky, dữ liệu khách và điều phối là tab/panel. Gửi khách và ghi chú nội bộ dùng hai mode có nhãn và màu rõ. |
| Customer data/Approvals | Consent scope và hạn hiệu lực luôn hiện; dữ liệu chỉ tải khi bấm như hiện tại. Form đề xuất mở từ CTA thay vì chiếm đầu trang; xem chi tiết tác động trước khi duyệt; mã có sao chép, tra cứu chỉ bổ sung nếu API hỗ trợ. |
| Monitoring/Canned replies | Service status thành card trạng thái + thời gian kiểm tra; sự cố dùng bảng/drawer, OCR có KPI và bảng chi tiết. Câu trả lời mẫu chuyển thành danh sách có preview, form thêm/sửa mở theo nhu cầu. |

## 5. Thứ tự triển khai và đầu ra

### Bước 0 — Chốt hiện trạng có hình ảnh

- Chụp các màn đại diện ở 1440×900: Dashboard, Users, ticket queue/detail, AI document, System limits, HomeLayoutEditor, Roles. Ghi thêm trạng thái OTP và menu của từng vai trò.
- Đối chiếu API/route đang chạy; thay các mục backlog cũ bằng tình trạng thật. Không yêu cầu lại thông tin đã có trừ khi phiên/tài khoản hiện tại không còn dùng được.
- Đầu ra: ảnh hiện trạng + checklist từng màn; xác định phần chỉ đổi UI và phần cần API mới.

### Bước 1 — Thành phần nền và shell (ưu tiên cao nhất)

- Tách Shell/Navigation/Login/Otp khỏi `App.tsx` cho dễ thay giao diện; giữ luồng xác thực/capability.
- Tạo `ui/` cho Button, Badge, Tabs, DataTable, FilterBar, Drawer, Dialog, FormField, Toast, PageState và SaveBar; chuyển token từ `app.css` thành các phần nền/layout/components.
- Dựng shell mới và 3 màn mẫu: Users, ticket detail, AI document. Kiểm tra các mẫu trước khi chuyển các trang còn lại.
- Điều kiện xong: light/dark, menu theo vai trò, modal bàn phím, responsive không tràn trang.

### Bước 2 — Dashboard và các trang dữ liệu chung

- Chuyển Users, Roles, Audit, Deletion, Categories, Providers tab A, Goal templates và các Dashboard sang thành phần mới.
- Chuẩn hóa trạng thái lỗi/rỗng/tải lại, action menu và liên kết từ dashboard.
- Điều kiện xong: giữ đúng filter, cursor/offset và quyền; thao tác chính dễ tìm, dữ liệu dài đọc được.

### Bước 3 — Các editor và cấu hình

- Chuyển Finance methods/Home layout, Survey, Formats, AI docs/rules/prompts, System config và Secrets.
- Thêm cảnh báo rời form chưa lưu, diff/preview, lỗi cục bộ trong editor; giữ cơ chế expected version và xác nhận thao tác nhạy cảm.
- Điều kiện xong: không mất bản nhập khi lỗi; lỗi không nằm sau overlay; preview và trạng thái bản đang chạy luôn rõ.

### Bước 4 — Không gian vận hành

- Chuyển Ticket queue/detail, CustomerDataPanel, TicketManagePanel, Approvals, Monitoring, Ops Audit và Canned replies.
- Giữ consent theo ca, audit đọc dữ liệu và nguyên tắc hai người duyệt. Không tự gọi API dữ liệu khách để làm UI demo.
- Điều kiện xong: Staff/OpsManager/Admin dùng đúng menu/hành động; mode ghi chú nội bộ rõ ràng; SLA đọc được khi thread dài.

### Bước 5 — Kiểm chứng và bàn giao

- Build/lint; cập nhật browser test theo OTP và capability hiện tại. Tài khoản thử riêng cho Staff/OpsManager/Admin; không tắt OTP để vượt test.
- Screenshot 1280/1440/1920 và 1024/768; light/dark; keyboard/focus, tooltip, drawer, sticky header/footer, text dài, danh sách lớn.
- Test login/OTP/F5/refresh/logout, quyền thay đổi, filter/back navigation, cursor và offset, 403, timeout, 409, dirty form và lỗi ghi. Mutation chỉ thử trên đối tượng test có thể khôi phục.
- README và fixture cập nhật đúng chức năng hiện tại; lưu ảnh trước/sau và checklist nghiệm thu.

## 6. Điều kiện nghiệm thu

- Tất cả màn đang có và alias route vẫn mở được theo đúng vai trò; không tự đổi nghiệp vụ hoặc bổ sung KPI chưa có nguồn.
- Người dùng biết đang ở đâu, hành động chính là gì, bản cấu hình nào đang chạy và thay đổi nào chưa lưu.
- Bảng chỉ cuộn ngang trong vùng dữ liệu; không có nút bị đẩy ra ngoài viewport. Drawer/editor không che lỗi hoặc nút lưu.
- Mọi hành động dùng được bằng bàn phím; focus trở về đúng chỗ sau đóng dialog; hành động phụ không gây kích hoạt hành động trên hàng.
- Không giảm bảo vệ OTP, capability, consent và cơ chế che key/metadata khi thay UI.
- Build/lint và các test phù hợp đạt; test mới bao phủ nhóm vận hành và OTP, thay vì chỉ dựa vào bài smoke Admin cũ.

## 7. Ranh giới cần giữ khi thực hiện

- Đây là cập nhật giao diện trên source hiện tại; ưu tiên tái sử dụng contract, model và validation đã có. Refactor phục vụ UI thực hiện theo từng nhóm trang để dễ kiểm chứng.
- Các phần chưa kết nối chỉ được thay trạng thái chờ khi API thật đã được xác minh. Đặc biệt README hiện mâu thuẫn giữa phần mô tả API đã nối và backlog cuối tài liệu; phải rà lại trước khi quảng bá chức năng.
- Plan cũ giữ làm lịch sử. Tài liệu này là kế hoạch UI mới theo source ngày 06/11/2026.
