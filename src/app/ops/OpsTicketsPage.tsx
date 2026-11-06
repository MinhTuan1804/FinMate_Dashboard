import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { errorText } from '../../shared/api';
import { EmptyState, LoadingRows, PageError, PageHeader } from '../Shared';
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, STATUSES, STATUS_LABEL, dueText, httpStatus, post, queue, type Ticket, type TicketPage } from './opsApi';
import { OffsetPager, SearchField } from '../ui/ListControls';
import { CategoryText, PriorityBadge, SelectFilter, StatusBadge } from './OpsParts';

const LIMIT = 30;
const Due = ({ due, overdue, done }: { due: string; overdue: boolean; done: boolean }) => <span className={overdue ? 'fm-badge bad' : 'fm-badge'}>{dueText(due, overdue, done)}</span>;

/** Hàng đợi ticket. Mọi vai trò nội bộ xem được; "Nhận ca" là cách duy nhất để thành người phụ trách. */
const readFilters=(p:URLSearchParams)=>({status:p.get('status')||'',priority:p.get('priority')||'',category:p.get('category')||'',assignee:p.get('assignee')||'',search:p.get('search')||'',overdue:p.get('overdue')==='true'});

export function OpsTicketsPage() {
  const [params,setParams]=useSearchParams();
  const filters=useMemo(()=>readFilters(params),[params]);
  const [text,setText]=useState(filters.search),timer=useRef<ReturnType<typeof setTimeout>>(undefined);
  const offset=Math.max(0,Number(params.get('offset'))||0);
  const setOffset=(value:number)=>{const next=new URLSearchParams(params);next.set('offset',String(value));setParams(next)};
  const [page,setPage]=useState<TicketPage|null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [claiming, setClaiming] = useState('');
  const navigate = useNavigate();
  const load = useCallback(async () => {
    setLoading(true);
    try { setPage(await queue({ ...filters, offset, limit: LIMIT })); setError(''); } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, [filters, offset]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const update=(patch:Partial<typeof filters>)=>setParams(prev=>{const next={...readFilters(prev),...patch};return Object.fromEntries(Object.entries(next).filter(([,value])=>value!==''&&value!==false).map(([key,value])=>[key,String(value)]))});   // đổi bộ lọc/từ khóa thì bỏ offset → về trang 1
  const onSearch=(value:string)=>{setText(value);clearTimeout(timer.current);timer.current=setTimeout(()=>update({search:value.trim()}),value.trim()?400:0)};

  async function claim(t: Ticket) {
    setClaiming(t.id);
    try { await post(`/ops/tickets/${t.id}/claim`); navigate(`/ops/tickets/${t.id}`); }
    catch (e) {
      const message=httpStatus(e) === 409 ? 'Ca đã có người nhận trước bạn.' : httpStatus(e) === 403 ? 'Bạn không xử lý được ca này (ca do chính bạn tạo).' : errorText(e);
      await load();setError(message);
    } finally { setClaiming(''); }
  }

  return <>
    <PageHeader title="Hàng đợi ticket" description="Ca hỗ trợ của khách, hạn gần nhất trước. Mặc định không hiện ca đã đóng."/>
    <PageError message={error} retry={() => void load()}/>
    <div className="fm-card">
      <div className="fm-toolbar fm-filter-bar">
        <SearchField value={text} onChange={onSearch} placeholder="Chủ đề hoặc tên khách"/>
        <SelectFilter label="Trạng thái" value={filters.status} onChange={v => update({ status: v })} options={STATUSES.map(s => [s, STATUS_LABEL[s]])}/>
        <SelectFilter label="Ưu tiên" value={filters.priority} onChange={v => update({ priority: v })} options={PRIORITIES.map(p => [p, p])}/>
        <SelectFilter label="Loại" value={filters.category} onChange={v => update({ category: v })} options={CATEGORIES.map(c => [c, CATEGORY_LABEL[c]])}/>
        <label>Người phụ trách<select value={filters.assignee} onChange={e => update({ assignee: e.target.value })}><option value="">Tất cả</option><option value="me">Của tôi</option><option value="none">Chưa ai nhận</option></select></label>
        <label className="fm-inline"><input type="checkbox" checked={filters.overdue} onChange={e => update({ overdue: e.target.checked })}/> Chỉ ca trễ hạn</label>
      </div>
      {loading && !page ? <LoadingRows/> : !page || page.items.length === 0 ? <EmptyState message="Không có ca nào khớp bộ lọc"/> :
        <div className="fm-table-wrap"><table className="fm-table"><thead><tr><th>Chủ đề</th><th>Khách</th><th>Ưu tiên</th><th>Trạng thái</th><th>Phụ trách</th><th>Phản hồi đầu</th><th>Giải quyết</th><th></th></tr></thead><tbody>
          {page.items.map(t => <tr key={t.id} onClick={() => navigate(`/ops/tickets/${t.id}`)} style={{ cursor: 'pointer' }}>
            <td className="cell-primary"><button className="cell-link" onClick={event=>{event.stopPropagation();navigate(`/ops/tickets/${t.id}`)}}>{t.subject}</button><small className="ticket-category"><CategoryText value={t.category}/></small></td><td>{t.requesterName ?? '—'}</td><td><PriorityBadge value={t.priority}/></td><td><StatusBadge value={t.status}/></td>
            <td>{t.assigneeName ?? <em>Chưa ai nhận</em>}</td>
            <td>{t.firstRespondedAt ? <span className="fm-badge good">Đã phản hồi</span> : <Due due={t.firstResponseDueAt} overdue={t.firstResponseOverdue} done={false}/>}</td>
            <td><Due due={t.resolveDueAt} overdue={t.resolutionOverdue} done={Boolean(t.resolvedAt || t.closedAt)}/></td>
            
            <td className="fm-actions">{!t.assigneeUserId && t.status !== 'Closed' && <button className="btn btn--small btn--primary" disabled={claiming === t.id} onClick={e => { e.stopPropagation(); void claim(t); }}>{claiming === t.id ? 'Đang nhận...' : 'Nhận ca'}</button>}</td>
          </tr>)}
        </tbody></table></div>}
      {page && <OffsetPager offset={page.offset} limit={page.limit} total={page.total} onChange={setOffset}/>}
    </div>
  </>;
}
