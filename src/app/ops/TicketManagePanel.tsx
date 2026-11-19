import { ConfirmDialog, PageError } from '../Shared';
import { useState } from 'react';
import { SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { PRIORITIES, del, patch, post, type Ticket, type TicketDetail } from './opsApi';

type Act = (run: () => Promise<TicketDetail | void>, after?: () => void) => Promise<void>;
type Person = { id: string; displayName: string; role: string };

/** Điều phối ca (ManageTickets): phân công, đổi ưu tiên, gom ca cùng lỗi, trả lời hàng loạt. */
export function TicketManagePanel({ ticket, busy, act, reload }: { ticket: Ticket; busy: boolean; act: Act; reload: () => Promise<void> }) {
  const base = `/ops/tickets/${ticket.id}`;
  const people = useServerList<Person>('/ops/tickets/assignees');   // tìm người nhận ở server (Manager không gọi được /admin/users); gõ tên/email để thu hẹp
  const [assignee, setAssignee] = useState(''), [priority, setPriority] = useState(''), [children, setChildren] = useState(''), [note, setNote] = useState('');
  const [broadcast, setBroadcast] = useState(''), [resolve, setResolve] = useState(false),[confirmation,setConfirmation]=useState<{title:string;description:string;run:()=>Promise<void>}|null>(null);
  const closed = ticket.status === 'Closed';
  const target = assignee;
  const ids = children.split(/[\s,;]+/).filter(Boolean);
  const validIds=ids.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)&&id.toLowerCase()!==ticket.id.toLowerCase())&&new Set(ids).size===ids.length;

  return <div className="fm-card">
    <h2>Điều phối</h2><PageError message={people.error} retry={people.reload}/>{confirmation&&<ConfirmDialog title={confirmation.title} description={confirmation.description} busy={busy} onCancel={()=>setConfirmation(null)} onConfirm={async()=>{await confirmation.run();setConfirmation(null);}}/>}
    {note && <p className="fm-success">{note}</p>}
    <div className="fm-form fm-form--stack">
      <SearchField label="Tìm người nhận" value={people.search} onChange={people.setSearch} placeholder="Tên hoặc email"/>
      <label>Phân công cho<select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">{people.loading ? 'Đang tìm...' : people.rows.length ? 'Chọn người...' : 'Không có ai khớp'}</option>{people.rows.map(p => <option key={p.id} value={p.id}>{p.displayName} · {p.role}</option>)}</select></label>
      <div><button className="btn" disabled={busy || closed || !target || target === ticket.assigneeUserId} onClick={() => void act(() => patch<TicketDetail>(`${base}/assignee`, { assigneeUserId: target }), () => setAssignee(''))}>Phân công</button></div>
      <label>Đổi mức ưu tiên<select value={priority} onChange={e => setPriority(e.target.value)}><option value="">Chọn...</option>{PRIORITIES.filter(p => p !== ticket.priority).map(p => <option key={p}>{p}</option>)}</select></label>
      <div><button className="btn" disabled={busy || closed || !priority} onClick={() => void act(() => patch<TicketDetail>(`${base}/priority`, { priority }), () => setPriority(''))}>Đổi ưu tiên</button></div>
    </div>
    <h3>Gom ca cùng lỗi</h3>
    <div className="fm-form fm-form--stack">
      {ticket.parentTicketId
        ? <div><p className="fm-hint">Ca này là ca con của một ca khác.</p><button className="btn" disabled={busy} onClick={() => void act(() => del<TicketDetail>(`${base}/parent`))}>Gỡ khỏi ca cha</button></div>
        : <><label>Mã các ca con (cách nhau bằng dấu cách hoặc dấu phẩy)<textarea rows={2} value={children} onChange={e => setChildren(e.target.value)} placeholder="Chỉ gom một tầng, không gom ca đã đóng"/></label><PageError message={children.trim()&&!validIds?'Mã ca chưa đúng định dạng, bị trùng hoặc là mã của ca đang mở.':''}/>
          <div><button className="btn" disabled={busy || ids.length === 0 || !validIds} onClick={() => setConfirmation({title:`Gom ${ids.length} ca?`,description:'Các ca đã chọn sẽ thành ca con và có thể nhận trả lời hàng loạt từ ca này.',run:()=>act(() => post<TicketDetail>(`${base}/children`, { ticketIds: ids }), () => setChildren(''))})}>Gom {ids.length || ''} ca vào ca này</button></div></>}
    </div>
    {!ticket.parentTicketId && <>
      <h3>Trả lời ca cha và mọi ca con</h3>
      <div className="fm-form fm-form--stack">
        <label>Nội dung<textarea rows={3} value={broadcast} onChange={e => setBroadcast(e.target.value)}/></label>
        <label className="fm-inline"><input type="checkbox" checked={resolve} onChange={e => setResolve(e.target.checked)}/> Chuyển các ca sang Đã giải quyết</label>
        <div><button className="btn" disabled={busy || closed || !broadcast.trim()} onClick={() => setConfirmation({title:'Gửi trả lời tới ca cha và mọi ca con?',description:resolve?'Nội dung sẽ được gửi cho tất cả khách của các ca liên quan và đánh dấu đã giải quyết.':broadcast.trim(),run:()=>act(async () => { const r = await post<{ count: number }>(`${base}/broadcast`, { body: broadcast.trim(), resolve }); setNote(`Đã gửi tới ${r.count} ca.`); setBroadcast(''); await reload(); })})}>Gửi hàng loạt</button></div>
      </div>
    </>}
  </div>;
}
