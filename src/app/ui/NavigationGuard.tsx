import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../Shared';

type Guard={dirty:()=>boolean;busy:()=>boolean};
type Registry={register:(id:string,guard:Guard)=>()=>void;changed:()=>void};
const Context=createContext<Registry|null>(null);
/** One router blocker serves all page editors and stacked dialogs, including browser Back. */
export function NavigationGuardProvider({children}:{children:ReactNode}){
  const guards=useRef(new Map<string,Guard>());
  const [busy,setBusy]=useState(false);
  const changed=useCallback(()=>setBusy([...guards.current.values()].some(g=>g.busy())),[]);
  const register=useCallback((id:string,guard:Guard)=>{guards.current.set(id,guard);changed();return()=>{guards.current.delete(id);changed();};},[changed]);
  const context=useMemo(()=>({register,changed}),[register,changed]);
  const shouldBlock=useCallback(({currentLocation,nextLocation}:{currentLocation:{pathname:string};nextLocation:{pathname:string}})=>currentLocation.pathname!==nextLocation.pathname&&[...guards.current.values()].some(g=>g.dirty()||g.busy()),[]);
  const blocker=useBlocker(shouldBlock);
  useEffect(()=>{const unload=(event:BeforeUnloadEvent)=>{if([...guards.current.values()].some(g=>g.dirty()||g.busy())){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[]);
  return <Context.Provider value={context}>{children}{blocker.state==='blocked'&&<ConfirmDialog title="Rời trang với thay đổi chưa lưu?" description="Thay đổi chưa lưu sẽ bị bỏ khi rời trang. Bạn có thể ở lại để tiếp tục chỉnh sửa." busy={busy} error={busy?'Đang lưu, vui lòng đợi thao tác hoàn tất.':''} onCancel={()=>blocker.reset()} onConfirm={async()=>blocker.proceed()}/>}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components -- Provider and hook share one navigation registry.
export function useNavigationGuard(dirty:()=>boolean,busy=false){
  const registry=useContext(Context),id=useId(),latest=useRef({dirty,busy});
  useEffect(()=>{const wasBusy=latest.current.busy;latest.current={dirty,busy};if(wasBusy!==busy)registry?.changed();},[dirty,busy,registry]);
  useEffect(()=>registry?.register(id,{dirty:()=>latest.current.dirty(),busy:()=>latest.current.busy}),[registry,id]);
}
