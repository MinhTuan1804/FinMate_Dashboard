import { Navigate, NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { AiConfigPage, AiRulesPage, AiTryPanel } from './AiPages';
import { NotConnected, PageHeader } from './Shared';
import { SecretsPanel } from './SecretsPanel';
import { SystemConfigPanel } from './SystemConfigPanel';

/** Đường dẫn cũ `/settings?tab=ai` vẫn dùng được. */
export function SettingsRedirect(){const [params]=useSearchParams();const tab=params.get('tab');return <Navigate to={tab==='ai'?'/settings/ai':'/settings/system'} replace/>}

const liveSections:{key:'app'|'limits'|'appearance'|'history';label:string}[]=[
  {key:'app',label:'Ứng dụng'},
  {key:'limits',label:'Ngưỡng & đồng bộ'},
  {key:'appearance',label:'Giao diện app'},
];
const statusSection={key:'status',label:'Trạng thái dịch vụ',title:'Trạng thái dịch vụ',description:'Chờ endpoint backend tổng hợp Backend, AI, OCR, STT và Database.'};

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

const aiTabs:[string,string][]=[['dictionary','Từ điển'],['rules','Luật'],['knowledge','Kiến thức']];

export function AiSettingsLayout(){
  return <><PageHeader title="Cấu hình AI" description="Từ điển, luật và kiến thức mà AI dùng để hiểu câu và phân loại giao dịch."/>
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
