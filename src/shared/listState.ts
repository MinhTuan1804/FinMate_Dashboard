export function unpackPage<T>(data: unknown, total?: number): { rows: T[]; total: number } {
  if (Array.isArray(data)) return { rows: data as T[], total: total ?? data.length };
  const page = data as { items?: T[]; total?: number } | null;
  const rows = page?.items ?? [];
  return { rows, total: page?.total ?? total ?? rows.length };
}
export function nonNegativeInt(value: string | null, fallback = 0): number {
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : fallback;
}
export function lastOffset(total: number, limit: number): number { return Math.max(0, Math.ceil(total / limit) - 1) * limit; }
export function updateUrlValue(current:URLSearchParams,key:string,value:string,fallback='',reset:string[]=['offset','cursor']):URLSearchParams{
  const next=new URLSearchParams(current);
  if(!value||value===fallback)next.delete(key);else next.set(key,value);
  for(const page of reset)if(page!==key)next.delete(page);
  return next;
}
