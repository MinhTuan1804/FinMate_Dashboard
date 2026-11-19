import { serviceLabel } from '../../shared/presentation';
import { useState } from 'react';
import { fmtDate } from '../../shared/format';
import { useResource } from '../ui/useResource';
import { useServerList } from '../ui/useServerList';
import { useUrlState } from '../ui/useUrlState';
import { ResourceView } from '../ui/ResourceView';
import { DataTable } from '../ui/DataTable';
import { Details, Facts, Refresh, ResourceTable } from '../modules/ModuleParts';
import { Link } from 'react-router-dom';
import { PageError } from '../Shared';

type Provider={providerKey:string;displayName:string;total24h:number;readableRate24h:number|null;financialShare24h:number|null;total7d:number;readableRate7d:number|null;financialShare7d:number|null};
type ProviderStats={providers:Provider[];uploadGapsByAppVersion:Record<string,number>};
type ErrorEvent={id:string;createdAt:string;service:string;source:string;exceptionType:string|null;sourceContext:string|null;messageTemplate:string|null;requestPath:string|null;traceId:string|null;fingerprint:string};
const percent=(value:number|null)=>value==null?'Chưa có mẫu':`${value.toLocaleString('vi-VN')}%`;
export function ProviderDiagnostics(){const resource=useResource<ProviderStats>('/admin/monitoring/provider-formats');return <div className="fm-card"><Refresh onClick={resource.reload} busy={resource.refreshing} updatedAt={resource.updatedAt}/><ResourceView {...resource} hasData={Boolean(resource.data)}>{resource.data&&<>
  <h2>Chất lượng đọc thông báo</h2><p className="fm-hint">So sánh 24 giờ gần nhất với 7 ngày liền trước đó. Khi chưa có mẫu, tỷ lệ được ghi là “Chưa có mẫu”.</p><DataTable rows={resource.data.providers} columns={[{key:'displayName',label:'Ngân hàng / ví'},{key:'total24h',label:'Mẫu 24h'},{key:'readableRate24h',label:'Đọc được 24h',render:r=>percent(r.readableRate24h)},{key:'financialShare24h',label:'Tài chính 24h',render:r=>percent(r.financialShare24h)},{key:'total7d',label:'Mẫu nền 7 ngày'},{key:'readableRate7d',label:'Đọc được nền',render:r=>percent(r.readableRate7d)},{key:'financialShare7d',label:'Tài chính nền',render:r=>percent(r.financialShare7d)}]}/><p><Link to="/providers?tab=formats">Chỉnh quy tắc đọc thông báo →</Link></p>
  <h2>Gián đoạn đồng bộ theo phiên bản ứng dụng</h2><p className="fm-hint">Tổng số trường hợp thiết bị bị gián đoạn gửi dữ liệu trong 7 ngày gần nhất.</p><DataTable rows={Object.entries(resource.data.uploadGapsByAppVersion).map(([version,count])=>({version,count}))} columns={[{key:'version',label:'Phiên bản ứng dụng'},{key:'count',label:'Số ca'}]}/>
</>}</ResourceView></div>;}
export function ErrorDiagnostics(){
  const [service,setService]=useUrlState('service'),[exceptionType,setExceptionType]=useUrlState('exceptionType'),[from,setFrom]=useUrlState('from'),[to,setTo]=useUrlState('to');
  const invalid=Boolean(from&&to&&from>to);
  const resource=useServerList<ErrorEvent>('/admin/monitoring/error-events',{params:{service:service||undefined,exceptionType:exceptionType||undefined,from:from?`${from}:00+07:00`:undefined,to:to?`${to}:59.999+07:00`:undefined},enabled:!invalid});
  const [selected,setSelected]=useState<ErrorEvent|null>(null);
  return <div className="fm-card"><div className="fm-toolbar fm-filter-bar"><label>Dịch vụ<select value={service} onChange={e=>setService(e.target.value)}><option value="">Tất cả</option><option value="backend">Hệ thống FinMate</option><option value="ai-service">Phân tích AI</option>{service&&!['backend','ai-service'].includes(service)&&<option value={service}>{serviceLabel(service)}</option>}</select></label><label>Loại lỗi<input value={exceptionType} onChange={e=>setExceptionType(e.target.value)}/></label><label>Từ (giờ VN)<input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Đến (giờ VN)<input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)}/></label><Refresh onClick={resource.reload} busy={resource.refreshing} updatedAt={resource.updatedAt}/></div><PageError message={invalid?'Thời điểm bắt đầu phải trước thời điểm kết thúc.':''}/><p className="fm-hint">Tra cứu lỗi theo dịch vụ và thời điểm. Thông tin đối chiếu không bao gồm nội dung thông báo của người dùng.</p>{!invalid&&<ResourceTable resource={resource} filtered={Boolean(service||exceptionType||from||to)} columns={[{key:'createdAt',label:'Thời điểm'},{key:'service',label:'Dịch vụ'},{key:'exceptionType',label:'Loại lỗi'},{key:'source',label:'Nguồn ghi nhận'}]} onOpen={setSelected} actions={r=><button className="btn btn--small" onClick={()=>setSelected(r)}>Chi tiết</button>}/>}
    {selected&&<Details title="Sự kiện lỗi" onClose={()=>setSelected(null)}><Facts items={[["Thời điểm",fmtDate(selected.createdAt)],["Dịch vụ",serviceLabel(selected.service)],["Nguồn",selected.source]]}/><details className="technical-details"><summary>Thông tin dành cho kỹ thuật</summary><Facts items={[["Loại lỗi",selected.exceptionType],["Ngữ cảnh",selected.sourceContext],["Mẫu thông báo",selected.messageTemplate],["Đường dẫn",selected.requestPath],["Mã đối chiếu",selected.traceId],["Mã nhóm lỗi",selected.fingerprint]]}/>{selected.traceId&&<button className="btn" onClick={()=>void navigator.clipboard.writeText(selected.traceId!)}>Sao chép mã đối chiếu</button>}</details></Details>}
  </div>;
}
