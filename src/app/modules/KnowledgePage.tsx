import { useActions, useModuleTab } from './useModuleActions';
import { useState } from 'react';
import { api, type OpsMe } from '../../shared/api';
import { fmtDate, fmtDay } from '../../shared/format';
import { PageHeader } from '../Shared';
import { SearchField } from '../ui/ListControls';
import { useServerList } from '../ui/useServerList';
import { useResource } from '../ui/useResource';
import { useUrlState } from '../ui/useUrlState';
import { ResourceView } from '../ui/ResourceView';
import { Details, EditDialog, FilterSelect, ModuleTabs, Refresh, ResourceTable, SafeLink, type Field } from './ModuleParts';

type Document={id:string;title:string;source_name:string;source_url:string|null;as_of:string;effective_from:string;effective_to:string|null;status:string;version:number;chunks:number;text?:string};
type Candidate={id:string;question_hash:string;count:number;first_seen:string;last_seen:string;status:string;topic_code:string|null;topic_label:string|null};
type TopicRow={topic_code:string|null;topic_label:string|null;questions:number;occurrences:number};
const noTopic='Chưa xác định chủ đề';
const base='/admin/knowledge';
const tabs:[string,string][]=[['documents','Tài liệu'],['candidates','Câu hỏi cần bổ sung']];
const states:[string,string][]=[['Draft','Nháp'],['Approved','Đã duyệt'],['Retired','Đã gỡ']];
const fields:Field[]=[{key:'title',label:'Tiêu đề',required:true,maxLength:200},{key:'source_name',label:'Tên nguồn',required:true,maxLength:200},{key:'source_url',label:'Liên kết nguồn',type:'url',maxLength:500},{key:'as_of',label:'Ngày của số liệu',type:'date',required:true},{key:'effective_from',label:'Có hiệu lực từ',type:'date',required:true},{key:'effective_to',label:'Hết hiệu lực (tùy chọn)',type:'date'},{key:'text',label:'Nội dung tài liệu',type:'textarea',required:true,maxLength:50000,hint:'Tối đa 50.000 ký tự. Tài liệu phải được duyệt trước khi AI sử dụng.'}];
export function KnowledgeLibraryPage({me}:{me:OpsMe}) {
  const tab=useModuleTab(tabs),[status,setStatus]=useUrlState('status'),[topic,setTopic]=useUrlState('topic'),[creating,setCreating]=useState(false),[selected,setSelected]=useState<string|null>(null);
  const docs=useServerList<Document>(`${base}/documents`,{params:{status:states.some(([s])=>s===status)?status:undefined},enabled:tab==='documents'});
  const candidates=useServerList<Candidate>(`${base}/candidates`,{params:{status:['New','Dismissed','Covered'].includes(status)?status:undefined,topic:topic||undefined},enabled:tab==='candidates'});
  const topics=useResource<{items:TopicRow[]}>(`${base}/candidate-topics`,{status:'New'},tab==='candidates');
  const detail=useResource<Document>(`${base}/documents/${selected}`,{},Boolean(selected));
  const actions=useActions(base),canReview=me.capabilities.includes('ApproveAgentContent');
  const active=tab==='documents'?docs:candidates;
  return <><PageHeader title="Kho tri thức" description="Soạn tài liệu có nguồn và ngày số liệu, duyệt trước khi đưa vào câu trả lời của AI." action={<button className="btn btn--primary" onClick={()=>setCreating(true)}>Thêm tài liệu</button>}/>
    <ModuleTabs tabs={tabs}/>{actions.feedback}<div className="fm-card"><div className="fm-toolbar fm-filter-bar">
      {tab==='documents'&&<SearchField value={docs.search} onChange={docs.setSearch} placeholder="Tiêu đề hoặc nguồn"/>}
      <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={tab==='documents'?states:[['New','Mới'],['Dismissed','Đã bỏ qua'],['Covered','Đã có tài liệu']]}/>{tab==='candidates'&&<FilterSelect label="Chủ đề" value={topic} onChange={setTopic} options={[...(topics.data?.items||[]).filter(t=>t.topic_code).map(t=>[t.topic_code as string,t.topic_label||(t.topic_code as string)] as [string,string]),['none',noTopic]]}/>}<Refresh onClick={active.reload} busy={active.refreshing} updatedAt={active.updatedAt}/></div>
      {tab==='documents'?<ResourceTable resource={docs} filtered={Boolean(status||docs.search)} columns={[{key:'title',label:'Tiêu đề'},{key:'source_name',label:'Nguồn'},{key:'as_of',label:'Ngày số liệu',render:r=>fmtDay(r.as_of)},{key:'status',label:'Trạng thái'},{key:'chunks',label:'Số đoạn'}]} onOpen={r=>setSelected(r.id)} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r.id)}>Đọc tài liệu</button>}/>:
        <><p className="fm-hint">Đây là những câu người dùng hỏi AI mà kho tri thức chưa có thông tin để trả lời, gom theo chủ đề. Hãy soạn tài liệu cho chủ đề có nhiều lượt hỏi nhất. Hệ thống không lưu nội dung câu hỏi hay danh tính người hỏi nên chỉ biết chủ đề và số lần gặp.</p>{(topics.data?.items?.length||0)>0&&<div className="fm-actions" aria-label="Chủ đề cần bổ sung nhiều nhất">{(topics.data?.items||[]).map(t=><button key={t.topic_code||'none'} className={`btn btn--small${topic===(t.topic_code||'none')?' btn--primary':''}`} onClick={()=>setTopic(topic===(t.topic_code||'none')?'':(t.topic_code||'none'))} title={`${t.questions} câu hỏi khác nhau, ${t.occurrences} lượt hỏi (chưa xử lý)`}>{t.topic_label||noTopic} · {t.occurrences}</button>)}</div>}<ResourceTable resource={candidates} filtered={Boolean(status||topic)} columns={[{key:'topic_label',label:'Chủ đề',render:r=>r.topic_label||noTopic},{key:'count',label:'Số lần gặp'},{key:'last_seen',label:'Gần nhất',render:r=>fmtDate(r.last_seen)},{key:'status',label:'Trạng thái'}]} actions={r=><>{r.status==='New'&&<><button className="btn btn--small" onClick={()=>actions.confirm('Đã soạn tài liệu cho chủ đề này?','Chỉ bấm khi tài liệu phù hợp đã được thêm và duyệt ở tab Tài liệu. Nút này chỉ đổi trạng thái, không tạo tài liệu.',()=>api.post(`${base}/candidates/${r.id}/resolve`,{status:'Covered'}))}>Đã soạn tài liệu</button><button className="btn btn--small" onClick={()=>actions.confirm('Bỏ qua câu hỏi này?','Câu hỏi được đánh dấu là không cần bổ sung và sẽ không còn hiện ở trạng thái Mới.',()=>api.post(`${base}/candidates/${r.id}/resolve`,{status:'Dismissed'}))}>Bỏ qua</button></>}</>}/></>}
    </div>
    {creating&&<EditDialog title="Thêm tài liệu tri thức" fields={fields} initial={{title:'',source_name:'',source_url:'',as_of:'',effective_from:'',effective_to:'',text:''}} onClose={()=>setCreating(false)} validate={d=>d.effective_to&&String(d.effective_to)<=String(d.effective_from)?'Ngày hết hiệu lực phải sau ngày bắt đầu.':''} onSave={async d=>{await actions.execute(()=>api.post(`${base}/documents`,{...d,source_url:d.source_url||null,as_of:`${d.as_of}T00:00:00+07:00`,effective_from:`${d.effective_from}T00:00:00+07:00`,effective_to:d.effective_to?`${d.effective_to}T00:00:00+07:00`:null}),'Đã gửi tài liệu nháp. Tài liệu cần được duyệt.');}}/>}
    {selected&&<Details title={detail.data?.title||'Đọc tài liệu'} onClose={()=>setSelected(null)} actions={detail.data&&canReview&&<>
      {detail.data.status==='Draft'&&<button className="btn btn--primary" onClick={()=>actions.confirm('Duyệt tài liệu này?','AI có thể trích dẫn tài liệu khi còn hiệu lực. Kiểm tra nội dung và nguồn trước khi duyệt.',()=>api.post(`${base}/documents/${selected}/approve`))}>Duyệt</button>}
      {detail.data.status!=='Retired'&&<button className="btn" onClick={()=>actions.confirm('Gỡ tài liệu khỏi kho?','AI sẽ ngừng sử dụng tài liệu này.',()=>api.post(`${base}/documents/${selected}/retire`))}>Gỡ tài liệu</button>}</>}>
      <ResourceView {...detail} hasData={Boolean(detail.data)}>{detail.data&&<div className="module-detail"><dl className="result-kv"><div><dt>Nguồn</dt><dd><SafeLink href={detail.data.source_url}>{detail.data.source_name}</SafeLink></dd></div><div><dt>Ngày số liệu</dt><dd>{fmtDay(detail.data.as_of)}</dd></div><div><dt>Hiệu lực</dt><dd>{fmtDate(detail.data.effective_from)} → {fmtDate(detail.data.effective_to)}</dd></div><div><dt>Phiên bản / trạng thái</dt><dd>{detail.data.version} · {states.find(([s])=>s===detail.data?.status)?.[1]||detail.data.status}</dd></div></dl><article className="module-prose">{detail.data.text||'Chưa có nội dung.'}</article></div>}</ResourceView>
    </Details>}
  </>;
}
