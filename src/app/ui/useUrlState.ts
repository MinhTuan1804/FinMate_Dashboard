import { updateUrlValue } from '../../shared/listState';
import { useSearchParams } from 'react-router-dom';

/** Changes retain unrelated filters and reset pagination in the same URL update. */
export function useUrlState(key: string, fallback = '', reset: string[] = ['offset', 'cursor']) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  function setValue(next: string) {
    setParams(current=>updateUrlValue(current,key,next,fallback,reset),{replace:true});
  }
  return [value, setValue] as const;
}
