import { SuccessNotice } from './Shared';
import { DialogOverlay } from './ui/DialogOverlay';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmReasonDialog, LoadingRows, PageError } from './Shared';

type Owner='ai'|'backend';
type Item={name:string;title:string;source:'db'|'env'|'none';configured:boolean;last4:string|null;updated_at:string|null;owner:Owner;can_store:boolean;multiline?:boolean};
type Status={available:boolean;ai_unavailable?:boolean;items:Item[]};
type TestResult={ok:boolean;detail:string};

const base='/admin/secrets';
const SOURCE:Record<Item['source'],[string,string]>={db:['Đã lưu trong hệ thống','good'],env:['Cấu hình tại dịch vụ','warn'],none:['Chưa cấu hình','']};
const GROUPS:{owner:Owner;title:string;hint:string;master:string}[]=[
  {owner:'ai',title:'Phân tích AI và đọc hóa đơn',hint:'Gemini, OpenRouter và Google Cloud Vision: dịch vụ AI và OCR dùng.',master:'AI Service'},
  {owner:'backend',title:'Dịch vụ ứng dụng',hint:'Brevo (email OTP), Google OAuth (đăng nhập Google) và Firebase (thông báo đẩy).',master:'backend'},
];
const connectionTitle=(title:string)=>title.replace('Firebase service account JSON (thông báo đẩy FCM)','Thông báo đẩy Firebase');
const masked=(item:Item)=>item.multiline?'••••••••':item.last4?`•••• •••• ${item.last4}`:'—';  // file JSON không có "4 ký tự cuối" nào có nghĩa

