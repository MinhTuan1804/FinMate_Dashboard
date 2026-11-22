import { useActions, useModuleTab } from './useModuleActions';
import { useState } from 'react';
import { api, type OpsMe } from '../../shared/api';
import { fmtDate } from '../../shared/format';
import { PageHeader } from '../Shared';
import { SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { useResource } from '../ui/useResource';
import { useUrlState } from '../ui/useUrlState';
import { ResourceView } from '../ui/ResourceView';
import { Details, EditDialog, FilterSelect, ModuleTabs, Refresh, ResourceTable, SafeLink, type Field } from './ModuleParts';

type Document={id:string;title:string;source_name:string;source_url:string|null;as_of:string;effective_from:string;effective_to:string|null;status:string;version:number;chunks:number;text?:string};
type Candidate={id:string;question_hash:string;count:number;first_seen:string;last_seen:string;status:string};
const base='/admin/knowledge';
const tabs:[string,string][]=[['documents','Tài liệu'],['candidates','Câu hỏi cần bổ sung']];
const states:[string,string][]=[['Draft','Nháp'],['Approved','Đã duyệt'],['Retired','Đã gỡ']];
const fields:Field[]=[{key:'title',label:'Tiêu đề',required:true,maxLength:200},{key:'source_name',label:'Tên nguồn',required:true,maxLength:200},{key:'source_url',label:'Liên kết nguồn',type:'url',maxLength:500},{key:'as_of',label:'Ngày của số liệu',type:'date',required:true},{key:'effective_from',label:'Có hiệu lực từ',type:'date',required:true},{key:'effective_to',label:'Hết hiệu lực (tùy chọn)',type:'date'},{key:'text',label:'Nội dung tài liệu',type:'textarea',required:true,maxLength:50000,hint:'Tối đa 50.000 ký tự. Tài liệu phải được duyệt trước khi AI sử dụng.'}];
export function KnowledgeLibraryPage({me}:{me:OpsMe}) {
  const tab=useModuleTab(tabs),[status,setStatus]=useUrlState('status'),[creating,setCreating]=useState(false),[selected,setSelected]=useState<string|null>(null);
  const docs=useServerList<Document>(`${base}/documents`,{params:{status:states.some(([s])=>s===status)?status:undefined},enabled:tab==='documents'});
  const candidates=useServerList<Candidate>(`${base}/candidates`,{params:{status:['New','Dismissed','Covered'].includes(status)?status:undefined},enabled:tab==='candidates'});
  const detail=useResource<Document>(`${base}/documents/${selected}`,{},Boolean(selected));
  const actions=useActions(base),canReview=['Admin','OpsManager'].includes(me.role);
  const active=tab==='documents'?docs:candidates;
  return <><PageHeader title="Kho tri thức" description="Soạn tài liệu có nguồn và ngày số liệu, duyệt trước khi đưa vào câu trả lời của AI." action={<button className="btn btn--primary" onClick={()=>setCreating(true)}>Thêm tài liệu</button>}/>
    <ModuleTabs tabs={tabs}/>{actions.feedback}<div className="fm-card"><div className="fm-toolbar fm-filter-bar">
      {tab==='documents'&&<SearchField value={docs.search} onChange={docs.setSearch} placeholder="Tiêu đề hoặc nguồn"/>}
      <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={tab==='documents'?states:[['New','Mới'],['Dismissed','Đã bỏ qua'],['Covered','Đã có tài liệu']]}/><Refresh onClick={active.reload} busy={active.refreshing} updatedAt={active.updatedAt}/></div>
      {tab==='documents'?<ResourceTable resource={docs} filtered={Boolean(status||docs.search)} columns={[{key:'title',label:'Tiêu đề'},{key:'source_name',label:'Nguồn'},{key:'as_of',label:'Ngày số liệu',render:r=>fmtDate(r.as_of)},{key:'status',label:'Trạng thái'},{key:'chunks',label:'Số đoạn'}]} onOpen={r=>setSelected(r.id)} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r.id)}>Đọc tài liệu</button>}/>:
        <><p className="fm-hint">Chỉ lưu mã băm câu hỏi và số lần gặp. Không có nội dung câu hỏi hay danh tính người dùng. Đánh dấu đã xử lý không tạo tài liệu mới.</p><ResourceTable resource={candidates} filtered={Boolean(status)} columns={[{key:'question_hash',label:'Mã băm câu hỏi'},{key:'count',label:'Số lần gặp'},{key:'last_seen',label:'Gần nhất',render:r=>fmtDate(r.last_seen)},{key:'status',label:'Trạng thái'}]} actions={r=><>{r.status==='New'&&<><button className="btn btn--small" onClick={()=>actions.confirm('Đã có tài liệu cho câu hỏi này?','Xác nhận nội dung phù hợp đã được thêm và duyệt trong kho tri thức.',()=>api.post(`${base}/candidates/${r.id}/resolve`,{status:'Covered'}))}>Đã có tài liệu</button><button className="btn btn--small" onClick={()=>actions.confirm('Bỏ qua câu hỏi?','Câu hỏi được đánh dấu đã bỏ qua; không xóa mã băm.',()=>api.post(`${base}/candidates/${r.id}/resolve`,{status:'Dismissed'}))}>Bỏ qua</button></>}</>}/></>}
    </div>
    {creating&&<EditDialog title="Thêm tài liệu tri thức" fields={fields} initial={{title:'',source_name:'',source_url:'',as_of:'',effective_from:'',effective_to:'',text:''}} onClose={()=>setCreating(false)} validate={d=>d.effective_to&&String(d.effective_to)<=String(d.effective_from)?'Ngày hết hiệu lực phải sau ngày bắt đầu.':''} onSave={async d=>{await actions.execute(()=>api.post(`${base}/documents`,{...d,source_url:d.source_url||null,as_of:`${d.as_of}T00:00:00+07:00`,effective_from:`${d.effective_from}T00:00:00+07:00`,effective_to:d.effective_to?`${d.effective_to}T00:00:00+07:00`:null}),'Đã gửi tài liệu nháp. Tài liệu cần được duyệt.');}}/>}
    {selected&&<Details title={detail.data?.title||'Đọc tài liệu'} onClose={()=>setSelected(null)} actions={detail.data&&canReview&&<>
      {detail.data.status==='Draft'&&<button className="btn btn--primary" onClick={()=>actions.confirm('Duyệt tài liệu này?','AI có thể trích dẫn tài liệu khi còn hiệu lực. Kiểm tra nội dung và nguồn trước khi duyệt.',()=>api.post(`${base}/documents/${selected}/approve`))}>Duyệt</button>}
      {detail.data.status!=='Retired'&&<button className="btn" onClick={()=>actions.confirm('Gỡ tài liệu khỏi kho?','AI sẽ ngừng sử dụng tài liệu này.',()=>api.post(`${base}/documents/${selected}/retire`))}>Gỡ tài liệu</button>}</>}>
      <ResourceView {...detail} hasData={Boolean(detail.data)}>{detail.data&&<div className="module-detail"><dl className="result-kv"><div><dt>Nguồn</dt><dd><SafeLink href={detail.data.source_url}>{detail.data.source_name}</SafeLink></dd></div><div><dt>Ngày số liệu</dt><dd>{fmtDate(detail.data.as_of)}</dd></div><div><dt>Hiệu lực</dt><dd>{fmtDate(detail.data.effective_from)} → {fmtDate(detail.data.effective_to)}</dd></div><div><dt>Phiên bản / trạng thái</dt><dd>{detail.data.version} · {states.find(([s])=>s===detail.data?.status)?.[1]||detail.data.status}</dd></div></dl><article className="module-prose">{detail.data.text||'Chưa có nội dung.'}</article></div>}</ResourceView>
    </Details>}
  </>;
}
