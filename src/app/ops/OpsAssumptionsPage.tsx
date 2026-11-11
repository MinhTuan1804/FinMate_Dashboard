import { AssumptionsPanel } from '../AssumptionsPanel';
import { PageHeader } from '../Shared';

/** Giả định kinh tế cho Manager: duyệt hoặc gỡ số liệu (lạm phát, lãi suất...) mà agent dùng khi dự báo. Cấu hình tự cập nhật CPI nằm ở trang Admin "Số liệu kinh tế". */
export function OpsAssumptionsPage() {
  return <>
    <PageHeader title="Giả định kinh tế" description="Số liệu dùng cho dự báo dài hạn của agent. Chỉ bản đã duyệt mới được dùng; mỗi bản có nguồn và ngày." />
    <AssumptionsPanel />
  </>;
}