export function SecretsPanel(){
  const [status,setStatus]=useState<Status|null>(null),[editing,setEditing]=useState<Item|null>(null),[removing,setRemoving]=useState<Item|null>(null);
  const [value,setValue]=useState(''),[reason,setReason]=useState(''),[results,setResults]=useState<Record<string,TestResult>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  const load=useCallback(async()=>{try{setStatus(await getData<Status>(base));setError('')}catch(e){setError(errorText(e))}},[]);
  useEffect(()=>{queueMicrotask(()=>void load())},[load]);

  const close=()=>{setEditing(null);setValue('');setReason('')};  // key không nằm trong state lâu hơn lúc đang nhập
  const forget=(name:string)=>setResults(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==name)));  // kết quả thử của key cũ không còn đúng với key mới
  async function submit(event:FormEvent){event.preventDefault();if(!editing)return;setBusy(true);try{await api.put(`${base}/${editing.name}`,{value,reason:reason.trim()});forget(editing.name);close();setNotice(`Đã lưu ${connectionTitle(editing.title)}. Dịch vụ dùng thông tin mới trong khoảng 10-30 giây, không cần khởi động lại.`);await load()}catch(e){setError(errorText(e));setValue('')}finally{setBusy(false)}}
  async function remove(why:string){if(!removing)return;setBusy(true);try{await api.delete(`${base}/${removing.name}`,{params:{reason:why}});forget(removing.name);setRemoving(null);setNotice(`Đã xóa ${removing.title} khỏi hệ thống; dịch vụ dùng lại cấu hình ban đầu (nếu có).`);await load()}catch(e){setError(errorText(e));setRemoving(null)}finally{setBusy(false)}}
  async function test(item:Item){setBusy(true);try{const response=await api.post(`${base}/${item.name}/test`);setResults(current=>({...current,[item.name]:response.data.data as TestResult}))}catch(e){setError(errorText(e))}finally{setBusy(false)}}

  if(!status)return error?<PageError message={error} retry={()=>void load()}/>:<LoadingRows/>;
  return <section>
    <PageError message={error} retry={()=>void load()}/><SuccessNotice message={notice}/>
    <p className="fm-hint">Thông tin kết nối được mã hóa trước khi lưu và <strong>không xem lại được</strong>, kể cả với quản trị viên. Trang chỉ hiện 4 ký tự cuối. Nhập thông tin mới để thay đổi, hoặc chọn Thử kết nối để kiểm tra. Lịch sử thay đổi không lưu nội dung bí mật.</p>
    {status.ai_unavailable&&<div className="error-box" role="alert"><span>Chưa kết nối được dịch vụ AI để tải thông tin. Bạn vẫn có thể quản lý các kết nối của dịch vụ ứng dụng.</span><button className="btn" onClick={()=>void load()}>Thử lại</button></div>}
    {GROUPS.map(group=>{
      const items=status.items.filter(item=>item.owner===group.owner);
      if(!items.length)return null;
      return <div key={group.owner}>
        <h2 className="fm-group-title">{group.title}</h2><p className="fm-hint">{group.hint}</p>
        {items.some(item=>!item.can_store)&&<div className="error-box" role="alert"><span>Nhóm này chưa được thiết lập bảo vệ thông tin kết nối nên chưa thể lưu thay đổi. Các kết nối đã cấu hình tại dịch vụ vẫn hoạt động.<details className="technical-details"><summary>Thông tin dành cho kỹ thuật</summary>Thiết lập <code>SECRETS_MASTER_KEY</code> tại {group.master}.</details></span></div>}
        <div className="fm-settings-grid">{items.map(item=><div className="fm-card" key={item.name}>
          <div className="fm-toolbar"><h2>{connectionTitle(item.title)}</h2><span className={`fm-badge ${SOURCE[item.source][1]}`}>{SOURCE[item.source][0]}</span></div>
          <dl className="fm-kv"><dt>Thông tin kết nối</dt><dd><code>{masked(item)}</code></dd>{item.updated_at&&<><dt>Đổi lúc</dt><dd>{new Date(item.updated_at).toLocaleString('vi-VN')}</dd></>}</dl>
          {results[item.name]&&(results[item.name].ok?<div className="fm-success">{results[item.name].detail}</div>:<div className="error-box" role="alert"><span>{results[item.name].detail}</span></div>)}
          <div className="fm-actions"><button className="btn btn--primary" disabled={busy||!item.can_store} onClick={()=>setEditing(item)}>{item.source==='db'?'Thay thông tin':'Thiết lập'}</button><button className="btn" disabled={busy||!item.configured} onClick={()=>void test(item)}>Thử kết nối</button>{item.source==='db'&&<button className="btn" disabled={busy} onClick={()=>setRemoving(item)}>Xóa khỏi hệ thống</button>}</div>
        </div>)}</div>
      </div>;
    })}

    {editing&&<DialogOverlay onClose={close} guardChanges busy={busy}><form className="fm-modal fm-modal--compact" role="dialog" aria-modal="true" aria-label={`Đặt ${connectionTitle(editing.title)}`} onSubmit={submit}>
      <div className="fm-modal-head"><h2>{connectionTitle(editing.title)}</h2></div>
      <div className="fm-form"><PageError message={error}/><label>{editing.multiline?'Tệp cấu hình mới':'Thông tin kết nối mới'}{editing.multiline
        ?<textarea rows={8} autoComplete="off" spellCheck={false} required value={value} onChange={e=>setValue(e.target.value)} autoFocus placeholder="Dán nguyên file service account của Firebase"/>
        :<input type="password" autoComplete="off" spellCheck={false} required value={value} onChange={e=>setValue(e.target.value)} autoFocus/>}</label>
        <small>Dán thông tin kết nối do nhà cung cấp cấp. Sau khi lưu bạn sẽ không xem lại được nó.</small>
        <label>Lý do<textarea rows={3} required minLength={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: thay thông tin kết nối quý 4"/></label></div>
      <div className="fm-modal-foot"><button type="button" className="btn" onClick={close} disabled={busy} data-dialog-close>Hủy</button><button className="btn btn--primary" disabled={busy||!value.trim()||reason.trim().length<3}>{busy?'Đang lưu...':'Lưu thông tin'}</button></div></form></DialogOverlay>}
    {removing&&<ConfirmReasonDialog error={error} title={`Xóa ${removing.title}`} description="Key bị xóa khỏi hệ thống. Dịch vụ dùng key ở biến môi trường nếu có, không thì tính năng dùng key này bị tắt hoặc chạy chế độ dự phòng." onCancel={()=>setRemoving(null)} onConfirm={remove} busy={busy}/>}
  </section>;
}
