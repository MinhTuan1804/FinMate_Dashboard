import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const controls='button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]';
/** Shared lifecycle for drawers and confirmations, including stacked dialogs. */
export function DialogOverlay({children,onClose,guardChanges=false,busy=false,dirty:explicitDirty}:{children:ReactNode;onClose:()=>void;guardChanges?:boolean;busy?:boolean;dirty?:boolean}){
  const root=useRef<HTMLDivElement>(null),initial=useRef('');
  const [discard,setDiscard]=useState(false);
  const snapshot=()=>JSON.stringify(Array.from(root.current?.querySelectorAll('input,select,textarea')||[]).map(control=>{const field=control as HTMLInputElement;return field.type==='checkbox'?field.checked:field.value}));
  const latestDirty=useRef(explicitDirty);useEffect(()=>{latestDirty.current=explicitDirty},[explicitDirty]);
  const dirty=()=>latestDirty.current??(guardChanges&&snapshot()!==initial.current);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    initial.current=snapshot();
    const focus=root.current?.querySelector<HTMLElement>('[autofocus]')||root.current?.querySelector<HTMLElement>(controls);
    focus?.focus();
    const unload=(event:BeforeUnloadEvent)=>{if(dirty()){event.preventDefault();event.returnValue=''}};
    window.addEventListener('beforeunload',unload);
    return()=>{window.removeEventListener('beforeunload',unload);if(previous?.isConnected)previous.focus()};
  // Snapshot is deliberately captured once per opening, not after user edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  function close(){if(busy)return;if(dirty())setDiscard(true);else onClose()}
  return createPortal(<div ref={root} className="fm-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)close()}} onClickCapture={event=>{if((event.target as HTMLElement).closest('[data-dialog-close]')){event.preventDefault();event.stopPropagation();close()}}} onKeyDown={event=>{
    const overlays=document.querySelectorAll('.fm-overlay');if(overlays[overlays.length-1]!==root.current)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(discard)setDiscard(false);else close()}
    if(event.key==='Tab'){const scope=discard?root.current?.querySelector('.discard-dialog'):root.current;const list=Array.from(scope?.querySelectorAll<HTMLElement>(controls)||[]).filter(element=>element.getClientRects().length>0);const first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
  }}>{children}{discard&&<div className="discard-overlay"><div className="discard-dialog" role="alertdialog" aria-modal="true" aria-label="Bỏ thay đổi chưa lưu"><h2>Bỏ thay đổi chưa lưu?</h2><p>Nội dung bạn vừa nhập sẽ mất khi đóng màn hình này.</p><div className="fm-actions"><button className="btn btn--primary" autoFocus onClick={()=>setDiscard(false)}>Tiếp tục chỉnh sửa</button><button className="btn" onClick={onClose}>Bỏ thay đổi</button></div></div></div>}</div>,document.body);
}
