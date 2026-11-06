import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { api, errorText, getData } from '../shared/api';
import { AiConfigPage, AiRulesPage, AiTryPanel } from './AiPages';
import { NotConnected, PageError, PageHeader } from './Shared';
import { SecretsPanel } from './SecretsPanel';
import { SystemConfigPanel } from './SystemConfigPanel';

/** Đường dẫn cũ `/settings?tab=ai|rasa` vẫn dùng được. */
export function SettingsRedirect(){const [params]=useSearchParams();const tab=params.get('tab');return <Navigate to={tab==='ai'?'/settings/ai':tab==='rasa'?'/settings/ai/rasa':'/settings/system'} replace/>}

const liveSections:{key:'app'|'limits'|'appearance'|'history';label:string}[]=[
  {key:'app',label:'Ứng dụng'},
  {key:'limits',label:'Ngưỡng & đồng bộ'},
  {key:'appearance',label:'Giao diện app'},
];
const statusSection={key:'status',label:'Trạng thái dịch vụ',title:'Trạng thái dịch vụ',description:'Chờ endpoint backend tổng hợp Backend, AI, OCR, STT, Rasa và Database.'};

export function SystemSettingsPage(){
  const [params,setParams]=useSearchParams();const key=params.get('section')||liveSections[0].key;
  const live=liveSections.find(item=>item.key===key)||(key==='history'?{key:'history' as const,label:'Lịch sử thay đổi'}:undefined);
  const tabs=[...liveSections,{key:'integrations',label:'Tích hợp bên thứ ba'},statusSection,{key:'history',label:'Lịch sử thay đổi'}];
  return <><PageHeader title="Cấu hình hệ thống" description="Ứng dụng, giao diện, tích hợp bên thứ ba và lịch sử thay đổi."/>
    <div className="fm-tabs">{tabs.map(item=><button key={item.key} className={item.key===key?'active':''} onClick={()=>setParams({section:item.key})}>{item.label}</button>)}</div>
    {live&&<SystemConfigPanel section={live.key}/>}
    {key==='integrations'&&<SecretsPanel/>}
    {key==='status'&&<NotConnected title={statusSection.title} description={statusSection.description}/>}
  </>;
}

const aiTabs:[string,string][]=[['dictionary','Từ điển'],['rules','Luật'],['knowledge','Kiến thức'],['rasa','Rasa']];

export function AiSettingsLayout(){
  return <><PageHeader title="Cấu hình AI" description="Từ điển, luật, kiến thức và Rasa mà AI dùng để hiểu câu và phân loại giao dịch."/>
    <div className="fm-tabs">{aiTabs.map(([to,label])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}>{label}</NavLink>)}</div><Outlet/></>;
}

export function DictionaryPage(){
  return <><p className="fm-hint">Từ vựng tra cứu: từ khóa theo danh mục, tên cửa hàng, thương hiệu và từ vựng đọc thông báo, hóa đơn. Mỗi tài liệu có lịch sử phiên bản để khôi phục.</p>
    <AiConfigPage group="dictionary" title="Từ điển và từ vựng"/>
    <AiRulesPage title="Thương hiệu và từ khóa" keys={['brands','keywords','history']} historyResources="brand,keyword"/>
    <AiTryPanel/></>;
}

export function RulesPage(){
  return <><p className="fm-hint">Quy tắc xử lý: ngưỡng đọc hóa đơn, chữ nhận dạng màn hình app và câu chỉ dẫn gửi cho AI. Định dạng thông báo của từng ngân hàng nằm ở <NavLink to="/providers">Ngân hàng &amp; Ví</NavLink>.</p>
    <AiConfigPage group="rule" title="Ngưỡng và nhận dạng (đọc hóa đơn)"/>
    <AiRulesPage title="Câu chỉ dẫn AI" keys={['ai-instructions']}/>
    <AiTryPanel/></>;
}

