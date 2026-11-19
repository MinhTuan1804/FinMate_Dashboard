# FinMate Dashboard — style từ mobile Figma

Nguồn: file `0FARhRxrDACXkMZEaLKSGK`, Page 2 `102:55`. Đối chiếu Home `103:57`, Login `103:708`, giao dịch `135:6215`, cài đặt `103:270`, logo `103:1063` ngày 19/11/2026.

- Nền xanh sương #D5E2F2 → #E0E8F3 → #DBE6F4, điểm hồng mờ ở vùng nội dung. Theo phản hồi 19/11, giảm mảng trắng: sidebar #C4D6EC → #D6DCED, thẻ #E8EFF8, nền nâng #F0F4FA, thẻ chỉ số xanh #D6E4F5 / hồng #EADDE9.
- Text #0D1C2E, accent #33628B, primary action #111827 với chữ trắng.
- Be Vietnam Pro cho nội dung tiếng Việt, Inter cho heading/số; WOFF2 tự host, font-display swap, giấy phép SIL OFL.
- Thẻ kính có sắc xanh, viền #B6C8DE, sidebar có viền riêng #9AAFCA, radius 24px / mobile 22px, shadow xanh nhẹ. Header/sidebar blur 20–24px; không blur từng dòng bảng. Menu mobile đóng không để lộ bóng.
- Primary/tab active là pill đen; icon circle xanh nhạt; input radius 16px, label luôn hiện, focus/error rõ.
- Sidebar 268px / topbar 80px; gutter desktop 32–48px, tablet 24px, phone 16px. Bảng operational cuộn trong khung.
- Dark mode giữ hierarchy, canvas navy/surface xanh đậm/chữ sáng. Semantic states có cả nhãn và màu.
- Assets gốc: src/assets/figma/{finmate-mark,login-email,login-lock}.svg; giữ root width/height. Ảnh/số người dùng lấy dữ liệu hiện hành.

UI/UX Pro Max: Minimalism/Data-Dense Dashboard phù hợp console. Không áp dụng pattern landing-page/palette/font mặc định từ search; Figma quyết định style. React guidance áp dụng theo React 18 hiện có.

Implementation: design-tokens.css là nguồn token duy nhất; finmate-theme.css là lớp visual chung; app.css/ui.css giữ layout/behavior. API/quyền/nghiệp vụ giữ nguyên. Sửa scroll về đầu khi đổi pathname để điều hướng nhất quán.

Phạm vi: toàn bộ dashboard, login/profile, tab/drawer/dialog/loading/empty/error. Kiểm tra 1440/1024/768/375, light/dark, focus/keyboard, dirty guard, form/bảng. Bằng chứng: outputs/finmate-dashboard-restyle-2026-11-19.

Ngôn ngữ giao diện: mô tả công việc và tác động bằng tiếng Việt. Không kể API/backend/Agent/contract trong mô tả trang. Nhật ký hiển thị tên hoạt động; mã sự kiện, UUID, IP và dữ liệu đối chiếu ở phần thu gọn. Quy tắc/JSON vẫn chỉnh được qua chế độ nâng cao. Tỷ lệ kinh tế nhập theo %, chuyển đổi sang đơn vị lưu trữ trước khi gửi; mã và dữ liệu gửi đi giữ nguyên. Giá trị chưa biết không được đoán nghĩa. Dữ liệu minh họa luôn gắn nhãn rõ.
