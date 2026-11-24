import { AuditActor } from './ui/AuditParts';
import { ArrowUpRight, BellRing, ClipboardCheck, Clock3, Inbox, MessageSquareText, UserRoundSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AiStats, AuditLog, DeletionRequest } from '../shared/models';
import { calendarRange } from '../shared/dateRange';
import { fmtDate } from '../shared/format';
import { PageError, PageHeader } from './Shared';
import { useUrlState } from './ui/useUrlState';
import { useResource } from './ui/useResource';
import { ResourceView } from './ui/ResourceView';
import { Distribution } from './ui/Distribution';
import { ServiceStatusPanel } from './ops/ServiceStatusPanel';
import { Refresh } from './modules/ModuleParts';
import type { Dashboard } from './ops/opsApi';

export function HomePage(){
  const [range,setRange]=useUrlState('range','7'),[from,setFrom]=useUrlState('from'),[to,setTo]=useUrlState('to');
  const window=calendarRange(range,from,to);
  const ai=useResource<AiStats>('/ops/ai-stats',{from:window.from,to:window.to},!window.error);
  const ops=useResource<Dashboard>('/ops/dashboard');
  const audit=useResource<AuditLog[]>('/admin/audit-logs',{limit:5});
  const deletions=useResource<DeletionRequest[]>('/admin/data-deletion-requests',{status:'Pending',limit:5});
  const p=ai.data?.production;
  return <div className="home-dashboard"><PageHeader title="Dashboard" description="Việc cần xử lý, chất lượng AI và sức khỏe vận hành. Thời gian hiển thị theo Việt Nam." action={<Refresh busy={[ai,ops,audit,deletions].some(r=>r.refreshing)} onClick={()=>[ai,ops,audit,deletions].forEach(r=>r.reload())}/>}/>
    <div className="home-overview-grid"><section className="fm-card home-workflows"><div className="home-section-head"><div><span className="home-kicker">Công việc hôm nay</span><h2>Việc cần xử lý</h2></div><span className="fm-badge info">Vận hành</span></div><ResourceView {...ops} hasData={Boolean(ops.data)}>{ops.data&&<div className="home-actions">
      <Link to="/ops/tickets?overdue=true"><span className="home-action-icon"><Clock3 size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>{ops.data.load.reduce((n,r)=>n+r.overdueCount,0)}</strong><span>Ca hỗ trợ trễ hạn đã có người phụ trách</span></Link>
      <Link to="/ops/tickets"><span className="home-action-icon"><Inbox size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>{ops.data.openByStatus.reduce((n,r)=>n+r.count,0)}</strong><span>Ca hỗ trợ đang mở · xem hàng đợi</span></Link>
      <Link to="/ops/tickets?assignee=none"><span className="home-action-icon"><UserRoundSearch size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>Chưa phân công</strong><span>Xem các ca chưa có người phụ trách</span></Link>
      <Link to="/ops/approvals"><span className="home-action-icon"><ClipboardCheck size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>Đề xuất</strong><span>Mở hàng đợi duyệt</span></Link>
      <Link to="/ops/community"><span className="home-action-icon"><MessageSquareText size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>Cộng đồng</strong><span>Ảnh và báo cáo cần xử lý</span></Link>
      <Link to="/ops/monitoring?tab=incidents"><span className="home-action-icon"><BellRing size={20} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={16} aria-hidden="true"/><strong>Sự cố</strong><span>Xem sự cố đang mở</span></Link>
    </div>}</ResourceView></section><ServiceStatusPanel compact/></div>
    <div className="home-range-bar"><span className="home-range-label">Chất lượng AI theo thời gian</span><div className="fm-toolbar"><label>Khoảng ngày<select value={range} onChange={e=>setRange(e.target.value)}><option value="1">Hôm nay</option><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="custom">Tùy chọn</option></select></label>{range==='custom'&&<><label>Từ ngày<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Đến ngày<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>}</div></div>
    <PageError message={window.error}/>{!window.error&&<section className="home-ai-section"><div className="home-section-head"><h2>Chất lượng AI</h2><Refresh onClick={ai.reload} busy={ai.refreshing} updatedAt={ai.updatedAt}/></div><ResourceView {...ai} hasData={Boolean(ai.data)}>{ai.data&&<>
      <div className="fm-stats">{[['Đã phân tích',p?.totalAnalyzed],['Nháp đã tạo',p?.draftsCreated],['Nháp đã xác nhận',p?.draftsConfirmed],['Tỷ lệ xác nhận',p?.draftConfirmRate==null?'Chưa có mẫu':`${(p.draftConfirmRate*100).toFixed(1)}%`],['Độ trễ trung bình',p?.avgProcessingMs==null?'Chưa có mẫu':`${Math.round(p.avgProcessingMs)} ms`],['Phản hồi chưa học',ai.data.aiService?.pendingFeedbackCount??'Chưa đo được']].map(([label,value])=><Link className="fm-stat" key={String(label)} to="/ops/ai-stats"><span>{label}</span><strong>{value??'—'}</strong></Link>)}</div><PageError message={ai.data.aiServiceError||''}/><div className="fm-grid"><Distribution title="Kết quả xử lý" values={p?.byPipelineResult||{}}/><Distribution title="Theo nguồn thông báo" values={p?.byPackageName||{}}/></div>
    </>}</ResourceView></section>}
    <div className="fm-grid"><section className="fm-card"><h2>Hoạt động gần đây</h2><ResourceView {...audit} hasData={Boolean(audit.data)} empty={!audit.data?.length}>{audit.data?.map(r=><div className="fm-list-row" key={r.id}><span><strong>{r.title||'Hoạt động khác'}</strong><br/><AuditActor log={r}/></span><small>{fmtDate(r.createdAt)}</small></div>)}</ResourceView><Link to="/audit-logs">Xem nhật ký →</Link></section>
      <section className="fm-card"><h2>Yêu cầu xóa đang chờ</h2><ResourceView {...deletions} hasData={Boolean(deletions.data)} empty={!deletions.data?.length}>{deletions.data?.map(r=><div className="fm-list-row" key={r.id}><span>{r.displayName}</span><small>Hạn xóa: {fmtDate(r.scheduledHardDeleteAt)}</small></div>)}</ResourceView><p className="fm-hint">Tối đa 5 yêu cầu gần nhất; đây không phải tổng toàn hệ thống.</p><Link to="/data-deletion?status=Pending">Xem yêu cầu →</Link></section></div>
    <section className="fm-card home-data-note"><div><h2>Người dùng & giao dịch</h2><p>Số liệu tổng hợp toàn hệ thống chưa sẵn sàng. Bạn có thể xem trước các chỉ số bằng dữ liệu minh họa.</p></div><Link className="btn" to="/overview">Mở tổng quan KPI <ArrowUpRight size={16} aria-hidden="true"/></Link></section>
  </div>;
}
