import { isAdminRole } from '../../shared/permissions';
import { useActions, useModuleTab } from './useModuleActions';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorText, getData, type Envelope, type OpsMe } from '../../shared/api';
import { fmtDate } from '../../shared/format';
import { PageError, PageHeader, SuccessNotice } from '../Shared';
import { JsonDiff } from '../ui/JsonReview';
import { ResourceView } from '../ui/ResourceView';
import { useResource } from '../ui/useResource';
import { useUnsavedChanges } from '../ui/useUnsavedChanges';
import { ModuleTabs, Refresh, ResourceTable } from './ModuleParts';

type Section={title:string;body:string};
type Draft={isDraft:boolean;updatedAt:string|null;termsSections:Section[];privacySections:Section[]};
type Version={version:number|null;status:string;updatedAt:string;publishedAt:string|null};
const tabs:[string,string][]=[['edit','Soạn thảo'],['preview','Xem trước'],['diff','So sánh'],['history','Lịch sử']];
export function LegalPage({me}:{me:OpsMe}) {
  const tab=useModuleTab(tabs),resource=useResource<Draft>('/ops/legal/draft'),history=useResource<Version[]>('/ops/legal/versions',{},tab==='history');
  const [editor,setEditor]=useState<Draft|null>(null),[base,setBase]=useState<Draft|null>(null),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
  const action=useActions(['/ops/legal','/legal']);
  useEffect(()=>{if(resource.data&&!editor)queueMicrotask(()=>{setEditor(resource.data!);setBase(resource.data!);});},[resource.data,editor]);
  const dirty=Boolean(editor&&base&&JSON.stringify(editor)!==JSON.stringify(base));
  const navigationDialog=useUnsavedChanges(dirty,saving);
  async function loadLatest(){const current=await getData<Draft>('/ops/legal/draft');setBase(current);setEditor(current);setError('');setConflict(false);}
  async function save(event:FormEvent){event.preventDefault();if(!editor)return;setSaving(true);setError('');setNotice('');try{const response=await api.put<Envelope<Draft>>('/ops/legal/draft',{termsSections:editor.termsSections,privacySections:editor.privacySections,baseUpdatedAt:editor.updatedAt});setEditor(response.data.data);setBase(response.data.data);setConflict(false);setNotice('Đã lưu nháp. Nội dung chưa được xuất bản.');await action.refresh();}catch(e){setError(errorText(e));setConflict((e as {response?:{status:number}}).response?.status===409);}finally{setSaving(false);}}
  function change(kind:'termsSections'|'privacySections',rows:Section[]){setEditor(current=>current&&({...current,[kind]:rows}));}
  return <>{navigationDialog}<PageHeader title="Điều khoản & quyền riêng tư" description="Soạn nháp, xem trước và so sánh. Xuất bản tạo phiên bản mới và yêu cầu người dùng đồng ý lại."/>
    <ModuleTabs tabs={tabs}/>{action.feedback}<SuccessNotice message={notice}/><PageError message={error}/>{conflict&&<div className="fm-card"><p>Bản nháp trên máy chủ đã thay đổi. Nội dung bạn đang nhập được giữ lại để đối chiếu.</p><button className="btn" onClick={()=>action.confirm('Tải bản nháp mới nhất?','Nội dung chưa lưu trên màn hình này sẽ bị thay thế.',loadLatest)}>Tải bản mới nhất</button></div>}
    {tab==='history'?<div className="fm-card"><Refresh onClick={history.reload} busy={history.refreshing} updatedAt={history.updatedAt}/><ResourceTable resource={{...history,rows:history.data||[]}} columns={[{key:'version',label:'Phiên bản'},{key:'status',label:'Trạng thái'},{key:'updatedAt',label:'Cập nhật'},{key:'publishedAt',label:'Xuất bản'}]}/></div>:
      <ResourceView {...resource} hasData={Boolean(editor)}>{editor&&<>
        <div className="fm-card fm-sticky-bar fm-toolbar"><span>{editor.isDraft?`Bản nháp · ${fmtDate(editor.updatedAt)}`:'Đang xem nội dung hiện hành'}{dirty?' · Có thay đổi chưa lưu':''}</span><span className="fm-actions"><button className="btn" disabled={saving} onClick={()=>action.confirm('Tải lại bản nháp?','Thay đổi chưa lưu sẽ bị thay thế bằng nội dung trên máy chủ.',loadLatest)}>Tải lại</button>{isAdminRole(me.role)&&<button className="btn" disabled={dirty||!editor.isDraft||saving} onClick={()=>action.confirm('Xuất bản điều khoản và chính sách?','Mọi người dùng sẽ phải đồng ý lại. Thao tác tạo phiên bản pháp lý mới. Hãy kiểm tra cả hai tài liệu trước khi xuất bản.',async()=>{await api.post('/admin/legal/draft/publish');await loadLatest();})}>Xuất bản</button>}</span></div>
        {tab==='edit'?<form onSubmit={save}>
          {(['termsSections','privacySections'] as const).map(kind=><fieldset className="fm-card legal-sections" key={kind} disabled={saving}><legend>{kind==='termsSections'?'Điều khoản sử dụng':'Chính sách quyền riêng tư'}</legend>{editor[kind].map((section,index)=><section className="legal-section" key={index}><div className="fm-toolbar"><h3>Mục {index+1}</h3><span className="fm-actions"><button type="button" className="btn btn--small" disabled={index===0} onClick={()=>{const next=[...editor[kind]];[next[index-1],next[index]]=[next[index],next[index-1]];change(kind,next);}}>Lên</button><button type="button" className="btn btn--small" disabled={index===editor[kind].length-1} onClick={()=>{const next=[...editor[kind]];[next[index+1],next[index]]=[next[index],next[index+1]];change(kind,next);}}>Xuống</button><button type="button" className="btn btn--small" disabled={editor[kind].length<=1} onClick={()=>change(kind,editor[kind].filter((_,i)=>i!==index))}>Bỏ mục</button></span></div><label>Tiêu đề mục {index+1}<input required maxLength={200} value={section.title} onChange={e=>change(kind,editor[kind].map((s,i)=>i===index?{...s,title:e.target.value}:s))}/></label><label>Nội dung mục {index+1}<textarea required maxLength={20000} rows={7} value={section.body} onChange={e=>change(kind,editor[kind].map((s,i)=>i===index?{...s,body:e.target.value}:s))}/></label></section>)}<button type="button" className="btn" disabled={editor[kind].length>=50} onClick={()=>change(kind,[...editor[kind],{title:'',body:''}])}>Thêm mục</button></fieldset>)}
          <div className="fm-card fm-toolbar"><span>Lưu nháp chưa yêu cầu khách đồng ý lại.</span><button className="btn btn--primary" disabled={!dirty||saving}>{saving?'Đang lưu…':'Lưu nháp'}</button></div>
        </form>:tab==='diff'?<div className="fm-card"><JsonDiff before={base} after={editor}/></div>:<div className="fm-grid">{(['termsSections','privacySections'] as const).map(kind=><article className="fm-card" key={kind}><h2>{kind==='termsSections'?'Điều khoản sử dụng':'Quyền riêng tư'}</h2>{editor[kind].map((s,i)=><section key={i}><h3>{s.title}</h3><p className="module-prose">{s.body}</p></section>)}</article>)}</div>}
      </>}</ResourceView>}
  </>;
}
