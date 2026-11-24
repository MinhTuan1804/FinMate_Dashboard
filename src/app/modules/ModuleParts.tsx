import { displayValue } from '../../shared/labels';
import { validateFields } from '../../shared/formValidation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../../shared/api';
import { fmtDate } from '../../shared/format';
import { PageError } from '../Shared';
import { DialogOverlay } from '../ui/DialogOverlay';
import { ResourceView } from '../ui/ResourceView';
import { useUrlState } from '../ui/useUrlState';
import { DataTable } from '../ui/DataTable';
import { OffsetPager } from '../ui/ListControls';

export type Row = Record<string, unknown>;
export type Field = { key: string; label: string; type?: 'text'|'textarea'|'number'|'date'|'datetime-local'|'url'|'select'|'checkbox'; required?: boolean; min?: number; max?: number; step?: number; maxLength?: number; pattern?: string; hint?: string; options?: [string,string][]; nullable?: boolean; disabled?: boolean };
export type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode };
export function ModuleTabs({ tabs }: { tabs: [string,string][] }) {
  const [active, setActive] = useUrlState('tab', tabs[0][0],['offset','cursor','status']);
  return <div className="fm-tabs" aria-label="Các phần">{tabs.map(([key,label]) => <button key={key} className={active===key?'active':''} aria-pressed={active===key} onClick={()=>setActive(key)}>{label}</button>)}</div>;
}
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value:string)=>void; options: [string,string][] }) {
  return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Tất cả</option>{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>;
}
export function Refresh({ onClick, busy=false, updatedAt }: { onClick:()=>void; busy?:boolean; updatedAt?:number }) { return <span className="fm-actions fm-refresh-line">{Boolean(updatedAt)&&<small className="fm-hint">Cập nhật {fmtDate(updatedAt)}</small>}<button className="btn" disabled={busy} onClick={onClick}>{busy?'Đang tải…':'Làm mới'}</button></span>; }
export function SafeLink({ href, children }: { href?:string|null; children:ReactNode }) {
  if(!href || !/^https?:\/\//i.test(href)) return <span>{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
export function Details({ title, onClose, children, actions }: { title:string; onClose:()=>void; children:ReactNode; actions?:ReactNode }) {
  return <DialogOverlay onClose={onClose}><section role="dialog" aria-modal="true" aria-label={title} className="fm-modal fm-modal--wide"><div className="fm-modal-head"><h2>{title}</h2><button className="btn" data-dialog-close onClick={onClose}>Đóng</button></div><div className="module-detail">{children}</div>{actions&&<div className="fm-modal-foot">{actions}</div>}</section></DialogOverlay>;
}
export function Facts({ items }: { items:[string,ReactNode][] }) { return <dl className="module-facts">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{typeof value==='string'?displayValue(value):value??'—'}</dd></div>)}</dl>; }
export function ResourceTable<T extends object>({ resource, columns, actions, onOpen, filtered=false }: {
  resource:{loading:boolean;error:string;reload:()=>void;rows:T[];total?:number;offset?:number;limit?:number;setOffset?:(value:number)=>void}; columns:Column<T>[];actions?:(row:T)=>ReactNode;onOpen?:(row:T)=>void;filtered?:boolean;
}) {
  return <ResourceView {...resource} hasData={resource.rows.length>0} empty={!resource.rows.length} filtered={filtered}>
    <DataTable rows={resource.rows} columns={columns} actions={actions} onOpen={onOpen}/>
    {resource.setOffset&&<OffsetPager offset={resource.offset??0} limit={resource.limit??20} total={resource.total??0} onChange={resource.setOffset}/>}
  </ResourceView>;
}
export function EditDialog({ title, fields, initial, onClose, onSave, validate }: {title:string;fields:Field[];initial:Row;onClose:()=>void;onSave:(draft:Row)=>Promise<void>;validate?:(draft:Row)=>string}) {
  const [draft,setDraft]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const form=useRef<HTMLFormElement>(null);
  const dirty=JSON.stringify(initial)!==JSON.stringify(draft);
  async function submit(event:FormEvent) {
    event.preventDefault(); setError(''); const invalid=validateFields(fields,draft);setFieldErrors(invalid);if(Object.keys(invalid).length){setError('Kiểm tra các trường được đánh dấu bên dưới.');return;} const issue=validate?.(draft); if(issue){setError(issue);return;}
    setBusy(true); try { await onSave(draft); onClose(); } catch(e){setError(errorText(e));} finally {setBusy(false);}
  }
  useEffect(()=>{if(error) form.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();},[error]);
  return <DialogOverlay onClose={onClose} dirty={dirty} guardChanges busy={busy}><form ref={form} className="fm-modal" role="dialog" aria-modal="true" aria-label={title} noValidate onSubmit={submit}>
    <div className="fm-modal-head"><h2>{title}</h2><button type="button" className="btn" data-dialog-close onClick={onClose} disabled={busy}>Đóng</button></div>
    <div className="fm-form">{Object.keys(fieldErrors).length?<div className="error-box" role="alert" tabIndex={-1}><div><strong>Kiểm tra các trường bên dưới</strong><ul>{Object.entries(fieldErrors).map(([key,message])=><li key={key}><a href={`#module-field-${key}`} onClick={event=>{event.preventDefault();document.getElementById(`module-field-${key}`)?.focus();}}>{fields.find(f=>f.key===key)?.label}: {message}</a></li>)}</ul></div></div>:<PageError message={error}/>} {fields.map(field=>{
      const value=draft[field.key], id=`module-field-${field.key}`;
      const update=(next:unknown)=>setDraft(current=>({...current,[field.key]:next}));
      const common={id,disabled:busy||field.disabled,required:field.required,'aria-invalid':Boolean(fieldErrors[field.key]),'aria-describedby':[field.hint?`${id}-hint`:'',fieldErrors[field.key]?`${id}-error`:''].filter(Boolean).join(' ')||undefined};
      return <div key={field.key} className={`module-field ${field.type==='textarea'?'module-field--wide':''}`}><label htmlFor={id}>{field.label}{field.required?' *':''}</label>
        {field.type==='checkbox'?<input {...common} type="checkbox" checked={Boolean(value)} onChange={e=>update(e.target.checked)}/>:
          field.type==='select'?<select {...common} value={String(value??'')} onChange={e=>update(e.target.value)}><option value="">Chọn…</option>{field.options?.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select>:
          field.type==='textarea'?<textarea {...common} rows={7} maxLength={field.maxLength} value={String(value??'')} onChange={e=>update(e.target.value)}/>:
          <input {...common} type={field.type??'text'} min={field.min} max={field.max} step={field.step??1} pattern={field.pattern} maxLength={field.maxLength} value={String(value??'')} onChange={e=>update(field.type==='number'?(e.target.value===''?(field.nullable?null:''):Number(e.target.value)):e.target.value)}/>}
        {field.hint&&<small id={`${id}-hint`}>{field.hint}</small>}{fieldErrors[field.key]&&<small className="fm-error-text" id={`${id}-error`}>{fieldErrors[field.key]}</small>}</div>;
    })}</div><div className="fm-modal-foot"><button type="button" className="btn" data-dialog-close disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn--primary" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button></div>
  </form></DialogOverlay>;
}
export function PermissionHint(){return <p className="fm-hint">Bạn có thể xem nội dung. Thao tác cần quyền bổ sung sẽ do người có quyền thực hiện.</p>;}
export function BackToQueue(){return <Link to="/ops/tickets">Mở hàng đợi hỗ trợ →</Link>;}
