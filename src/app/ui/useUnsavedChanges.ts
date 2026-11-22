import { useNavigationGuard } from './NavigationGuard';
export function useUnsavedChanges(dirty:boolean,busy=false){useNavigationGuard(()=>dirty,busy);return null;}
