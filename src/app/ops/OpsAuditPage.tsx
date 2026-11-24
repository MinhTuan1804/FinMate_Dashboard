import { AuditDetail } from '../ui/AuditParts';
import { auditColumns } from '../ui/auditColumns';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AuditLog } from '../../shared/models';
import { CursorPager, PageHeader } from '../Shared';
import { useResource } from '../ui/useResource';
import { ResourceView } from '../ui/ResourceView';
import { DataTable } from '../ui/DataTable';
import { Details, Refresh } from '../modules/ModuleParts';

type AuditPage={items:AuditLog[];nextCursor:string|null};
const read=(p:URLSearchParams)=>({eventType:p.get('eventType')||'',search:p.get('search')||'',from:p.get('from')||'',to:p.get('to')||''});
export function OpsAuditPage(){
  const [params,setParams]=useSearchParams(),applied=read(params);
  const [filters,setFilters]=useState(applied),[stack,setStack]=useState<(string|null)[]>([]),[selected,setSelected]=useState<AuditLog|null>(null);
  useEffect(()=>{queueMicrotask(()=>setFilters(read(params)));},[params]);
  const invalid=Boolean(applied.from&&applied.to&&applied.from>applied.to);
  const resource=useResource<AuditPage>('/ops/audit-logs',{eventType:applied.eventType||undefined,search:applied.search||undefined,from:applied.from?applied.from+':00+07:00':undefined,to:applied.to?applied.to+':59.999+07:00':undefined,cursor:params.get('cursor')||undefined,limit:30},!invalid);
  const rows=resource.data?.items||[];
  function apply(e:FormEvent){e.preventDefault();setStack([]);setParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));}
  function cursor(value:string|null){setParams(p=>{const next=new URLSearchParams(p);if(value)next.set('cursor',value);else next.delete('cursor');return next;});}
  return <><PageHeader title="Nhật ký vận hành" description="Theo dõi thao tác của đội vận hành, việc truy cập dữ liệu được khách đồng ý và các quyết định kiểm duyệt."/><div className="fm-card"><form className="fm-toolbar fm-filter-bar fm-audit-filters fm-audit-filters--four" onSubmit={apply}><label>Mã sự kiện<input value={filters.eventType} onChange={e=>setFilters({...filters,eventType:e.target.value})} placeholder="Mã sự kiện cần tra cứu"/></label><label>Tìm (mã sự kiện, IP)<input type="search" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label><label>Từ (giờ VN)<input type="datetime-local" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label><label>Đến (giờ VN)<input type="datetime-local" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label><div className="fm-audit-filters__actions"><button className="btn btn--primary">Áp dụng</button><button type="button" className="btn" onClick={()=>{setFilters({eventType:'',search:'',from:'',to:''});setStack([]);setParams({});}}>Xóa lọc</button></div></form><Refresh onClick={resource.reload} busy={resource.refreshing} updatedAt={resource.updatedAt}/><ResourceView {...resource} error={invalid?'Thời điểm bắt đầu phải trước thời điểm kết thúc.':resource.error} hasData={!invalid&&Boolean(resource.data)} empty={!rows.length}><DataTable rows={rows} columns={auditColumns} onOpen={setSelected} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r)}>Chi tiết</button>}/><CursorPager back={Boolean(params.get('cursor'))} next={Boolean(resource.data?.nextCursor)} onBack={()=>{cursor(stack.at(-1)||null);setStack(s=>s.slice(0,-1));}} onNext={()=>{setStack(s=>[...s,params.get('cursor')]);cursor(resource.data?.nextCursor||null);}}/></ResourceView></div>{selected&&<Details title={selected.title||'Chi tiết hoạt động vận hành'} onClose={()=>setSelected(null)}><AuditDetail log={selected}/></Details>}</>;
}
