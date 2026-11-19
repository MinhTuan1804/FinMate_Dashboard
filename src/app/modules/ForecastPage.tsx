import { useActions, useModuleTab } from './useModuleActions';
import { useState } from 'react';
import { api, type OpsMe } from '../../shared/api';
import { fmtDate, money } from '../../shared/format';
import { PageHeader } from '../Shared';
import { useResource } from '../ui/useResource';
import { useServerList } from '../ui/useServerList';
import { useUrlState } from '../ui/useUrlState';
import { ResourceView } from '../ui/ResourceView';
import { DataTable } from '../ui/DataTable';
import { Details, EditDialog, Facts, FilterSelect, ModuleTabs, Refresh, ResourceTable } from './ModuleParts';

type AccuracyRow={horizonDays:number;confidence:string;samples:number;maeCents:number;medianAbsErrorCents:number;maeRecurringOnlyCents:number;maeHoldCents:number;coveragePercent:number|null;meanBandWidthCents:number;ratioVsHold:number|null;ratioVsRecurringOnly:number|null};
type Accuracy={windowDays:number;from:string;to:string;method:string;snapshotsFilled:number;snapshotsPending:number;rows:AccuracyRow[];feedbackTotal:number;feedbackNew:number;feedbackByReason:{key:string;count:number}[];feedbackByCause:{key:string;count:number}[]};
type Feedback={id:string;createdAt:string;reason:string;note:string|null;status:string;cause:string|null;snapshot:{originDate:string;horizonDays:number;predictedCents:number;actualCents:number|null;conservativeCents:number;optimisticCents:number;confidence:string;method:string}|null};
const causes:[string,string][]=[['data_missing','Thiếu dữ liệu'],['recurring_misread','Nhận sai khoản định kỳ'],['one_off','Khoản bất thường'],['model_issue','Vấn đề mô hình'],['other','Khác']];
const reasons:Record<string,string>={balance_wrong:'Số dư dự báo sai',missing_bill:'Thiếu hóa đơn',wrong_bill:'Hóa đơn dự báo sai',unusual_spending:'Chi tiêu bất thường',too_high:'Dự báo quá cao',too_low:'Dự báo quá thấp',missing_expense:'Thiếu khoản chi',missing_income:'Thiếu khoản thu',other:'Khác'};
export function ForecastPage({me}:{me:OpsMe}) {
  const tabs:[string,string][]=[...(me.capabilities.includes('ViewMonitoring')?[['accuracy','Độ chính xác'] as [string,string]]:[]),...(me.capabilities.includes('HandleTickets')?[['feedback','Phản hồi dự báo'] as [string,string]]:[])];
  const tab=useModuleTab(tabs),[windowDays,setWindowDays]=useUrlState('windowDays','30'),[status,setStatus]=useUrlState('status');
  const accuracy=useResource<Accuracy>('/ops/forecast/accuracy',{windowDays:Number(windowDays)},tab==='accuracy');
  const feedback=useServerList<Feedback>('/ops/forecast/feedback',{params:{status:status||undefined},enabled:tab==='feedback'});
  const [selected,setSelected]=useState<Feedback|null>(null),[labeling,setLabeling]=useState<Feedback|null>(null);
  const action=useActions('/ops/forecast');
  return <><PageHeader title="Chất lượng dự báo" description="Đối chiếu dự báo với số dư thực tế theo mốc 7, 14 và 30 ngày. Phản hồi không chứa danh tính khách."/><ModuleTabs tabs={tabs}/>{action.feedback}
    {tab==='accuracy'?<div className="fm-card"><div className="fm-toolbar"><label>Khoảng thời gian<select value={windowDays} onChange={e=>setWindowDays(e.target.value)}>{[7,30,60,90,180].map(d=><option key={d} value={d}>{d} ngày</option>)}</select></label><Refresh onClick={accuracy.reload} busy={accuracy.refreshing} updatedAt={accuracy.updatedAt}/></div>
      <ResourceView {...accuracy} hasData={Boolean(accuracy.data)}>{accuracy.data&&<><p className="fm-hint">Từ {fmtDate(accuracy.data.from)} đến {fmtDate(accuracy.data.to)}. Sai số trung bình càng thấp, dự báo càng sát với số dư thực tế.</p>
        <div className="fm-stats">{[['Đã có số thực tế',accuracy.data.snapshotsFilled],['Chờ đến ngày đối chiếu',accuracy.data.snapshotsPending],['Phản hồi mới',accuracy.data.feedbackNew]].map(([label,value])=><div className="fm-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <ResourceTable resource={{loading:false,error:'',reload:accuracy.reload,rows:accuracy.data.rows}} columns={[{key:'horizonDays',label:'Mốc (ngày)'},{key:'confidence',label:'Nhóm dữ liệu',render:r=>r.confidence==='low'?'Ít dữ liệu':r.confidence==='all'?'Tất cả':'Thông thường'},{key:'samples',label:'Số mẫu'},{key:'maeCents',label:'Sai số trung bình',render:r=>money(r.maeCents)},{key:'medianAbsErrorCents',label:'Sai số trung vị',render:r=>money(r.medianAbsErrorCents)},{key:'coveragePercent',label:'Độ phủ dải',render:r=>r.coveragePercent==null?'Chưa đủ dữ liệu':`${r.coveragePercent}%`},{key:'maeRecurringOnlyCents',label:'Sai số khi chỉ tính khoản định kỳ',render:r=>money(r.maeRecurringOnlyCents)},{key:'maeHoldCents',label:'Sai số khi giữ nguyên số dư',render:r=>money(r.maeHoldCents)},{key:'ratioVsHold',label:'So mốc giữ số dư',render:r=>r.ratioVsHold?.toFixed(2)??'—'},{key:'ratioVsRecurringOnly',label:'So mốc định kỳ',render:r=>r.ratioVsRecurringOnly?.toFixed(2)??'—'}]}/>
        <h3>Nguyên nhân đã gán</h3><DataTable rows={accuracy.data.feedbackByCause} columns={[{key:'key',label:'Nguyên nhân',render:r=>causes.find(([key])=>key===r.key)?.[1]||r.key},{key:'count',label:'Số phản hồi'}]}/>
      </>}</ResourceView></div>:<div className="fm-card"><div className="fm-toolbar"><FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={[["new","Mới"],["labeled","Đã gán nguyên nhân"]]}/><Refresh onClick={feedback.reload} busy={feedback.refreshing} updatedAt={feedback.updatedAt}/></div>
      <ResourceTable resource={feedback} filtered={Boolean(status)} columns={[{key:'createdAt',label:'Thời điểm'},{key:'reason',label:'Khách phản hồi',render:r=>reasons[r.reason]||r.reason},{key:'status',label:'Trạng thái'},{key:'cause',label:'Nguyên nhân',render:r=>causes.find(([key])=>key===r.cause)?.[1]||'Chưa gán'}]} onOpen={setSelected} actions={r=><><button className="btn btn--small" onClick={()=>setSelected(r)}>Đối chiếu</button><button className="btn btn--small" onClick={()=>setLabeling(r)}>Gán nguyên nhân</button></>}/>
    </div>}
    {selected&&<Details title="Phản hồi dự báo" onClose={()=>setSelected(null)}><Facts items={[["Thời điểm",fmtDate(selected.createdAt)],["Phản hồi",reasons[selected.reason]||selected.reason],["Ghi chú",selected.note],["Nguyên nhân",causes.find(([k])=>k===selected.cause)?.[1]||'Chưa gán']]}/>{selected.snapshot?<Facts items={[["Ngày gốc",selected.snapshot.originDate],["Mốc dự báo",`${selected.snapshot.horizonDays} ngày`],["Dự báo",money(selected.snapshot.predictedCents)],["Thực tế",selected.snapshot.actualCents==null?'Chưa đến ngày đối chiếu':money(selected.snapshot.actualCents)],["Dải dự báo",`${money(selected.snapshot.conservativeCents)} → ${money(selected.snapshot.optimisticCents)}`],["Độ tin cậy",selected.snapshot.confidence]]}/>:<p>Phản hồi này chưa có dữ liệu dự báo để đối chiếu.</p>}</Details>}
    {labeling&&<EditDialog title="Gán nguyên nhân dự báo" initial={{cause:labeling.cause||''}} fields={[{key:'cause',label:'Nguyên nhân',type:'select',required:true,options:causes}]} onClose={()=>setLabeling(null)} onSave={async body=>{await action.execute(()=>api.patch(`/ops/forecast/feedback/${labeling.id}`,body));}}/>}
  </>;
}
