import { createElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../Shared';
export function useUnsavedChanges(dirty:boolean){
  const [target,setTarget]=useState('');const navigate=useNavigate();
  useEffect(()=>{
    const unload=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};
    const click=(event:MouseEvent)=>{if(!dirty||event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;const link=(event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');if(!link||link.target==='_blank')return;const url=new URL(link.href);if(url.origin!==location.origin||url.href===location.href)return;event.preventDefault();event.stopImmediatePropagation();setTarget(url.pathname+url.search+url.hash)};
    const request=(event:Event)=>{if(!dirty)return;event.preventDefault();setTarget((event as CustomEvent<string>).detail)};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);window.addEventListener('finmate-before-navigate',request);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);window.removeEventListener('finmate-before-navigate',request)};
  },[dirty]);
  return target?createElement(ConfirmDialog,{title:'Rời trang với thay đổi chưa lưu?',description:'Thay đổi bạn vừa nhập sẽ bị bỏ khi chuyển trang.',onCancel:()=>setTarget(''),onConfirm:async()=>{const next=target;setTarget('');navigate(next)}}):null;
}
