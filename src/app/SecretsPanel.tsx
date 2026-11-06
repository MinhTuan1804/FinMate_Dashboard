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
const SOURCE:Record<Item['source'],[string,string]>={db:['Đã lưu trong hệ thống','good'],env:['Đang dùng biến môi trường','warn'],none:['Chưa cấu hình','']};
const GROUPS:{owner:Owner;title:string;hint:string;master:string}[]=[
  {owner:'ai',title:'Dịch vụ AI và OCR',hint:'Gemini, OpenRouter và Google Cloud Vision: dịch vụ AI và OCR dùng.',master:'AI Service'},
  {owner:'backend',title:'Backend',hint:'Brevo (email OTP), Google OAuth (đăng nhập Google) và Firebase (thông báo đẩy).',master:'backend'},
];
const masked=(item:Item)=>item.multiline?'••••••••':item.last4?`•••• •••• ${item.last4}`:'—';  // file JSON không có "4 ký tự cuối" nào có nghĩa

export function SecretsPanel(){
  const [status,setStatus]=useState<Status|null>(null),[editing,setEditing]=useState<Item|null>(null),[removing,setRemoving]=useState<Item|null>(null);
  const [value,setValue]=useState(''),[reason,setReason]=useState(''),[results,setResults]=useState<Record<string,TestResult>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  const load=useCallback(async()=>{try{setStatus(await getData<Status>(base));setError('')}catch(e){setError(errorText(e))}},[]);
  useEffect(()=>{queueMicrotask(()=>void load())},[load]);

  const close=()=>{setEditing(null);setValue('');setReason('')};  // key không nằm trong state lâu hơn lúc đang nhập
  const forget=(name:string)=>setResults(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==name)));  // kết quả thử của key cũ không còn đúng với key mới
  async function submit(event:FormEvent){event.preventDefault();if(!editing)return;setBusy(true);try{await api.put(`${base}/${editing.name}`,{value,reason:reason.trim()});forget(editing.name);close();setNotice(`Đã lưu ${editing.title}. Dịch vụ dùng key mới trong khoảng 10-30 giây, không cần khởi động lại.`);await load()}catch(e){setError(errorText(e));setValue('')}finally{setBusy(false)}}
  async function remove(why:string){if(!removing)return;setBusy(true);try{await api.delete(`${base}/${removing.name}`,{params:{reason:why}});forget(removing.name);setRemoving(null);setNotice(`Đã xóa ${removing.title} khỏi hệ thống; dịch vụ quay về biến môi trường (nếu có).`);await load()}catch(e){setError(errorText(e));setRemoving(null)}finally{setBusy(false)}}
  async function test(item:Item){setBusy(true);try{const response=await api.post(`${base}/${item.name}/test`);setResults(current=>({...current,[item.name]:response.data.data as TestResult}))}catch(e){setError(errorText(e))}finally{setBusy(false)}}

  if(!status)return error?<PageError message={error} retry={()=>void load()}/>:<LoadingRows/>;
  return <section>
    <PageError message={error} retry={()=>void load()}/><SuccessNotice message={notice}/>
    <p className="fm-hint">Key được mã hóa trước khi lưu và <strong>không xem lại được</strong>, kể cả với admin: trang chỉ hiện 4 ký tự cuối. Muốn đổi thì nhập key mới; muốn kiểm tra thì bấm Thử kết nối. Mỗi lần đổi được ghi vào nhật ký (không kèm key). Key nội bộ giữa các dịch vụ (JWT, khóa gọi nhau) không nằm ở đây.</p>
    {status.ai_unavailable&&<div className="error-box" role="alert"><span>Không hỏi được AI Service nên chưa hiện key của dịch vụ AI và OCR. Key của backend vẫn quản trị được.</span><button className="btn" onClick={()=>void load()}>Thử lại</button></div>}
    {GROUPS.map(group=>{
      const items=status.items.filter(item=>item.owner===group.owner);
      if(!items.length)return null;
      return <div key={group.owner}>
        <h2 className="fm-group-title">{group.title}</h2><p className="fm-hint">{group.hint}</p>
        {items.some(item=>!item.can_store)&&<div className="error-box" role="alert"><span>Chưa cấu hình khóa mã hóa (<code>SECRETS_MASTER_KEY</code> của {group.master}) nên chưa lưu được key ở nhóm này. Key đặt bằng biến môi trường vẫn đang chạy bình thường.</span></div>}
        <div className="fm-settings-grid">{items.map(item=><div className="fm-card" key={item.name}>
          <div className="fm-toolbar"><h2>{item.title}</h2><span className={`fm-badge ${SOURCE[item.source][1]}`}>{SOURCE[item.source][0]}</span></div>
          <dl className="fm-kv"><dt>Key</dt><dd><code>{masked(item)}</code></dd>{item.updated_at&&<><dt>Đổi lúc</dt><dd>{new Date(item.updated_at).toLocaleString('vi-VN')}</dd></>}</dl>
          {results[item.name]&&(results[item.name].ok?<div className="fm-success">{results[item.name].detail}</div>:<div className="error-box" role="alert"><span>{results[item.name].detail}</span></div>)}
          <div className="fm-actions"><button className="btn btn--primary" disabled={busy||!item.can_store} onClick={()=>setEditing(item)}>{item.source==='db'?'Đổi key':'Đặt key'}</button><button className="btn" disabled={busy||!item.configured} onClick={()=>void test(item)}>Thử kết nối</button>{item.source==='db'&&<button className="btn" disabled={busy} onClick={()=>setRemoving(item)}>Xóa khỏi hệ thống</button>}</div>
        </div>)}</div>
      </div>;
    })}

    {editing&&<DialogOverlay onClose={close} guardChanges busy={busy}><form className="fm-modal fm-modal--compact" role="dialog" aria-modal="true" aria-label={`Đặt ${editing.title}`} onSubmit={submit}>
      <div className="fm-modal-head"><h2>{editing.title}</h2></div>
      <div className="fm-form"><PageError message={error}/><label>{editing.multiline?'Nội dung JSON mới':'Key mới'}{editing.multiline
        ?<textarea rows={8} autoComplete="off" spellCheck={false} required value={value} onChange={e=>setValue(e.target.value)} autoFocus placeholder="Dán nguyên file service account của Firebase"/>
        :<input type="password" autoComplete="off" spellCheck={false} required value={value} onChange={e=>setValue(e.target.value)} autoFocus/>}</label>
        <small>Dán key lấy từ nhà cung cấp. Sau khi lưu bạn sẽ không xem lại được nó.</small>
        <label>Lý do<textarea rows={3} required minLength={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: đổi key quý 4"/></label></div>
      <div className="fm-modal-foot"><button type="button" className="btn" onClick={close} disabled={busy} data-dialog-close>Hủy</button><button className="btn btn--primary" disabled={busy||!value.trim()||reason.trim().length<3}>{busy?'Đang lưu...':'Lưu key'}</button></div></form></DialogOverlay>}
    {removing&&<ConfirmReasonDialog error={error} title={`Xóa ${removing.title}`} description="Key bị xóa khỏi hệ thống. Dịch vụ dùng key ở biến môi trường nếu có, không thì tính năng dùng key này bị tắt hoặc chạy chế độ dự phòng." onCancel={()=>setRemoving(null)} onConfirm={remove} busy={busy}/>}
  </section>;
}
