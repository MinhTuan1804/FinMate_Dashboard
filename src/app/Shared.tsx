import { DialogOverlay } from './ui/DialogOverlay';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Inbox, X } from 'lucide-react';

export function PageHeader({title,description,action}:{title:string;description:string;action?:ReactNode}) {
  const location=useLocation();return <div className="fm-page-head"><div><div className="fm-eyebrow">FINMATE / {location.pathname.startsWith('/ops')?'VẬN HÀNH':'QUẢN TRỊ'}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
export function PageError({message,retry}:{message:string;retry?:()=>void}) {
  return message?<div className="error-box" role="alert"><span>{message}</span>{retry&&<button className="btn btn--small" onClick={retry}>Thử lại</button>}</div>:null;
}
export function NotConnected({title,description}:{title:string;description:string}) {
  return <div className="fm-card fm-unavailable"><span className="fm-badge">Chưa kết nối</span><h2>{title}</h2><p>{description}</p></div>;
}
export function LoadingRows(){return <div className="fm-skeleton" aria-label="Đang tải dữ liệu">{[1,2,3,4].map(n=><div key={n}/>)}</div>}
export function EmptyState({message='Chưa có dữ liệu'}:{message?:string}){return <div className="fm-empty"><Inbox size={25} strokeWidth={1.4}/><strong>{message}</strong></div>}
export function CursorPager({back,next,onBack,onNext}:{back:boolean;next:boolean;onBack:()=>void;onNext:()=>void}){return <div className="fm-pagination"><button className="btn btn--small" disabled={!back} onClick={onBack}>Trang trước</button><button className="btn btn--small" disabled={!next} onClick={onNext}>Trang sau</button></div>}
export function ConfirmReasonDialog({title,description,onCancel,onConfirm,busy=false,error=''}:{title:string;description:string;onCancel:()=>void;onConfirm:(reason:string)=>Promise<void>;busy?:boolean;error?:string}) {
  const [reason,setReason]=useState('');
  function submit(event:FormEvent){event.preventDefault();if(reason.trim())void onConfirm(reason.trim())}
  return <DialogOverlay onClose={onCancel} busy={busy}><form className="fm-modal fm-modal--compact" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit}><div className="fm-modal-head"><h2>{title}</h2></div><div className="fm-form"><PageError message={error}/><p>{description}</p><label>Lý do <textarea value={reason} onChange={e=>setReason(e.target.value)} required minLength={3} rows={4} autoFocus/></label></div><div className="fm-modal-foot"><button type="button" className="btn" onClick={onCancel} disabled={busy} data-dialog-close>Hủy</button><button className="btn btn--primary" disabled={busy||reason.trim().length<3}>{busy?'Đang xử lý...':'Xác nhận'}</button></div></form></DialogOverlay>;
}
export function ConfirmDialog({title,description,onCancel,onConfirm,busy=false,error=''}:{title:string;description:string;onCancel:()=>void;onConfirm:()=>Promise<void>;busy?:boolean;error?:string}) {
  return <DialogOverlay onClose={onCancel} busy={busy}><div className="fm-modal fm-modal--compact" role="dialog" aria-modal="true" aria-label={title}><div className="fm-modal-head"><h2>{title}</h2></div><div className="fm-form"><PageError message={error}/><p>{description}</p></div><div className="fm-modal-foot"><button className="btn" onClick={onCancel} disabled={busy} data-dialog-close>Hủy</button><button className="btn btn--primary" onClick={()=>void onConfirm()} disabled={busy}>{busy?'Đang xử lý...':'Xác nhận'}</button></div></div></DialogOverlay>;
}
export function JsonField({label,value,onChange,allowEmpty=false}:{label:string;value:string;onChange:(value:string)=>void;allowEmpty?:boolean}) {
  const id=useId();const [expanded,setExpanded]=useState(false),[copied,setCopied]=useState(false);let error='',formatted='';
  try{if(value.trim())formatted=JSON.stringify(JSON.parse(value),null,2);else if(!allowEmpty)error='Nhập nội dung JSON'}catch{error='JSON không hợp lệ — kiểm tra dấu ngoặc, dấu phẩy và dấu nháy'}
  return <div className="fm-json-field"><div className="json-toolbar"><label htmlFor={id}>{label}</label><div className="json-controls"><button type="button" disabled={Boolean(error)||!formatted} onClick={()=>onChange(formatted)}>Định dạng</button><button type="button" onClick={()=>setExpanded(!expanded)}>{expanded?'Thu gọn':'Mở rộng'}</button><button type="button" disabled={!value} onClick={async()=>{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1500)}}>{copied?'Đã sao chép':'Sao chép'}</button></div></div><textarea id={id} aria-invalid={Boolean(error)} aria-describedby={`${id}-status`} value={value} onChange={e=>{const next=e.target.value;try{if(next.trim())JSON.parse(next);else if(!allowEmpty)throw new Error();e.target.setCustomValidity('')}catch{e.target.setCustomValidity('JSON không hợp lệ')}onChange(next)}} rows={expanded?20:7} spellCheck={false}/><div id={`${id}-status`} className="json-status"><span className={error?'fm-error-text':''}>{error||'✓ JSON hợp lệ'}</span><span>{value.split('\n').length} dòng · {value.length} ký tự</span></div></div>;
}
function Toast({message}:{message:string}){const [visible,setVisible]=useState(true);useEffect(()=>{const timer=setTimeout(()=>setVisible(false),6500);return()=>clearTimeout(timer)},[]);return visible?<div className="fm-toast" role="status"><CheckCircle2 size={18}/><span>{message}</span><button aria-label="Ẩn thông báo" onClick={()=>setVisible(false)}><X size={15}/></button></div>:null}
export function SuccessNotice({message}:{message:string}){return message?<Toast key={message} message={message}/>:null}

