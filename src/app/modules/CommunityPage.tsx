import { useActions, useModuleTab } from './useModuleActions';
import { useEffect, useState } from 'react';
import { api, errorText, type OpsMe } from '../../shared/api';
import { fmtDate } from '../../shared/format';
import { PageError, PageHeader } from '../Shared';
import { useServerList } from '../ui/useServerList';
import { Details, EditDialog, Facts, ModuleTabs, Refresh, ResourceTable } from './ModuleParts';

type Report={id:string;targetType:string;targetId:string;reason:string;priority:string;title:string|null;body:string;publicAuthorName:string|null;targetStatus:string;createdAt:string;handled?:boolean};
type Image={id:string;postId:string;width:number;height:number;title:string|null;body:string;createdOn:string};
const contentLabels:Record<string,string>={post:'Bài viết',comment:'Bình luận',place:'Địa điểm',visible:'Đang hiển thị',removed:'Đã gỡ',auto_hidden:'Tự động ẩn',normal:'Thông thường',urgent:'Khẩn',spam:'Spam',scam:'Lừa đảo',personal_info:'Lộ thông tin cá nhân',harassment:'Quấy rối',sexual:'Nội dung tình dục',self_harm:'Nội dung tự hại',other:'Khác'};
const tabs:[string,string][]=[['reports','Báo cáo nội dung'],['images','Ảnh chờ duyệt']];
export function CommunityPage({me}:{me:OpsMe}){
  const tab=useModuleTab(tabs),reports=useServerList<Report>('/ops/community/reports',{enabled:tab==='reports'}),images=useServerList<Image>('/ops/community/images',{enabled:tab==='images'});
  const [selected,setSelected]=useState<Report|Image|null>(null),[muting,setMuting]=useState<Report|null>(null),[recent,setRecent]=useState<Report[]>([]);
  const action=useActions('/ops/community'),active=tab==='reports'?reports:images;
  const targetPath=(r:Report)=>`/ops/community/${r.targetType.toLowerCase()}s/${r.targetId}`;
  function remember(r:Report,status:string){const next={...r,targetStatus:status,handled:true};setRecent(rows=>[next,...rows.filter(row=>row.id!==r.id)].slice(0,20));setSelected(next);}
  function moderation(r:Report){const isPlace=r.targetType.toLowerCase()==='place';return <>
    <button className="btn btn--small" onClick={()=>action.confirm('Ẩn nội dung cộng đồng?','Nội dung sẽ bị ẩn và các báo cáo còn mở được đóng. '+(r.title||r.body.slice(0,180)),async()=>{await api.post(`${targetPath(r)}/hide`);remember(r,'removed');})}>Ẩn nội dung</button>
    {!isPlace&&<button className="btn btn--small" onClick={()=>action.confirm('Khôi phục nội dung?','Nội dung sẽ hiển thị trở lại; báo cáo cũ không mở lại. '+(r.title||r.body.slice(0,180)),async()=>{await api.post(`${targetPath(r)}/restore`);remember(r,'visible');})}>Khôi phục</button>}
    {me.capabilities.includes('MuteCommunityAuthors')&&!isPlace&&<button className="btn btn--small" onClick={()=>setMuting(r)}>Tạm cấm tác giả</button>}
    <button disabled={r.handled} className="btn btn--small" onClick={()=>action.confirm('Xác nhận báo cáo có cơ sở?','Nội dung sẽ bị gỡ và tất cả báo cáo còn mở của nội dung đó được đóng.',async()=>{await api.post(`/ops/community/reports/${r.id}/resolve`,{decision:'upheld'});remember(r,'removed');})}>Báo cáo có cơ sở</button>
    <button disabled={r.handled} className="btn btn--small" onClick={()=>action.confirm('Bỏ qua báo cáo?','Nội dung được khôi phục hiển thị và tất cả báo cáo còn mở của nội dung đó được đóng.',async()=>{await api.post(`/ops/community/reports/${r.id}/resolve`,{decision:'dismissed'});remember(r,'visible');})}>Bỏ qua báo cáo</button>
  </>;}
  return <><PageHeader title="Kiểm duyệt cộng đồng" description="Xử lý nội dung và ảnh theo báo cáo. Chỉ hiện tên tác giả khi họ đã chọn công khai."/><ModuleTabs tabs={tabs}/>{action.feedback}<div className="fm-card"><div className="fm-toolbar"><span>{tab==='reports'?'Báo cáo khẩn trước, cũ trước':'Ảnh chờ duyệt, cũ trước'}</span><Refresh onClick={active.reload} busy={active.refreshing} updatedAt={active.updatedAt}/></div>
    {tab==='reports'?<ResourceTable resource={reports} columns={[{key:'priority',label:'Ưu tiên',render:r=>contentLabels[r.priority]||r.priority},{key:'targetType',label:'Loại',render:r=>contentLabels[r.targetType]||r.targetType},{key:'title',label:'Tiêu đề'},{key:'reason',label:'Lý do báo cáo',render:r=>contentLabels[r.reason]||r.reason},{key:'targetStatus',label:'Trạng thái nội dung',render:r=>contentLabels[r.targetStatus]||r.targetStatus},{key:'createdAt',label:'Thời điểm'}]} onOpen={setSelected} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r)}>Xem & xử lý</button>}/>:
      <ResourceTable resource={images} columns={[{key:'title',label:'Bài viết'},{key:'width',label:'Rộng (px)'},{key:'height',label:'Cao (px)'},{key:'createdOn',label:'Ngày gửi'}]} onOpen={setSelected} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r)}>Duyệt ảnh</button>}/>}
    </div>{recent.length>0&&<section className="fm-card"><h2>Nội dung vừa xử lý</h2><p className="fm-hint">Tối đa 20 nội dung trong lần mở trang này để đối chiếu và khôi phục ngay. Lịch sử đầy đủ nằm ở nhật ký vận hành.</p><ResourceTable resource={{loading:false,error:'',reload:active.reload,rows:recent}} columns={[{key:'title',label:'Nội dung'},{key:'targetStatus',label:'Trạng thái',render:r=>contentLabels[r.targetStatus]||r.targetStatus}]} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r)}>Xem lại & khôi phục</button>}/></section>}{selected&&<Details title={'reason' in selected?'Xử lý báo cáo':'Duyệt ảnh cộng đồng'} onClose={()=>setSelected(null)} actions={'reason' in selected?moderation(selected):<><button className="btn btn--primary" onClick={()=>action.confirm('Duyệt ảnh này?','Ảnh được phép xuất hiện trên cộng đồng.',async()=>{await api.post(`/ops/community/images/${selected.id}/approve`);setSelected(null);})}>Duyệt ảnh</button><button className="btn" onClick={()=>action.confirm('Từ chối ảnh này?','Dữ liệu ảnh sẽ bị xóa ngay và không khôi phục được từ dashboard. Ảnh không được xuất hiện trong bài viết.',async()=>{await api.post(`/ops/community/images/${selected.id}/reject`);setSelected(null);})}>Từ chối</button></>}>
      <h3>{selected.title||'Không có tiêu đề'}</h3><p className="module-prose">{selected.body}</p>{'reason' in selected?<Facts items={[["Loại nội dung",contentLabels[selected.targetType]||selected.targetType],["Lý do báo cáo",contentLabels[selected.reason]||selected.reason],["Trạng thái",contentLabels[selected.targetStatus]||selected.targetStatus],["Tác giả công khai",selected.publicAuthorName||'Không công khai'],["Thời điểm",fmtDate(selected.createdAt)]]}/>:<AuthenticatedImage id={selected.id}/>}
    </Details>}
    {muting&&<EditDialog title="Tạm cấm tác giả theo nội dung" fields={[{key:'days',label:'Số ngày tạm cấm',type:'number',min:1,max:365,required:true,hint:'Thao tác theo nội dung; danh tính tác giả không được cung cấp cho người kiểm duyệt.'}]} initial={{days:7}} onClose={()=>setMuting(null)} onSave={async body=>{await action.execute(()=>api.post(`${targetPath(muting)}/mute-author`,body));}}/>}
  </>;
}
function AuthenticatedImage({id}:{id:string}){
  const [url,setUrl]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();let objectUrl='';queueMicrotask(()=>{setUrl('');setError('');});api.get<Blob>(`/ops/community/images/${id}`,{responseType:'blob',signal:controller.signal}).then(r=>{if(!controller.signal.aborted){objectUrl=URL.createObjectURL(r.data);setUrl(objectUrl);}}).catch(e=>{if(!controller.signal.aborted)setError(errorText(e));});return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};},[id,attempt]);
  return <><PageError message={error} retry={()=>setAttempt(a=>a+1)}/>{url?<img className="community-preview" src={url} alt="Ảnh cộng đồng cần kiểm duyệt"/>:!error&&<p>Đang tải ảnh…</p>}</>;
}