export function KnowledgePage(){
  return <><p className="fm-hint">Dữ liệu AI đã học và nhớ. Câu chưa hiểu, mẫu hóa đơn và phản hồi người dùng nằm ở <NavLink to="/ai-learning">Học AI</NavLink>.</p>
    <AiRulesPage title="Bộ nhớ hàng hóa" keys={['item-cache','history']} historyResources="item_cache"/>
    <AiTryPanel/></>;
}

type RasaStatus={configured:boolean;available:boolean;version?:string;model_file?:string;model_id?:string;num_active_training_jobs?:number};
type RasaParse={configured?:boolean;available:boolean;intent?:{name:string;confidence:number};intent_ranking?:{name:string;confidence:number}[];entities?:{entity:string;value:string}[]};

function RasaStatusCard(){
  const [status,setStatus]=useState<RasaStatus|null>(null),[error,setError]=useState('');
  useEffect(()=>{getData<RasaStatus>('/admin/rasa/status').then(setStatus).catch(e=>setError(errorText(e)))},[]);
  return <div className="fm-card"><h2>Thông tin và trạng thái</h2><PageError message={error}/>{!status&&!error&&<p className="fm-hint">Đang hỏi Rasa...</p>}
    {status&&!status.configured&&<p className="fm-hint">Chưa cấu hình Rasa (biến RASA_URL của AI Service). Chat vẫn chạy bằng luật.</p>}
    {status?.configured&&!status.available&&<p className="fm-hint">Rasa không phản hồi. Chat vẫn chạy bằng luật nên người dùng không bị gián đoạn.</p>}
    {status?.available&&<dl className="fm-kv"><dt>Trạng thái</dt><dd><span className="fm-badge good">Đang chạy</span></dd><dt>Phiên bản</dt><dd>{status.version}</dd><dt>Model</dt><dd>{status.model_file||'—'}</dd><dt>Đang huấn luyện</dt><dd>{status.num_active_training_jobs??0} lượt</dd></dl>}</div>;
}

function RasaTryCard(){
  const [text,setText]=useState(''),[result,setResult]=useState<RasaParse|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function run(event:FormEvent){event.preventDefault();setBusy(true);try{setResult((await api.post('/admin/rasa/parse',{text})).data.data as RasaParse);setError('')}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  return <div className="fm-card"><h2>Thử một câu</h2><form className="fm-profile-form" onSubmit={run}><label>Câu người dùng gõ hoặc nói<input value={text} maxLength={500} onChange={e=>setText(e.target.value)} required/></label><button className="btn btn--primary" disabled={busy||!text.trim()}>Thử</button></form><PageError message={error}/>
    {result&&!result.available&&<p className="fm-hint">Rasa chưa sẵn sàng để thử.</p>}
    {result?.available&&<><p>Ý định: <strong>{result.intent?.name}</strong> ({Math.round((result.intent?.confidence??0)*100)}%)</p><table className="fm-table"><thead><tr><th>Ý định xếp đầu</th><th>Độ tin cậy</th></tr></thead><tbody>{result.intent_ranking?.map(r=><tr key={r.name}><td>{r.name}</td><td>{Math.round(r.confidence*100)}%</td></tr>)}</tbody></table>{result.entities?.length?<p>Thực thể: {result.entities.map(e=>`${e.entity}=${e.value}`).join(', ')}</p>:<p className="fm-hint">Không có thực thể.</p>}</>}</div>;
}

export function RasaPage(){
  return <><p className="fm-hint">Rasa hiểu câu người dùng gõ hoặc nói trong chat.</p>
    <RasaStatusCard/><RasaTryCard/>
    <NotConnected title="Ý định, câu mẫu, câu trả lời và huấn luyện" description="Không có API: dữ liệu huấn luyện Rasa được sửa trong repo và huấn luyện bằng scripts/nlu_model.py (train, eval, promote), có bước đo trước khi thay model. Chưa có nút nào làm việc này từ trang quản trị."/></>;
}
