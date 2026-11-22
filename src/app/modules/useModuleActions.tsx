import { useState } from 'react';
import { errorText } from '../../shared/api';
import { queryClient } from '../../shared/queryClient';
import { ConfirmDialog, PageError, SuccessNotice } from '../Shared';
import { useUrlState } from '../ui/useUrlState';
export function useModuleTab(tabs: [string,string][]) { const [tab] = useUrlState('tab', tabs[0][0]); return tabs.some(([key])=>key===tab) ? tab : tabs[0][0]; }

export function useActions(prefix: string | string[]) {
  const [pending,setPending]=useState<{title:string;description:string;run:()=>Promise<unknown>;success?:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function refresh(){const prefixes=Array.isArray(prefix)?prefix:[prefix];await queryClient.invalidateQueries({predicate:q=>prefixes.some(p=>String(q.queryKey[0]).startsWith(p))});}
  async function execute(run:()=>Promise<unknown>, success='Đã cập nhật thành công') {setError('');setNotice('');setBusy(true);try{await run();await refresh();setNotice(success);setPending(null);}catch(e){setError(errorText(e));throw e;}finally{setBusy(false);}}
  return {busy,refresh,execute,notice,error,clearError:()=>setError(''),confirm:(title:string,description:string,run:()=>Promise<unknown>,success?:string)=>{setError('');setPending({title,description,run,success});},
    feedback:<><PageError message={pending?'':error}/><SuccessNotice message={notice}/>{pending&&<ConfirmDialog title={pending.title} description={pending.description} error={error} busy={busy} onCancel={()=>setPending(null)} onConfirm={async()=>{await execute(pending.run,pending.success).catch(()=>{});}}/>}</>};
}
